import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';

const VideoChat: React.FC = () => {
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer>();
  const streamRef = useRef<MediaStream>();

  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('call', async (call) => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      call.answer(stream);
      call.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });
    });

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      peer.destroy();
    };
  }, []);

  const connectToPeer = async () => {
    if (!peerRef.current || !remotePeerId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const call = peerRef.current.call(remotePeerId, stream);
      call.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });
    } catch (err) {
      console.error('Failed to get media stream:', err);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg w-64">
      <div className="space-y-4">
        <div className="relative">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-32 bg-gray-200 rounded-lg object-cover"
          />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <button
              onClick={toggleVideo}
              className={`p-1.5 rounded-full ${isVideoEnabled ? 'bg-blue-500' : 'bg-red-500'} text-white`}
            >
              {isVideoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
            </button>
            <button
              onClick={toggleAudio}
              className={`p-1.5 rounded-full ${isAudioEnabled ? 'bg-blue-500' : 'bg-red-500'} text-white`}
            >
              {isAudioEnabled ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
          </div>
        </div>

        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-32 bg-gray-200 rounded-lg object-cover"
        />

        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            Your ID: {peerId || 'Connecting...'}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={remotePeerId}
              onChange={(e) => setRemotePeerId(e.target.value)}
              placeholder="Enter peer ID"
              className="flex-1 px-2 py-1 text-sm border rounded"
            />
            <button
              onClick={connectToPeer}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoChat;