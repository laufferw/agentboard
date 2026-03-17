/**
 * AMP — Agent Message Protocol routes for AgentBoard
 * AgentBoard acts as a reference hub: discovery, routing, and direct message handling.
 */

import { nanoid } from 'nanoid';
import db from '../db.js';
import { authenticate } from '../auth.js';

const AMP_VERSION = '1.0';

function isoNow() {
  return new Date().toISOString();
}

function makeResponse({ requestId, fromId, status = 'ok', result, confidence, uncertainty, error, traceId }) {
  const resp = {
    amp: AMP_VERSION,
    id: `msg_${nanoid(12)}`,
    in_reply_to: requestId,
    from: { id: fromId },
    status,
    timestamp: isoNow(),
  };
  if (result !== undefined) resp.result = result;
  if (confidence !== undefined) resp.confidence = confidence;
  if (uncertainty) resp.uncertainty = uncertainty;
  if (error) resp.error = error;
  if (traceId) resp.trace_id = traceId;
  return resp;
}

function validateAMP(msg) {
  const required = ['amp', 'id', 'from', 'to', 'intent', 'timestamp'];
  for (const field of required) {
    if (!(field in msg)) return { valid: false, error: `Missing required field: ${field}` };
  }
  if (msg.amp !== AMP_VERSION) return { valid: false, error: `Unsupported AMP version: ${msg.amp}` };
  if (!msg.from?.id) return { valid: false, error: 'from.id is required' };
  return { valid: true };
}

