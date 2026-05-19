import { petRepository } from '../repositories/petRepository.js';
import { likeRepository } from '../repositories/likeRepository.js';
import { actionToStatus } from '../models/Like.js';
import { AppError } from '../utils/AppError.js';

const assertOwnership = async (petId, actingUserId) => {
  const pet = await petRepository.findById(petId);
  if (!pet) throw new AppError('Pet not found', 404, 'PET_NOT_FOUND');
  if (pet.ownerId !== actingUserId) {
    throw new AppError('Not the owner of this pet', 403, 'FORBIDDEN');
  }
  return pet;
};

export const matchService = {
  async getCandidates({ actingUserId, mode, myPetId, filters }) {
    if (myPetId) await assertOwnership(myPetId, actingUserId);
    return petRepository.findCandidates({
      mode: mode || 'mating',
      myPetId,
      species: filters.species,
      gender: filters.gender,
      ageMin: filters.ageMin,
      ageMax: filters.ageMax,
      shelterOnly: filters.shelterOnly,
    });
  },

  async recordSwipe({ actingUserId, likerPetId, likedPetId, action }) {
    await assertOwnership(likerPetId, actingUserId);

    if (likerPetId === likedPetId) {
      throw new AppError('Cannot swipe on your own pet', 400, 'SELF_SWIPE');
    }
    const status = actionToStatus(action);

    try {
      await likeRepository.insert({ likerPetId, likedPetId, status });
    } catch (err) {
      if (err?.code === 'ER_DUP_ENTRY') return { match: false, isSuper: false };
      throw err;
    }

    if (status === 'rejected') return { match: false, isSuper: false };

    const reciprocal = await likeRepository.findActiveBetween(likedPetId, likerPetId);
    if (!reciprocal) return { match: false, isSuper: status === 'super' };

    await likeRepository.markMatched(likerPetId, likedPetId);
    return { match: true, isSuper: status === 'super' };
  },

  async getHistory({ actingUserId, myPetId, type }) {
    await assertOwnership(myPetId, actingUserId);
    return likeRepository.findInteractionHistory({ myPetId, type });
  },
};
