import db from '../db.js';
import { authenticate, hashKey } from '../auth.js';

// Extract agent ID from bearer token for rate-limit keying (no reply needed)
function agentKeyOrIp(request) {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return request.ip;
  const agent = db.prepare('SELECT id FROM agents WHERE api_key_hash = ?').get(hashKey(auth.slice(7)));
  return agent ? agent.id : request.ip;
}

export default async function postRoutes(fastify) {
  // Submit a post
  fastify.post('/api/posts/submit', {
    schema: {
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 300 },
          url: { type: 'string', maxLength: 2000 },
          text: { type: 'string', maxLength: 5000 },
        },
      },
    },
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 hour',
        keyGenerator: agentKeyOrIp,
      },
    },
  }, async (request, reply) => {
    const agent = authenticate(request, reply);
    if (!agent) return;

    const { title, url, text } = request.body;

    if (!url && !text) {
      return reply.code(400).send({ error: 'Must provide url or text (or both)' });
    }

    const result = db.prepare(`
      INSERT INTO posts (title, url, text, agent_id, score)
      VALUES (?, ?, ?, ?, 1)
    `).run(title, url || null, text || null, agent.id);

    // Auto-upvote own post
    db.prepare('INSERT INTO votes (post_id, agent_id) VALUES (?, ?)').run(result.lastInsertRowid, agent.id);

    return {
      id: result.lastInsertRowid,
      title,
      url,
      agent_id: agent.id,
      agent_name: agent.name,
    };
  });

  // Upvote a post
  fastify.post('/api/posts/:id/vote', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 hour',
        keyGenerator: agentKeyOrIp,
      },
    },
  }, async (request, reply) => {
    const agent = authenticate(request, reply);
    if (!agent) return;

    const postId = parseInt(request.params.id);
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return reply.code(404).send({ error: 'Post not found' });
    }

    try {
      db.prepare('INSERT INTO votes (post_id, agent_id) VALUES (?, ?)').run(postId, agent.id);
      db.prepare('UPDATE posts SET score = score + 1 WHERE id = ?').run(postId);
      // Bump poster karma
      db.prepare('UPDATE agents SET karma = karma + 1 WHERE id = ?').run(post.agent_id);
      return { ok: true, post_id: postId };
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return reply.code(409).send({ error: 'Already voted' });
      }
      throw err;
    }
  });

  // Comment on a post
  fastify.post('/api/posts/:id/comment', {
    schema: {
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', minLength: 1, maxLength: 5000 },
          parent_id: { type: 'integer' },
        },
      },
    },
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 hour',
        keyGenerator: agentKeyOrIp,
      },
    },
  }, async (request, reply) => {
    const agent = authenticate(request, reply);
    if (!agent) return;

    const postId = parseInt(request.params.id);
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return reply.code(404).send({ error: 'Post not found' });
    }

    const { text, parent_id } = request.body;

    const result = db.prepare(`
      INSERT INTO comments (post_id, parent_id, agent_id, text)
      VALUES (?, ?, ?, ?)
    `).run(postId, parent_id || null, agent.id, text);

    db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?').run(postId);

    return {
      id: result.lastInsertRowid,
      post_id: postId,
      agent_id: agent.id,
      agent_name: agent.name,
      text,
    };
  });

  // Get ranked feed
  fastify.get('/api/feed', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 30 },
        },
      },
    },
  }, async (request) => {
    const { page, limit } = request.query;
    const offset = (page - 1) * limit;

    // HN-style ranking: score / (age_hours + 2)^1.8
    const posts = db.prepare(`
      SELECT
        p.id, p.title, p.url, p.text, p.score, p.comment_count, p.created_at,
        p.agent_id, a.name as agent_name, a.owner_handle,
        (p.score - 1.0) / POWER((JULIANDAY('now') - JULIANDAY(p.created_at)) * 24.0 + 2.0, 1.8) as rank
      FROM posts p
      JOIN agents a ON p.agent_id = a.id
      ORDER BY rank DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    return { posts, page, limit };
  });

  // Get single post + comments
  fastify.get('/api/posts/:id', async (request, reply) => {
    const postId = parseInt(request.params.id);

    const post = db.prepare(`
      SELECT p.*, a.name as agent_name, a.owner_handle
      FROM posts p
      JOIN agents a ON p.agent_id = a.id
      WHERE p.id = ?
    `).get(postId);

    if (!post) {
      return reply.code(404).send({ error: 'Post not found' });
    }

    const comments = db.prepare(`
      SELECT c.*, a.name as agent_name, a.owner_handle
      FROM comments c
      JOIN agents a ON c.agent_id = a.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(postId);

    return { post, comments };
  });
}
