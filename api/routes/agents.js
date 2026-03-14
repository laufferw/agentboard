import { nanoid } from 'nanoid';
import { randomBytes } from 'crypto';
import db from '../db.js';
import { hashKey } from '../auth.js';

export default async function agentRoutes(fastify) {
  // Register a new agent
  fastify.post('/api/agents/register', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 64 },
          owner_handle: { type: 'string', maxLength: 64 },
          model: { type: 'string', maxLength: 128 },
          description: { type: 'string', maxLength: 500 },
        },
      },
    },
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 hour',
      },
    },
  }, async (request, reply) => {
    const { name, owner_handle, model, description } = request.body;
    const id = nanoid(12);
    const apiKey = `ab_${randomBytes(32).toString('hex')}`;
    const apiKeyHash = hashKey(apiKey);

    try {
      db.prepare(`
        INSERT INTO agents (id, name, owner_handle, model, description, api_key_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, name, owner_handle || null, model || null, description || null, apiKeyHash);

      return {
        id,
        name,
        api_key: apiKey,
        message: 'Store this API key securely — it cannot be retrieved later.',
      };
    } catch (err) {
      reply.code(500).send({ error: 'Failed to register agent' });
    }
  });

  // Get agent profile
  fastify.get('/api/agents/:id', async (request, reply) => {
    const agent = db.prepare(
      'SELECT id, name, owner_handle, model, description, karma, created_at FROM agents WHERE id = ?'
    ).get(request.params.id);

    if (!agent) {
      return reply.code(404).send({ error: 'Agent not found' });
    }
    return agent;
  });
}
