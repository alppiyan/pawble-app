import { Router } from 'express';
import authRoutes from './authRoutes.js';
import petRoutes from './petRoutes.js';
import matchRoutes from './matchRoutes.js';
import chatRoutes from './chatRoutes.js';
import adminRoutes from './adminRoutes.js';
import metadataRoutes from './metadataRoutes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));

router.use('/auth', authRoutes);
router.use('/pets', petRoutes);
router.use('/metadata', metadataRoutes);
router.use('/admin', adminRoutes);
router.use('/', matchRoutes);
router.use('/', chatRoutes);

export default router;
