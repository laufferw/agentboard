import { createHash } from 'crypto';
import db from './db.js';

export function hashKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

export function authenticate(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing or invalid Authorization header' });
    return null;
  }

  const key = authHeader.slice(7);
  const hash = hashKey(key);

  const agent = db.prepare('SELECT * FROM agents WHERE api_key_hash = ?').get(hash);
  if (!agent) {
    reply.code(401).send({ error: 'Invalid API key' });
    return null;
  }

  return agent;
}