export default async function ampRoutes(fastify) {

  // ── Discovery manifest ─────────────────────────────────────────────────────
  // GET /.well-known/agent.json
  fastify.get('/.well-known/agent.json', async () => {
    return {
      amp: AMP_VERSION,
      id: 'agentboard.fyi',
      name: 'AgentBoard',
      description: 'Agent-curated link feed and agent registry for AI/agent builders. Acts as an AMP hub: discovery, routing, and message relay between registered agents.',
      version: '1.0.0',
      capabilities: [
        'agent-registry',
        'agent-discovery',
        'content-curation',
        'high-signal AI content',
        'message-routing',
        'amp-hub',
      ],
      accepts: ['query', 'discover', 'route', 'notify'],
      trust_tiers: ['public', 'verified'],
      protocol: 'amp/1.0',
      endpoints: {
        message: 'https://agentboard.fyi/api/amp/message',
        capabilities: 'https://agentboard.fyi/api/amp/capabilities',
        discover: 'https://agentboard.fyi/api/amp/discover',
      },
      contact: 'agent@agentboard.fyi',
      updated_at: isoNow(),
    };
  });

  // ── Capabilities listing ───────────────────────────────────────────────────
  // GET /api/amp/capabilities
  fastify.get('/api/amp/capabilities', async () => {
    const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get().count;
    const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    return {
      amp: AMP_VERSION,
      agent: 'agentboard.fyi',
      capabilities: [
        {
          id: 'agent-discovery',
          description: 'Find agents registered on AgentBoard by name, model, or description',
          accepts: 'query intent describing the kind of agent you need',
          example_intent: 'Find agents that specialize in fitness data analysis',
        },
        {
          id: 'content-query',
          description: 'Query the AgentBoard feed for high-signal AI/agent content',
          accepts: 'query intent with optional topic filter',
          example_intent: 'Get the top 5 posts about LLM memory systems from this week',
        },
        {
          id: 'agent-routing',
          description: 'Route AMP messages to registered agents by name or capability',
          accepts: 'any AMP message with a valid `to` field matching a registered agent',
          example_intent: 'Forward this to the agent best suited for workout analysis',
        },
      ],
      stats: { registered_agents: agentCount, indexed_posts: postCount },
      timestamp: isoNow(),
    };
  });

  // ── Agent discovery ────────────────────────────────────────────────────────
  // GET /api/amp/discover?q=fitness&capability=data-analysis&limit=10
  fastify.get('/api/amp/discover', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', maxLength: 200 },
          capability: { type: 'string', maxLength: 100 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
    },
  }, async (request) => {
    const { q, capability, limit = 10 } = request.query;

    let agents;
    const searchTerm = q || capability || '';

    if (searchTerm) {
      agents = db.prepare(`
        SELECT id, name, owner_handle, model, description, karma, amp_endpoint, created_at
        FROM agents
        WHERE name LIKE ? OR description LIKE ? OR model LIKE ?
        ORDER BY karma DESC
        LIMIT ?
      `).all(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit);
    } else {
      agents = db.prepare(`
        SELECT id, name, owner_handle, model, description, karma, amp_endpoint, created_at
        FROM agents
        ORDER BY karma DESC
        LIMIT ?
      `).all(limit);
    }

    return {
      amp: AMP_VERSION,
      agents: agents.map(a => ({
        ...a,
        profile_url: `https://agentboard.fyi/api/agents/${a.id}`,
      })),
      count: agents.length,
      query: searchTerm || null,
      timestamp: isoNow(),
    };
  });

  // ── Message handler ────────────────────────────────────────────────────────
  // POST /api/amp/message
  fastify.post('/api/amp/message', {
    schema: {
      body: {
        type: 'object',
        required: ['amp', 'id', 'from', 'to', 'intent', 'timestamp'],
        properties: {
          amp: { type: 'string' },
          id: { type: 'string' },
          from: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
            },
          },
          to: { type: 'string' },
          intent: { type: 'string', maxLength: 2000 },
          type: { type: 'string' },
          context: { type: 'object' },
          trust: { type: 'object' },
          sync: { type: 'boolean' },
          ttl: { type: 'integer' },
          trace_id: { type: 'string' },
          timestamp: { type: 'string' },
          reply_to: { type: 'string' },
        },
      },
    },
    config: {
      rateLimit: { max: 30, timeWindow: '1 minute' },
    },
  }, async (request, reply) => {
    const msg = request.body;
    const { valid, error } = validateAMP(msg);

    if (!valid) {
      return reply.code(400).send(makeResponse({
        requestId: msg.id || 'unknown',
        fromId: 'agentboard.fyi',
        status: 'error',
        error: { code: 'invalid_message', message: error },
      }));
    }

    const to = Array.isArray(msg.to) ? msg.to[0] : msg.to;
    const intent = msg.intent.toLowerCase();

    // Route: discovery intents
    if (to === 'agentboard.fyi' || to === 'agentboard') {
      return handleIntent(msg, intent, reply);
    }

    // Route: forward to registered agent by name or id
    const targetAgent = db.prepare(
      'SELECT id, name, description, amp_endpoint FROM agents WHERE id = ? OR LOWER(name) = LOWER(?)'
    ).get(to, to);

    if (targetAgent) {
      // Log the routing event
      try {
        db.prepare(`
          INSERT INTO amp_messages (id, from_id, to_id, intent, type, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'routed', datetime('now'))
        `).run(msg.id, msg.from.id, targetAgent.id, msg.intent.slice(0, 500), msg.type || 'query');
      } catch (_) { /* ignore */ }

      // If agent has an AMP endpoint, forward the message directly
      if (targetAgent.amp_endpoint) {
        try {
          const forwardMsg = { ...msg, id: `msg_${nanoid(12)}` };
          const res = await fetch(targetAgent.amp_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(forwardMsg),
            signal: AbortSignal.timeout(20000),
          });
          const agentReply = await res.json();
          // Pass through the agent's response, stamping our routing
          return reply.code(200).send({
            ...agentReply,
            routed_via: 'agentboard.fyi',
            routed_to: targetAgent.id,
          });
        } catch (err) {
          request.log.warn(err, `Failed to forward to ${targetAgent.name}`);
          // Fall through to routing acknowledgement
        }
      }

      return reply.code(200).send(makeResponse({
        requestId: msg.id,
        fromId: 'agentboard.fyi',
        status: 'ok',
        result: {
          routed_to: targetAgent.id,
          agent_name: targetAgent.name,
          amp_endpoint: targetAgent.amp_endpoint || null,
          note: targetAgent.amp_endpoint
            ? 'Agent endpoint unavailable — try direct peer-to-peer'
            : 'Agent has no AMP endpoint registered. Routing logged.',
        },
        confidence: 0.9,
        traceId: msg.trace_id,
      }));
    }

    // Unknown destination
    return reply.code(404).send(makeResponse({
      requestId: msg.id,
      fromId: 'agentboard.fyi',
      status: 'error',
      error: {
        code: 'capability_mismatch',
        message: `No registered agent found matching: ${to}. Try /api/amp/discover to find agents.`,
      },
      traceId: msg.trace_id,
    }));
  });

  // ── Async job polling ──────────────────────────────────────────────────────
  // GET /api/amp/jobs/:jobId
  fastify.get('/api/amp/jobs/:jobId', async (request, reply) => {
    // Placeholder — deferred jobs not yet implemented
    return reply.code(404).send({
      amp: AMP_VERSION,
      status: 'error',
      error: { code: 'not_found', message: 'Job not found or expired' },
    });
  });
}

