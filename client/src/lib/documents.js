// client/src/lib/documents.js
// All document-domain API calls in one place, so components don't need to
// know endpoint paths directly.
import { api } from './api';

export const Documents = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return api.get(`/documents${qs ? `?${qs}` : ''}`);
  },
  get: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.postForm('/documents', formData),
  update: (id, body) => api.patch(`/documents/${id}`, body),
  remove: (id) => api.delete(`/documents/${id}`),
  downloadUrl: (id) => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${base}/documents/${id}/download`;
  },
  setTags: (id, tags) => api.put(`/documents/${id}/tags`, { tags }),
  search: (query, nResults) => api.post('/documents/search', { query, nResults }),
  ask: (question, documentId) =>
    documentId
      ? api.post(`/documents/${documentId}/ask`, { question })
      : api.post('/documents/ask', { question }),
  summarize: (id, maxSentences) => api.post(`/documents/${id}/summarize`, { maxSentences }),
  suggestTags: (id, apply = false) => api.post(`/documents/${id}/suggest-tags`, { apply }),
  listShares: (id) => api.get(`/documents/${id}/shares`),
  addShare: (id, userId, permission) =>
    api.post(`/documents/${id}/shares`, { userId, permission }),
  updateShare: (id, userId, permission) =>
    api.patch(`/documents/${id}/shares/${userId}`, { permission }),
  revokeShare: (id, userId) => api.delete(`/documents/${id}/shares/${userId}`),
};

export const Folders = {
  list: (parentId) => api.get(`/folders${parentId ? `?parentId=${parentId}` : ''}`),
  create: (name, parentId) => api.post('/folders', { name, parentId }),
  remove: (id) => api.delete(`/folders/${id}`),
};

export const Tags = {
  list: () => api.get('/tags'),
};

export const Users = {
  list: (role) => api.get(`/users${role ? `?role=${role}` : ''}`),
};

export const Analytics = {
  overview: () => api.get('/analytics/overview'),
  mostViewed: (limit) => api.get(`/analytics/most-viewed?limit=${limit || 10}`),
  mostDownloaded: (limit) => api.get(`/analytics/most-downloaded?limit=${limit || 10}`),
  searchQueries: (limit) => api.get(`/analytics/search-queries?limit=${limit || 10}`),
};