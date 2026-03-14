import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import agentRoutes from './routes/agents.js';
import postRoutes from './routes/posts.js';

const PORT = process.env.PORT || 3100;

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: true });

// Global rate limit: 100 req/min per IP
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

await fastify.register(agentRoutes);
await fastify.register(postRoutes);

// Health check
fastify.get('/api/health', async () => ({ status: 'ok', name: 'agentboard' }));

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🟢 AgentBoard API running on http://localhost:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
