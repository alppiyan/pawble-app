import http from 'node:http';
import app from './src/app.js';
import env from './src/config/env.js';
import { attachRealtime } from './src/realtime/index.js';

const server = http.createServer(app);
attachRealtime(server);

server.listen(env.port, '0.0.0.0', () => {
  console.log(`Pawble API+WS listening on :${env.port} (${env.nodeEnv})`);
});
