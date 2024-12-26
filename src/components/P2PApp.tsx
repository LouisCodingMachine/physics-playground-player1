import React, { useEffect, useRef, useState } from 'react';

interface P2PAppProps {
  onConnected: (role: 'player1' | 'player2') => void;
}

const P2PApp: React.FC<P2PAppProps> = ({ onConnected }) => {
  const [role, setRole] = useState<'player1' | 'player2' | null>(null);
  const [connected, setConnected] = useState(false);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);

  useEffect(() => {
    const pc = new RTCPeerConnection();
    peerConnection.current = pc;

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onopen = () => {
        setConnected(true);
        onConnected(role!); // 연결 상태 전달
      };
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE Candidate:', event.candidate);
      }
    };

    // 시뮬레이션: 플레이어 역할 배정
    const assignedRole = Math.random() > 0.5 ? 'player1' : 'player2';
    setRole(assignedRole);

    return () => {
      pc.close();
    };
  }, []);

  return (
    <div>
      <h1>P2P Connection</h1>
      {!connected ? (
        <p>Connecting as {role || '...'}</p>
      ) : (
        <p>Connected as {role}</p>
      )}
    </div>
  );
};

export default P2PApp;