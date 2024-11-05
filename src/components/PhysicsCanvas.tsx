import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Eraser, Pen, Pin, ChevronLeft, ChevronRight } from 'lucide-react';

const PhysicsCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(Matter.Engine.create({
    gravity: { x: 0, y: 1, scale: 0.001 }, // Reduced gravity for better control
  }));
  const renderRef = useRef<Matter.Render>();
  const [tool, setTool] = useState<'pen' | 'eraser' | 'pin'>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<Matter.Vector[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameEnded, setGameEnded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const render = Matter.Render.create({
      canvas: canvasRef.current,
      engine: engineRef.current,
      options: {
        width: 800,
        height: 600,
        wireframes: false,
        background: '#f0f9ff',
      },
    });
    renderRef.current = render;

    const world = engineRef.current.world;

    // Walls with high friction
    const wallOptions = {
      isStatic: true,
      label: 'wall',
      friction: 1,
      frictionStatic: 1,
      restitution: 0.2,
    };

    const walls = [
      Matter.Bodies.rectangle(400, 610, 810, 20, wallOptions), // bottom
      Matter.Bodies.rectangle(400, -10, 810, 20, wallOptions), // top
      Matter.Bodies.rectangle(-10, 300, 20, 620, wallOptions), // left
      Matter.Bodies.rectangle(810, 300, 20, 620, wallOptions), // right
    ];

    walls.forEach(wall => {
      Matter.Body.setStatic(wall, true);
      wall.render.fillStyle = '#94a3b8';
    });

    // Red ball (player) with improved physics properties
    const ball = Matter.Bodies.circle(50, 300, 15, {
      render: { fillStyle: '#ef4444' },
      label: 'player',
      friction: 0.5,
      frictionStatic: 0.7,
      restitution: 0.5,
      density: 0.01,
    });

    // Yellow balloon (target)
    const balloon = Matter.Bodies.circle(700, 300, 20, {
      render: { fillStyle: '#fbbf24' },
      label: 'balloon',
      isStatic: true,
    });

    Matter.World.add(world, [...walls, ball, balloon]);

    Matter.Events.on(engineRef.current, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        if (
          (pair.bodyA.label === 'player' && pair.bodyB.label === 'balloon') ||
          (pair.bodyA.label === 'balloon' && pair.bodyB.label === 'player')
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

    // Simplify the path to reduce physics complexity
    const simplified = points.filter((point, index) => {
      if (index === 0 || index === points.length - 1) return true;
      const prev = points[index - 1];
      const dist = Math.hypot(point.x - prev.x, point.y - prev.y);
      return dist > 10; // Only keep points that are more than 10px apart
    });

    // Create a closed shape by connecting the points
    const vertices = [...simplified];
    if (vertices.length >= 3) {
      const bodyOptions = {
        render: {
          fillStyle: '#3b82f6',
          strokeStyle: '#1d4ed8',
          lineWidth: 1,
        },
        friction: 0.8, // High friction to prevent sliding
        frictionStatic: 1, // High static friction
        restitution: 0.2, // Low bounciness
        density: 0.01, // Lower density for better stacking
      };

      return Matter.Bodies.fromVertices(
        vertices[0].x,
        vertices[0].y,
        [vertices],
        bodyOptions
      );
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (tool === 'eraser') {
      const bodies = Matter.Composite.allBodies(engineRef.current.world);
      const mousePosition = { x: point.x, y: point.y };
      
      for (let body of bodies) {
        if (Matter.Bounds.contains(body.bounds, mousePosition) &&
            body.label !== 'wall' &&
            body.label !== 'player' &&
            body.label !== 'balloon') {
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
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // Only add point if it's far enough from the last point
    const lastPoint = drawPoints[drawPoints.length - 1];
    const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
    if (dist > 5) { // Minimum distance between points
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