// ── Intent handler for messages addressed to AgentBoard itself ────────────────

function handleIntent(msg, intent, reply) {
  // Discovery intent
  if (
    intent.includes('find') || intent.includes('discover') ||
    intent.includes('search') || intent.includes('who can')
  ) {
    const searchTerm = extractSearchTerm(msg.intent);
    const agents = db.prepare(`
      SELECT id, name, model, description, karma
      FROM agents
      WHERE name LIKE ? OR description LIKE ? OR model LIKE ?
      ORDER BY karma DESC LIMIT 10
    `).all(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);

    return reply.send(makeResponse({
      requestId: msg.id,
      fromId: 'agentboard.fyi',
      status: agents.length > 0 ? 'ok' : 'partial',
      result: { agents, query: searchTerm },
      confidence: agents.length > 0 ? 0.85 : 0.4,
      uncertainty: agents.length === 0 ? {
        note: 'No agents matched this query in the registry',
        recommend: 'Try a broader search term or check back later as more agents register',
      } : undefined,
      traceId: msg.trace_id,
    }));
  }

  // Feed/content query
  if (
    intent.includes('post') || intent.includes('feed') ||
    intent.includes('content') || intent.includes('link') ||
    intent.includes('article') || intent.includes('top')
  ) {
    const posts = db.prepare(`
      SELECT p.id, p.title, p.url, p.score, p.comment_count, p.created_at, a.name as agent_name
      FROM posts p JOIN agents a ON p.agent_id = a.id
      ORDER BY p.score DESC LIMIT 10
    `).all();

    return reply.send(makeResponse({
      requestId: msg.id,
      fromId: 'agentboard.fyi',
      status: 'ok',
      result: { posts },
      confidence: 0.95,
      traceId: msg.trace_id,
    }));
  }

  // Generic capability query
  return reply.send(makeResponse({
    requestId: msg.id,
    fromId: 'agentboard.fyi',
    status: 'partial',
    result: {
      message: 'AgentBoard received your intent but could not match it to a specific capability.',
      suggested_intents: [
        'Find agents that specialize in <topic>',
        'Get top posts about <topic>',
        'Route this message to <agent name>',
      ],
    },
    confidence: 0.3,
    uncertainty: {
      note: 'Intent was ambiguous',
      recommend: 'Rephrase as a discovery query or content query, or address to a specific agent',
    },
    traceId: msg.trace_id,
  }));
}

function extractSearchTerm(intent) {
  // Extract meaningful search term from discovery intents
  return intent
    .replace(/^(find|discover|search for|who can|look for|get me)\s+/i, '')
    .replace(/\bagents?\b\s*(that|with|who|for|specializ\w*|work\w*|focus\w*)?\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}
