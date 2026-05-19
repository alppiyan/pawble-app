import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { petRepository } from '../repositories/petRepository.js';
import { AppError } from '../utils/AppError.js';
import env from '../config/env.js';

const toPublicPath = (file, subdir = '') => {
  if (!file) return null;
  const base = subdir ? `/uploads/${subdir}/` : '/uploads/';
  return `${base}${file.filename}`;
};

const deletePhysicalFile = async (publicPath) => {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const relative = publicPath.replace(/^\/uploads\//, '');
  const absolute = path.join(env.upload.dir, relative);
  try {
    await unlink(absolute);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Failed to delete file', absolute, err.message);
  }
};

const assertOwner = (pet, actingUserId) => {
  if (!pet) throw new AppError('Pet not found', 404, 'PET_NOT_FOUND');
  if (pet.ownerId !== actingUserId) {
    throw new AppError('Not the owner of this pet', 403, 'FORBIDDEN');
  }
};

export const petService = {
  async listMine(userId) {
    return petRepository.findByOwner(userId);
  },

  async create({ ownerId, data, files }) {
    const imagePath = toPublicPath(files?.image?.[0]) || '';
    const videoPath = toPublicPath(files?.video?.[0], 'videos');
    const id = await petRepository.insert({
      ownerId,
      name: data.name,
      speciesId: data.speciesId,
      breedId: data.breedId,
      gender: data.gender,
      age: data.age,
      vaccinated: data.vaccinated,
      description: data.description,
      imagePath,
      videoPath,
      goal: data.goal,
    });
    return petRepository.findById(id);
  },

  async update({ petId, actingUserId, data, files }) {
    const pet = await petRepository.findById(petId);
    assertOwner(pet, actingUserId);

    const patch = { ...data };
    const newImage = toPublicPath(files?.image?.[0]);
    const newVideo = toPublicPath(files?.video?.[0], 'videos');
    if (newImage) patch.imagePath = newImage;
    if (newVideo) patch.videoPath = newVideo;

    await petRepository.update(petId, patch);

    if (newImage) await deletePhysicalFile(pet.imagePath);
    if (newVideo) await deletePhysicalFile(pet.videoPath);

    return petRepository.findById(petId);
  },

  async remove({ petId, actingUserId }) {
    const media = await petRepository.findMediaPaths(petId);
    const pet = await petRepository.findById(petId);
    assertOwner(pet, actingUserId);

    await petRepository.deleteById(petId);
    if (media) {
      await deletePhysicalFile(media.imagePath);
      await deletePhysicalFile(media.videoPath);
    }
  },

  async getStats({ petId, actingUserId }) {
    const pet = await petRepository.findById(petId);
    assertOwner(pet, actingUserId);
    return petRepository.computeStats(petId);
  },

  async adoptOut({ actingUserId, petId, newOwnerId }) {
    const pet = await petRepository.findById(petId);
    assertOwner(pet, actingUserId);
    if (pet.goal !== 'adoption') {
      throw new AppError('Pet is not listed for adoption', 400, 'NOT_FOR_ADOPTION');
    }
    if (newOwnerId === actingUserId) {
      throw new AppError('Cannot adopt to self', 400, 'INVALID_NEW_OWNER');
    }
    await petRepository.transferOwnership(petId, newOwnerId);
    return petRepository.findById(petId);
  },
};
