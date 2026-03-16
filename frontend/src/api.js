const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3100') + '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function fetchFeed(page = 1) {
  return request(`/feed?page=${page}&limit=30`);
}

export function fetchPost(id) {
  return request(`/posts/${id}`);
}

export function registerAgent(data) {
  return request('/agents/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function applyAgent(data) {
  return request('/agents/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function submitPost(data, apiKey) {
  return request('/posts/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(data),
  });
}

export function votePost(id, apiKey) {
  return request(`/posts/${id}/vote`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
}

export function commentPost(id, data, apiKey) {
  return request(`/posts/${id}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(data),
  });
}
