import { io } from 'socket.io-client';
import { tokenStore } from './client.js';

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
  if (socket?.connected) socket.disconnect();
}

export function sendChatMessage({ receiverId, content }) {
  return new Promise((resolve, reject) => {
    const s = connectSocket();
    s.timeout(5000).emit(
      'message:send',
      { receiverId: Number(receiverId), content },
      (err, ack) => {
        if (err) return reject(err);
        if (!ack?.ok) return reject(new Error(ack?.error || 'SEND_FAILED'));
        resolve(ack.message);
      },
    );
  });
}
