import { userRepository } from '../repositories/userRepository.js';

export const adminService = {
  async listUsers() {
    return userRepository.listNonAdmins();
  },

  async setShelterFlag(userId, isShelter) {
    await userRepository.setShelterFlag(userId, isShelter);
  },
};
