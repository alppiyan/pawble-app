import http from 'node:http';
import app from './src/app.js';
import env from './src/config/env.js';
import { attachChatSocket } from './src/ws/chatSocket.js';

const httpServer = http.createServer(app);
attachChatSocket(httpServer);

httpServer.listen(env.port, '0.0.0.0', () => {
  console.log(`Pawble API listening on :${env.port} (${env.nodeEnv})`);
});
