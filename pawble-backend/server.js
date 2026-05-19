import app from './src/app.js';
import env from './src/config/env.js';

app.listen(env.port, '0.0.0.0', () => {
  console.log(`Pawble API listening on :${env.port} (${env.nodeEnv})`);
});
