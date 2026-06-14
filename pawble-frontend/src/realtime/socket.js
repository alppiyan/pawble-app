import { io } from 'socket.io-client';
import { tokenStore } from '../api/client.js';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({
      autoConnect: false,
      auth: (cb) => cb({ token: tokenStore.get() }),
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
}
