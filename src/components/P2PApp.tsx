import React, { useState, useRef, useEffect } from 'react';

interface P2PAppProps {
  onConnected: (role: 'player1' | 'player2') => void;
}

const P2PApp: React.FC<P2PAppProps> = ({ onConnected }) => {
  const [offer, setOffer] = useState('');
  const [remoteOffer, setRemoteOffer] = useState('');
  const [answer, setAnswer] = useState('');
  const [remoteAnswer, setRemoteAnswer] = useState('');
  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState<'player1' | 'player2' | null>(null);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  
  const handleOfferExchange = async () => {
    const pc = peerConnection.current!;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
  
      setOffer(JSON.stringify(offer));
      setWaitingForAnswer(true); // Answer 대기 시작
    } catch (error) {
      console.error('Error during offer exchange:', error);
    }
  };

  useEffect(() => {
    const pc = new RTCPeerConnection();
    peerConnection.current = pc;

    // Handling data channel
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onmessage = (e) => console.log('Received message:', e.data);
      channel.onopen = () => {
        console.log('Data channel opened');
        setConnected(true);
        onConnected(role!); // Notify parent component about connection and role
      };
      channel.onclose = () => setConnected(false);
    };

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE Candidate:', event.candidate);
      }
    };

    // Simulate role assignment
    const assignedRole = Math.random() > 0.5 ? 'player1' : 'player2';
    setRole(assignedRole);

    return () => {
      pc.close();
    };
  }, [onConnected, role]);

  const createOffer = async () => {
    const pc = peerConnection.current!;
    dataChannel.current = pc.createDataChannel('chat');
    dataChannel.current.onmessage = (e) => console.log('Message:', e.data);
    dataChannel.current.onopen = () => {
      console.log('Data channel opened');
      setConnected(true);
      onConnected(role!); // Notify parent component about connection and role
    };

    const offerDesc = await pc.createOffer();
    await pc.setLocalDescription(offerDesc);
    setOffer(JSON.stringify(offerDesc));
  };

  const handleRemoteOffer = async () => {
    const pc = peerConnection.current!;
    if (!remoteOffer) {
      alert('Please paste the received offer before proceeding.');
      return;
    }
  
    try {
      const offerDesc = JSON.parse(remoteOffer);
      await pc.setRemoteDescription(offerDesc);
  
      console.log('Remote Offer set successfully.');
  
      // Answer 생성 및 설정
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
  
      console.log('Local Answer created and set:', JSON.stringify(answer));
  
      // Answer를 상대방에게 전달
      setAnswer(JSON.stringify(answer));
    } catch (error) {
      console.error('Error handling remote offer:', error);
    }
  };

  const handleRemoteAnswer = async () => {
    const pc = peerConnection.current!;
    if (!remoteAnswer) {
      alert('Please paste the received answer before proceeding.');
      return;
    }
  
    try {
      const answerDesc = JSON.parse(remoteAnswer);
  
      // Remote Answer 설정
      await pc.setRemoteDescription(answerDesc);
  
      console.log('Remote Answer set successfully. Connection established!');
    } catch (error) {
      console.error('Error handling remote answer:', error);
    }
  };

  const sendMessage = (message: string) => {
    if (dataChannel.current?.readyState === 'open') {
      dataChannel.current.send(message);
    }
  };

  return (
    <div>
      <h1>P2P Communication</h1>
      {!connected ? (
        <div>
          <p>Connecting as {role || '...'}</p>
          <button onClick={createOffer}>Create Offer</button>
          {offer && (
            <>
              <textarea
                value={offer}
                readOnly
                placeholder="Generated Offer"
                rows={5}
                cols={50}
              />
              <p>Share this Offer with the remote peer.</p>
            </>
          )}
          <textarea
            value={remoteOffer}
            onChange={(e) => setRemoteOffer(e.target.value)}
            placeholder="Paste received Offer"
            rows={5}
            cols={50}
          />
          <button onClick={handleRemoteOffer}>Respond with Answer</button>
          {answer && (
            <>
              <textarea
                value={answer}
                readOnly
                placeholder="Generated Answer"
                rows={5}
                cols={50}
              />
              <p>Share this Answer with the remote peer.</p>
            </>
          )}
          {waitingForAnswer && <p>Waiting for remote answer...</p>}
          <textarea
            value={remoteAnswer}
            onChange={(e) => setRemoteAnswer(e.target.value)}
            placeholder="Paste received Answer"
            rows={5}
            cols={50}
          />
          <button onClick={handleRemoteAnswer}>Set Remote Answer</button>
        </div>
      ) : (
        <div>
          <h2>Connected as {role}</h2>
          <input
            type="text"
            placeholder="Type a message"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                sendMessage(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default P2PApp;
