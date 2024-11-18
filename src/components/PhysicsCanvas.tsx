import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Eraser, Pen, Pin, ChevronLeft, ChevronRight, RefreshCw, Hand, Circle } from 'lucide-react';

const TOTAL_LEVELS = 2; // 총 스테이지 수를 정의합니다.

// 맵이 변할 때 마다 실행됨.
const PhysicsCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(Matter.Engine.create({
    gravity: { x: 0, y: 1, scale: 0.001 },
  }));
  const renderRef = useRef<Matter.Render>();
  const [tool, setTool] = useState<'pen' | 'eraser' | 'pin' | 'push'>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<Matter.Vector[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [resetTrigger, setResetTrigger] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const initialBallPositionRef = useRef({ x: 0, y: 0 }); // 공 초기 위치 저장
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
        // hasBounds: true,
        // showCollisions: true,
        wireframes: false,
        background: '#f8f4e3',
      },
    });
    renderRef.current = render;

    engineRef.current.world.gravity.y = 0.1;

    const world = engineRef.current.world;
    
    // 월드 초기화
    Matter.World.clear(world, false);

    // 레벨에 따른 설정
    if (currentLevel === 1) {
      // 레벨 1 기본 설정
      const wallOptions = {
        isStatic: true,
        label: 'wall',
        friction: 1,
        frictionStatic: 1,
        restitution: 0.2,
      };
  
      const walls = [
        Matter.Bodies.rectangle(400, 610, 810, 20, { isStatic: true, label: 'wall_bottom' }),
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
        restitution: 0.3, // 반발 계수: 공이 튀어오르는 정도
        friction: 0.05, // 마찰력
        frictionAir: 0.01 // 공중에서의 저항
      });
      ballRef.current = ball;  // ballRef에 공을 할당하여 참조하도록 합니다
      initialBallPositionRef.current = { x: 200, y: 300 }
      
      const star = Matter.Bodies.trapezoid(600, 290, 20, 20, 1, {
        render: { fillStyle: '#fbbf24' },
        label: 'balloon',
        isStatic: true,
      });
  
      // Add static bodies to represent the castle structure
      // const ground = Matter.Bodies.rectangle(400, 590, 810, 60, { isStatic: true, label: 'ground'});
      const tower1 = Matter.Bodies.rectangle(200, 400, 50, 200, { isStatic: true, label: 'tower1'});
      const tower2 = Matter.Bodies.rectangle(300, 400, 50, 200, { isStatic: true, label: 'tower2'});
      const tower3 = Matter.Bodies.rectangle(400, 400, 50, 200, { isStatic: true, label: 'tower3' });
      const tower4 = Matter.Bodies.rectangle(500, 400, 50, 200, { isStatic: true, label: 'tower4' });
      const tower5 = Matter.Bodies.rectangle(600, 400, 50, 200, { isStatic: true, label: 'tower5' });
  
      // Matter.World.add(world, [ground, tower1, tower2, tower3, tower4, tower5, ...walls, ball, star]);
      Matter.World.add(world, [tower1, tower2, tower3, tower4, tower5, ...walls, ball, star]);
    } else if (currentLevel === 2) {
      // 레벨 2 설정 - 두 번째 사진 기반
      const walls = [
        Matter.Bodies.rectangle(400, 610, 810, 20, { isStatic: true, label: 'wall_bottom' }),
        Matter.Bodies.rectangle(400, -10, 810, 20, { isStatic: true, label: 'wall' }),
        Matter.Bodies.rectangle(-10, 300, 20, 620, { isStatic: true, label: 'wall' }),
        Matter.Bodies.rectangle(810, 300, 20, 620, { isStatic: true, label: 'wall' }),
      ];
  
      // 공 (ball)과 별 (balloon) 위치 설정
      const ball = Matter.Bodies.circle(400, 400, 15, {
        render: { fillStyle: '#ef4444' },
        label: 'ball',
        restitution: 0.3,
        friction: 0.05,
        frictionAir: 0.01,
      });
      initialBallPositionRef.current = { x: 400, y: 400 }

      const star = Matter.Bodies.trapezoid(600, 550, 20, 20, 1, {
        render: { fillStyle: '#fbbf24' },
        label: 'balloon',
        isStatic: true,
      });
  
      // 맵 내 정적 객체 생성
      const base = Matter.Bodies.rectangle(400, 580, 100, 20, { isStatic: true, label: 'base' });
      const pedestal = Matter.Bodies.rectangle(400, 500, 50, 100, { isStatic: true, label: 'pedestal' });
  
      Matter.World.add(world, [ball, star, base, pedestal, ...walls]);
      ballRef.current = ball;
    }

    Matter.Events.on(engineRef.current, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        if (
          (pair.bodyA.label === 'ball' && pair.bodyB.label === 'balloon') ||
          (pair.bodyA.label === 'balloon' && pair.bodyB.label === 'ball')
        ) {
          setGameEnded(true);
        }
      });
    });

    // 공이 wall_bottom 아래로 떨어졌는지 확인
    Matter.Events.on(engineRef.current, 'afterUpdate', () => {
      const threshold = 40; // 공 및 사물 삭제 기준 높이
      const world = engineRef.current.world;

      // wall_bottom을 초기화 시점에 찾음
      const wallBottom = Matter.Composite.allBodies(world).find((body) => body.label === 'wall_bottom');
      if (!wallBottom) {
        console.error('Wall bottom not found!');
        return;
      }
      const bodies = Matter.Composite.allBodies(world);

      if (ballRef.current) {
        const ball = ballRef.current;
        const wallBottom = Matter.Composite.allBodies(world).find(
          (body) => body.label === 'wall_bottom'
        );
    
        if (!wallBottom) {
          console.error('Wall bottom not found!');
          return;
        }
    
        // console.log(`Ball Y: ${ball.position.y}, Wall Bottom Max Y: ${wallBottom.bounds.max.y}`);
        // console.log(`Ball X: ${ball.position.x}, Ball Y: ${ball.position.y}`);
        // const threshold = 40;
        // console.log("currentLevel: ", currentLevel)
        if (ball.position.y > wallBottom.bounds.max.y - threshold) {
          // console.log('Ball fell below the wall. Resetting position.');
          // 초기 위치로 이동
          Matter.Body.setPosition(ball, initialBallPositionRef.current);
        }
      }

      // 사용자 사물이 화면 아래로 떨어지면 서서히 삭제
      bodies.forEach((body) => {
        const wallBottom = bodies.find((b) => b.label === 'wall_bottom');
        if (!wallBottom) return;

        // 충돌한 사물의 `opacity` 감소
        if (!staticObjects.includes(body.label) && !body.isStatic) {
          const isTouchingFloor = Matter.SAT.collides(body, wallBottom)?.collided;

          if (isTouchingFloor) {
            body.render.opacity = body.render.opacity ?? 1; // 초기값 설정
            body.render.opacity -= 0.01; // 점진적으로 투명도 감소

            if (body.render.opacity <= 0) {
              Matter.World.remove(world, body); // 완전히 투명해지면 제거
            }
          }
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
  }, [currentLevel, resetTrigger]);

  

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
          isStatic: false, // 사물이 떨어지도록 설정
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
        isStatic: false, // 사물이 떨어지도록 설정
        friction: 0.8,
        frictionStatic: 1,
        restitution: 0.2,
        density: 0.005, // 밀도를 낮추어 떨어지는 속도를 줄임
        frictionAir: 0.02, // 공중 저항을 높임
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

    if (tool === 'push' && ballRef.current) { 
      const ball = ballRef.current;
      const ballX = ball.position.x;

      // 공의 중심에서 클릭한 위치까지의 거리 계산
      const clickOffsetX = point.x - ballX;

      // 클릭한 위치가 공의 왼쪽인지 오른쪽인지 판단
      if (clickOffsetX < 0) {
        // 왼쪽을 클릭하면 오른쪽으로 힘을 가함
        Matter.Body.applyForce(ball, ball.position, { x: 0.008, y: 0 });
      } else {
        // 오른쪽을 클릭하면 왼쪽으로 힘을 가함
        Matter.Body.applyForce(ball, ball.position, { x: -0.008, y: 0 });
      }
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

  const handleToolChange = (newTool: 'pen' | 'eraser' | 'pin' | 'push') => {
    setTool(newTool);
    setIsDrawing(false);
    setDrawPoints([]);
  };

  // const handleLevelChange = (direction: 'prev' | 'next') => {
  //   setCurrentLevel(prev => direction === 'next' ? prev + 1 : Math.max(1, prev - 1));
  // };
  const handleLevelChange = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (currentLevel < TOTAL_LEVELS) {
        setCurrentLevel(prev => prev + 1);
        setGameEnded(false); // 게임 종료 상태 초기화
      } else {
        // showTemporaryMessage("실험이 마지막 스테이지입니다");
      }
    } else {
      if (currentLevel > 1) {
        setCurrentLevel(prev => prev - 1);
      } else {
        // showTemporaryMessage("첫 스테이지입니다");
      }
    }
  };

  const handleNextLevel = () => {
    if (currentLevel < TOTAL_LEVELS) {
      setCurrentLevel((prevLevel) => prevLevel + 1)
      setGameEnded(false); // 게임 종료 상태 초기화
    } else {
      setCurrentLevel((prevLevel) => prevLevel)
      setGameEnded(false); // 게임 종료 상태 초기화
    }
  }

  const resetLevel = () => {
    setResetTrigger((prev) => !prev);

    // 월드와 렌더를 정지하고 지운 후, 다시 설정
    const world = engineRef.current.world;
    Matter.World.clear(world, false);
    Matter.Engine.clear(engineRef.current);
  
    // 맵 초기화 - 렌더도 초기화하여 재설정
    if (renderRef.current) {
      Matter.Render.stop(renderRef.current);
      Matter.Render.run(renderRef.current);
    }
    
    // 현재 레벨에 대한 설정을 다시 불러옴
    setCurrentLevel(currentLevel); // 이로 인해 useEffect가 실행됨
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => resetLevel()}
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
        {/* 밀기 도구 버튼 */}
        <button
          onClick={() => handleToolChange('push')}
          className={`p-2 rounded relative ${tool === 'push' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* 공을 뒤에 배치 */}
          <Circle size={20} style={{ position: 'absolute', left: '6px', zIndex: 1 }} />
          {/* 손이 약간 겹치도록 배치 */}
          <Hand size={22} style={{ position: 'relative', left: '8px', zIndex: 2, transform: 'rotate(-20deg)' }} />
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
                onClick={() => handleNextLevel()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {currentLevel < TOTAL_LEVELS ? 'Next Level' : 'Okay'}
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
          disabled={currentLevel === TOTAL_LEVELS}
          className="p-2 rounded bg-gray-200 disabled:opacity-50"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default PhysicsCanvas;