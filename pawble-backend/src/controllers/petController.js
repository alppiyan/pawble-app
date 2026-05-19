import { asyncHandler } from '../utils/asyncHandler.js';
import { petService } from '../services/petService.js';

export const petController = {
  listMine: asyncHandler(async (req, res) => {
    const pets = await petService.listMine(req.user.id);
    res.json(pets);
  }),

  create: asyncHandler(async (req, res) => {
    const pet = await petService.create({
      ownerId: req.user.id,
      data: req.body,
      files: req.files,
    });
    res.status(201).json(pet);
  }),

  update: asyncHandler(async (req, res) => {
    const pet = await petService.update({
      petId: req.params.petId,
      actingUserId: req.user.id,
      data: req.body,
      files: req.files,
    });
    res.json(pet);
  }),

  remove: asyncHandler(async (req, res) => {
    await petService.remove({
      petId: req.params.petId,
      actingUserId: req.user.id,
    });
    res.status(204).end();
  }),

  stats: asyncHandler(async (req, res) => {
    const stats = await petService.getStats({
      petId: req.params.petId,
      actingUserId: req.user.id,
    });
    res.json(stats);
  }),

  adopt: asyncHandler(async (req, res) => {
    const pet = await petService.adoptOut({
      actingUserId: req.user.id,
      petId: req.body.petId,
      newOwnerId: req.body.newOwnerId,
    });
    res.json({ pet });
  }),
};
