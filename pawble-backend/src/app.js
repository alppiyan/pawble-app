import express from 'express';
import cors from 'cors';
import path from 'node:path';
import env from './config/env.js';
import apiRoutes from './routes/index.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorMiddleware, notFound } from './middlewares/errorMiddleware.js';

const app = express();

app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((s) => s.trim()),
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.use('/uploads', express.static(path.resolve(env.upload.dir)));

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorMiddleware);

export default app;
