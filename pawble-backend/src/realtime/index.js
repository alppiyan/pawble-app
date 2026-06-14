import { Server } from 'socket.io';
import env from '../config/env.js';
import { socketAuth } from './socketAuth.js';
import { registerChatGateway } from './chatGateway.js';

export function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((s) => s.trim()),
    },
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.user.id}`);
    registerChatGateway(io, socket);
  });

  return io;
}
