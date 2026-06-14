import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { getSocket, connectSocket, disconnectSocket } from '../realtime/socket.js';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(getSocket());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setConnected(false);
      return;
    }

    const socket = connectSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
