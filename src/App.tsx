import React, { useState } from 'react';
import PhysicsCanvas from './components/PhysicsCanvas';
import VideoChat from './components/VideoChat';
import P2PApp from './components/P2PApp';

function App() {
  const [isConnected, setIsConnected] = useState(false); // 연결 상태 관리
  const [playerRole, setPlayerRole] = useState<'player1' | 'player2' | null>(null); // 플레이어 역할 관리

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      {!isConnected ? (
        <P2PApp onConnected={(role) => { setIsConnected(true); setPlayerRole(role); }} />
      ) : (
        <PhysicsCanvas playerRole={playerRole} />
      )}
    </div>
  );
}

export default App;