import { request } from './client.js';

export const metadataApi = {
  getAll: () => request('/metadata'),
};
