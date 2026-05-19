import { request } from './client.js';

const qs = (obj) => {
  const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
};

export const matchApi = {
  candidates: (params) => request(`/candidates${qs(params)}`),
  swipe: (data) => request('/swipes', { method: 'POST', body: data }),
  history: (params) => request(`/history${qs(params)}`),
  adopt: (data) => request('/adoptions', { method: 'POST', body: data }),
};
