import { asyncHandler } from '../utils/asyncHandler.js';
import { metadataService } from '../services/metadataService.js';

export const metadataController = {
  getAll: asyncHandler(async (_req, res) => {
    const data = await metadataService.getAll();
    res.json(data);
  }),
};
