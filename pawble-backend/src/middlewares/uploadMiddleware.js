import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import env from '../config/env.js';

const VIDEO_EXT = /\.(mp4|avi|mov|mkv|webm)$/i;

const storage = multer.diskStorage({
  destination(_req, file, cb) {
    const sub = file.fieldname === 'video' ? 'videos' : '';
    const dir = path.join(env.upload.dir, sub);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const prefix = file.fieldname === 'video' ? 'video-pet-' : 'pet-';
    cb(null, `${prefix}${Date.now()}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.fieldname === 'video' && !VIDEO_EXT.test(file.originalname)) {
    return cb(new Error('Only video files (mp4, avi, mov, mkv, webm) are accepted'));
  }
  cb(null, true);
};

export const petMediaUpload = multer({
  storage,
  limits: { fileSize: env.upload.maxBytes },
  fileFilter,
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
]);
