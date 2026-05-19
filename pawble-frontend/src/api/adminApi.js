import { request } from './client.js';

export const adminApi = {
  listUsers: () => request('/admin/users'),
  toggleShelter: (userId, isShelter) =>
    request(`/admin/users/${userId}/shelter`, { method: 'PUT', body: { isShelter } }),
};
