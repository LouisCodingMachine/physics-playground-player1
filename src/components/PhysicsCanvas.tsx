import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Eraser, Pen, Pin, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
// 맵이 변할 때 마다 실행됨.
const PhysicsCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(Matter.Engine.create({
    gravity: { x: 0, y: 1, scale: 0.001 },
  }));
  const renderRef = useRef<Matter.Render>();
  const [tool, setTool] = useState<'pen' | 'eraser' | 'pin'>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<Matter.Vector[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameEnded, setGameEnded] = useState(false);
  const mapObjects = ['ground', 'tower1', 'tower2', 'tower3', 'tower4', 'tower5'];
  const staticObjects = ['wall', 'ball', 'balloon'].concat(mapObjects);

  const ballRef = useRef<Matter.Body | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const render = Matter.Render.create({
      canvas: canvasRef.current,
      engine: engineRef.current,
      options: {
        width: 800,
        height: 600,
        hasBounds: true,
        showCollisions: true,
        wireframes: false,
        background: '#f8f4e3',
      },
    });
    renderRef.current = render;

    engineRef.current.world.gravity.y = 0.1;

    const world = engineRef.current.world;

    const wallOptions = {
      isStatic: true,
      label: 'wall',
      friction: 1,
      frictionStatic: 1,
      restitution: 0.2,
    };

    const walls = [
      Matter.Bodies.rectangle(400, 610, 810, 20, wallOptions),
      Matter.Bodies.rectangle(400, -10, 810, 20, wallOptions),
      Matter.Bodies.rectangle(-10, 300, 20, 620, wallOptions),
      Matter.Bodies.rectangle(810, 300, 20, 620, wallOptions),
    ];

    walls.forEach(wall => {
      Matter.Body.setStatic(wall, true);
      wall.render.fillStyle = '#94a3b8';
    });

    const ball = Matter.Bodies.circle(200, 300, 15, {
      render: { fillStyle: '#ef4444' },
      label: 'ball',
      restitution: 0.6,
      friction: 0.0005,
    });
    ballRef.current = ball;  // ballRef에 공을 할당하여 참조하도록 합니다
    
    const star = Matter.Bodies.trapezoid(600, 290, 20, 20, 1, {
      render: { fillStyle: '#fbbf24' },
      label: 'star',
      isStatic: true,
    });

    // Add static bodies to represent the castle structure
    const ground = Matter.Bodies.rectangle(400, 590, 810, 60, { isStatic: true, label: 'ground'});
    const tower1 = Matter.Bodies.rectangle(200, 400, 50, 200, { isStatic: true, label: 'tower1'});
    const tower2 = Matter.Bodies.rectangle(300, 400, 50, 200, { isStatic: true, label: 'tower2'});
    const tower3 = Matter.Bodies.rectangle(400, 400, 50, 200, { isStatic: true, label: 'tower3' });
    const tower4 = Matter.Bodies.rectangle(500, 400, 50, 200, { isStatic: true, label: 'tower4' });
    const tower5 = Matter.Bodies.rectangle(600, 400, 50, 200, { isStatic: true, label: 'tower5' });

    Matter.World.add(world, [ground, tower1, tower2, tower3, tower4, tower5, ...walls, ball, star]);

    Matter.Events.on(engineRef.current, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        if (
          (pair.bodyA.label === 'ball' && pair.bodyB.label === 'star') ||
          (pair.bodyA.label === 'star' && pair.bodyB.label === 'ball')
        ) {
          setGameEnded(true);
        }
      });
    });

    Matter.Runner.run(engineRef.current);
    Matter.Render.run(render);

    return () => {
      Matter.Render.stop(render);
      Matter.World.clear(world, false);
      Matter.Engine.clear(engineRef.current);
    };
  }, [currentLevel]);

  const createPhysicsBody = (points: Matter.Vector[]) => {
    if (points.length < 2) return null;
    console.log("object generated");
  
    // Simplify the path to reduce physics complexity
    const simplified = points.filter((point, index) => {
      if (index === 0 || index === points.length - 1) return true;
      const prev = points[index - 1];
      const dist = Math.hypot(point.x - prev.x, point.y - prev.y);
      return dist > 2;
    });
  
    // Check if points are in a nearly straight line by comparing distances
    if (simplified.length === 2) {
      const [start, end] = simplified;
      const distance = Math.hypot(end.x - start.x, end.y - start.y);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
  
      // Create a thin rectangle to represent the line
      return Matter.Bodies.rectangle(
        (start.x + end.x) / 2, // Center X
        (start.y + end.y) / 2, // Center Y
        distance, // Width of the line (distance between points)
        2, // Very small height to simulate a line
        {
          angle,
          render: {
            fillStyle: '#3b82f6',
            strokeStyle: '#1d4ed8',
            lineWidth: 1,
          },
          friction: 0.8,
          frictionStatic: 1,
          restitution: 0.2,
          density: 0.01,
        }
      );
    }
  
    // For shapes with more points, create a closed polygonal body
    const vertices = [...simplified];
    if (vertices.length >= 3) {
      const bodyOptions = {
        render: {
          fillStyle: '#3b82f6',
          strokeStyle: '#1d4ed8',
          lineWidth: 1,
        },
        friction: 0.8,
        frictionStatic: 1,
        restitution: 0.2,
        density: 0.01,
      };
  
      // Use the center of mass as the initial position
      const centroidX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
      const centroidY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
  
      const translatedVertices = vertices.map(v => ({
        x: v.x - centroidX,
        y: v.y - centroidY,
      }));
  
      const body = Matter.Bodies.fromVertices(centroidX, centroidY, [translatedVertices], bodyOptions);
      return body;
    }
  
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    // console.log("rect.left: ", rect.left)
    // console.log("rect.right: ", rect.right)
    // console.log("rect.top: ", rect.top)
    // console.log("rect.bottom: ", rect.bottom)
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (tool === 'eraser') {
      const bodies = Matter.Composite.allBodies(engineRef.current.world);
      const mousePosition = { x: point.x, y: point.y };
      
      for (let body of bodies) {
        if (Matter.Bounds.contains(body.bounds, mousePosition) &&
            !staticObjects.includes(body.label)) {
          Matter.World.remove(engineRef.current.world, body);
          break;
        }
      }
      return;
    }

    setIsDrawing(true);
    setDrawPoints([point]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || tool === 'eraser') return;
  
    const rect = canvasRef.current.getBoundingClientRect();
    let point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    // console.log("point.y: ", point.y)
    // console.log("rect.left: ", rect.left)
    // console.log("rect.right: ", rect.right)
    // console.log("rect.top: ", rect.top)
    // console.log("rect.bottom: ", rect.bottom)
  
    // // 캔버스 경계 안에 point를 제한
    // point = {
    //   x: Math.max(0, Math.min(point.x, 802)), 
    //   y: Math.max(0, Math.min(point.y, 602)), 
    // };

    // 캔버스 경계 안에 point를 제한
    point = {
      x: Math.max(0, Math.min(point.x, rect.width)), 
      y: Math.max(0, Math.min(point.y, rect.height)), 
    };
  
    // 벽과의 충돌 감지
    const bodies = Matter.Query.point(Matter.Composite.allBodies(engineRef.current.world), point);
    const collidedWall = bodies.find(body => body.label === 'wall');
    // console.log("collidedWall: ", collidedWall)
  
    if (collidedWall) {
      // 충돌한 벽의 경계 찾기
      const bounds = collidedWall.bounds;
  
      // 벽의 각 변과 점 사이의 거리 계산
      const distances = [
        Math.abs(point.x - bounds.min.x), // 왼쪽 변
        Math.abs(point.x - bounds.max.x), // 오른쪽 변
        Math.abs(point.y - bounds.min.y), // 위쪽 변
        Math.abs(point.y - bounds.max.y), // 아래쪽 변
      ];
  
      // 가장 가까운 변 찾기
      const minDistance = Math.min(...distances);
      // console.log("minDistance: ", minDistance)
      const threshold = 5; // 벽과의 거리 임계값
  
      if (minDistance < threshold) {
      if (distances[0] === minDistance) point.x = bounds.min.x; // 왼쪽 변
      else if (distances[1] === minDistance) point.x = bounds.max.x; // 오른쪽 변
      else if (distances[2] === minDistance) point.y = bounds.min.y; // 위쪽 변
      else if (distances[3] === minDistance) point.y = bounds.max.y; // 아래쪽 변
      }
    }
  
    const lastPoint = drawPoints[drawPoints.length - 1];
    // console.log("lastPoint: ", lastPoint)
    const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
  
    if (dist > 5) {
      setDrawPoints(prev => [...prev, point]);
    }
  };
  
  const handleMouseUp = () => {
    if (tool === 'eraser' || drawPoints.length < 2) {
      setIsDrawing(false);
      setDrawPoints([]);
      return;
    }
  
    if (tool === 'pen') {
      const body = createPhysicsBody(drawPoints);
      if (body) {
        Matter.World.add(engineRef.current.world, body);
      }
    }
  
    setIsDrawing(false);
    setDrawPoints([]);
  };

  const handleToolChange = (newTool: 'pen' | 'eraser' | 'pin') => {
    setTool(newTool);
    setIsDrawing(false);
    setDrawPoints([]);
  };

  const handleLevelChange = (direction: 'prev' | 'next') => {
    setCurrentLevel(prev => direction === 'next' ? prev + 1 : Math.max(1, prev - 1));
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => window.location.reload()}
          className={`p-2 rounded 'bg-gray-200'`}
        >
          <RefreshCw size={24} />
        </button>
        <button
          onClick={() => handleToolChange('pen')}
          className={`p-2 rounded ${
            tool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          <Pen size={24} />
        </button>
        <button
          onClick={() => handleToolChange('eraser')}
          className={`p-2 rounded ${
            tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          <Eraser size={24} />
        </button>
        <button
          onClick={() => handleToolChange('pin')}
          className={`p-2 rounded ${
            tool === 'pin' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          <Pin size={24} />
        </button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="border border-gray-300 rounded-lg shadow-lg"
          style={{ cursor: tool === 'eraser' ? 'crosshair' : 'default' }}
        />
        
        {isDrawing && tool === 'pen' && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
            }}
            width={800}
            height={600}
          >
            <path
              d={`M ${drawPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="4"
            />
          </svg>
        )}

        {gameEnded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-8 rounded-lg shadow-xl">
              <h2 className="text-3xl font-bold text-center mb-4">End of Game!</h2>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => handleLevelChange('prev')}
          disabled={currentLevel === 1}
          className="p-2 rounded bg-gray-200 disabled:opacity-50"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="py-2 px-4 bg-gray-100 rounded">Level {currentLevel}</span>
        <button
          onClick={() => handleLevelChange('next')}
          className="p-2 rounded bg-gray-200"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default PhysicsCanvas;