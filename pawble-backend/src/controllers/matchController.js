import { asyncHandler } from '../utils/asyncHandler.js';
import { matchService } from '../services/matchService.js';

export const matchController = {
  candidates: asyncHandler(async (req, res) => {
    const candidates = await matchService.getCandidates({
      actingUserId: req.user.id,
      mode: req.query.mode,
      myPetId: req.query.myPetId || null,
      filters: {
        species: req.query.species || null,
        gender: req.query.gender || null,
        ageMin: req.query.ageMin ?? null,
        ageMax: req.query.ageMax ?? null,
        shelterOnly: !!req.query.shelterOnly,
      },
    });
    res.json(candidates);
  }),

  swipe: asyncHandler(async (req, res) => {
    const result = await matchService.recordSwipe({
      actingUserId: req.user.id,
      likerPetId: req.body.likerPetId,
      likedPetId: req.body.likedPetId,
      action: req.body.action,
    });
    res.json(result);
  }),

  history: asyncHandler(async (req, res) => {
    const items = await matchService.getHistory({
      actingUserId: req.user.id,
      myPetId: req.query.myPetId,
      type: req.query.type,
    });
    res.json(items);
  }),
};
