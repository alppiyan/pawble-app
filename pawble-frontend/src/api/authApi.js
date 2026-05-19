import { request } from './client.js';

export const authApi = {
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  me: () => request('/auth/me'),
  updateProfile: (data) => request('/users/me', { method: 'PUT', body: data }),
};
