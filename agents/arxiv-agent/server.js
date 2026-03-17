/**
 * ArXiv Agent — AMP reference implementation
 *
 * An AI-native research agent that searches ArXiv papers and returns
 * structured summaries. Speaks AMP natively.
 *
 * Endpoints:
 *   GET  /.well-known/agent.json  — AMP discovery manifest
 *   POST /api/amp/message         — receive AMP messages
 *   GET  /api/health              — health check
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { nanoid } from 'nanoid';
import { parseStringPromise } from 'xml2js';

const PORT = process.env.PORT || 3200;
const AGENT_ID = 'arxiv.agentboard.fyi';
const AMP_VERSION = '1.0';

const fastify = Fastify({ logger: false });
await fastify.register(cors, { origin: true });

function isoNow() { return new Date().toISOString(); }

function makeResponse({ requestId, status = 'ok', result, confidence, uncertainty, error, traceId }) {
  const resp = {
    amp: AMP_VERSION,
    id: `msg_${nanoid(12)}`,
    in_reply_to: requestId,
    from: { id: AGENT_ID, name: 'ArXiv Agent', type: 'agent' },
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

// ── ArXiv search ─────────────────────────────────────────────────────────────

async function searchArxiv(query, maxResults = 5) {
  const encoded = encodeURIComponent(query);
  const url = `https://export.arxiv.org/api/query?search_query=all:${encoded}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`ArXiv API error: ${res.status}`);

  const xml = await res.text();
  const parsed = await parseStringPromise(xml, { explicitArray: false });
  const feed = parsed.feed;

  const entries = feed.entry
    ? Array.isArray(feed.entry) ? feed.entry : [feed.entry]
    : [];

  return entries.map(e => ({
    id: e.id?.split('/abs/')?.pop() || e.id,
    title: e.title?.replace(/\s+/g, ' ').trim(),
    authors: Array.isArray(e.author)
      ? e.author.map(a => a.name).slice(0, 3).join(', ') + (e.author.length > 3 ? ' et al.' : '')
      : e.author?.name || 'Unknown',
    summary: e.summary?.replace(/\s+/g, ' ').trim().slice(0, 400) + '...',
    published: e.published?.slice(0, 10),
    url: `https://arxiv.org/abs/${e.id?.split('/abs/')?.pop() || e.id}`,
    pdf: `https://arxiv.org/pdf/${e.id?.split('/abs/')?.pop() || e.id}`,
  }));
}

function extractSearchQuery(intent) {
  // Strip common preambles to get the core topic
  return intent
    .replace(/^(search|find|look up|get|fetch|show me|give me|list)\s+(papers?|articles?|research|arxiv\s+papers?)?\s*(about|on|for|related to)?\s*/i, '')
    .replace(/\s+(from|on|in)\s+arxiv\.?\s*$/i, '')
    .replace(/\s+(recent|latest|new|today'?s?)?\s*papers?\s*$/i, '')
    .trim()
    .slice(0, 200) || intent.slice(0, 200);
}

// ── Discovery manifest ────────────────────────────────────────────────────────

fastify.get('/.well-known/agent.json', async () => ({
  amp: AMP_VERSION,
  id: AGENT_ID,
  name: 'ArXiv Agent',
  description: 'Research agent that searches arxiv.org for papers and returns structured summaries. Send any research topic as an AMP intent.',
  version: '1.0.0',
  capabilities: [
    'arxiv paper search',
    'research literature discovery',
    'AI/ML paper retrieval',
    'scientific paper summarization',
    'recent research monitoring',
  ],
  accepts: ['query'],
  trust_tiers: ['public'],
  protocol: 'amp/1.0',
  endpoints: {
    message: `https://${AGENT_ID}/api/amp/message`,
  },
  example_intents: [
    'Find recent papers about agent memory systems',
    'Search for LLM reasoning and planning research',
    'Get papers on multi-agent communication protocols',
  ],
  rate_limit: '30 requests per minute',
  updated_at: isoNow(),
}));

// ── AMP message handler ───────────────────────────────────────────────────────

fastify.post('/api/amp/message', {
  schema: {
    body: {
      type: 'object',
      required: ['amp', 'id', 'from', 'to', 'intent', 'timestamp'],
      properties: {
        amp: { type: 'string' },
        id: { type: 'string' },
        from: { type: 'object', required: ['id'], properties: { id: { type: 'string' }, name: { type: 'string' } } },
        to: { type: 'string' },
        intent: { type: 'string', maxLength: 2000 },
        context: { type: 'object' },
        timestamp: { type: 'string' },
        trace_id: { type: 'string' },
      },
    },
  },
}, async (request, reply) => {
  const msg = request.body;

  if (msg.amp !== AMP_VERSION) {
    return reply.code(400).send(makeResponse({
      requestId: msg.id,
      status: 'error',
      error: { code: 'unsupported_version', message: `AMP version ${msg.amp} not supported` },
    }));
  }

  const query = extractSearchQuery(msg.intent);
  const maxResults = msg.context?.max_results || 5;

  let papers;
  try {
    papers = await searchArxiv(query, Math.min(maxResults, 10));
  } catch (err) {
    return reply.send(makeResponse({
      requestId: msg.id,
      status: 'error',
      error: { code: 'arxiv_error', message: err.message },
      traceId: msg.trace_id,
    }));
  }

  if (papers.length === 0) {
    return reply.send(makeResponse({
      requestId: msg.id,
      status: 'partial',
      result: { papers: [], query },
      confidence: 0.3,
      uncertainty: {
        note: `No papers found for "${query}" on ArXiv`,
        recommend: 'Try broader search terms or different keywords',
      },
      traceId: msg.trace_id,
    }));
  }

  return reply.send(makeResponse({
    requestId: msg.id,
    status: 'ok',
    result: { papers, query, count: papers.length },
    confidence: 0.92,
    traceId: msg.trace_id,
  }));
});

// ── Health ────────────────────────────────────────────────────────────────────

fastify.get('/api/health', async () => ({
  status: 'ok',
  agent: AGENT_ID,
  amp: AMP_VERSION,
}));

// ── Boot ──────────────────────────────────────────────────────────────────────

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🔬 ArXiv Agent running on http://localhost:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
