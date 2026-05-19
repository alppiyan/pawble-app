import { userRepository } from '../repositories/userRepository.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/token.js';
import { AppError } from '../utils/AppError.js';

const tokenFor = (user) =>
  signToken({ sub: user.id, isAdmin: user.isAdmin, isShelter: user.isShelter });

export const authService = {
  async register({ name, surname, email, password, location }) {
    const existing = await userRepository.findByEmailWithHash(email);
    if (existing) throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');

    const passwordHash = await hashPassword(password);
    const id = await userRepository.insert({ name, surname, email, passwordHash, location });
    const user = await userRepository.findById(id);
    return { user, token: tokenFor(user) };
  },

  async login({ email, password }) {
    const userWithHash = await userRepository.findByEmailWithHash(email);
    if (!userWithHash) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

    const ok = await verifyPassword(password, userWithHash.passwordHash);
    if (!ok) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

    const { passwordHash, ...user } = userWithHash;
    return { user, token: tokenFor(user) };
  },

  async getCurrent(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    return user;
  },

  async updateProfile(userId, { name, surname, location }) {
    await userRepository.updateProfile(userId, { name, surname, location });
    return userRepository.findById(userId);
  },
};
