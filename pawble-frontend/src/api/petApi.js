import { request } from './client.js';

const toFormData = (data, files) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    fd.append(k, v);
  }
  if (files?.image) fd.append('image', files.image);
  if (files?.video) fd.append('video', files.video);
  return fd;
};

export const petApi = {
  listMine: () => request('/pets/mine'),
  create: (data, files) => request('/pets', { method: 'POST', body: toFormData(data, files), isForm: true }),
  update: (petId, data, files) =>
    request(`/pets/${petId}`, { method: 'PUT', body: toFormData(data, files), isForm: true }),
  remove: (petId) => request(`/pets/${petId}`, { method: 'DELETE' }),
  stats: (petId) => request(`/pets/${petId}/stats`),
};
