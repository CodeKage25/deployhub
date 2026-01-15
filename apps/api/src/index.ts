import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import deploymentRoutes from './routes/deployments.js';
import webhookRoutes from './routes/webhooks.js';
import iacRoutes from './routes/iac.js';
import waitlistRoutes from './routes/waitlist.js';

// Initialize env
config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
const dataDir = join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
import './db/index.js';

const app = Fastify({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
            },
        },
    },
});

// Register plugins
await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
});

await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'super-secret-change-in-production',
});

await app.register(websocket);

// Auth decorator
app.decorate('authenticate', async function (request: any, reply: any) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.status(401).send({ error: 'Unauthorized' });
    }
});

// Health check
app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
app.register(authRoutes, { prefix: '/api/auth' });
app.register(projectRoutes, { prefix: '/api/projects' });
app.register(deploymentRoutes, { prefix: '/api/deployments' });
app.register(webhookRoutes, { prefix: '/api/webhooks' });
app.register(iacRoutes, { prefix: '/api/iac' });
app.register(waitlistRoutes, { prefix: '/api/waitlist' });

// Start server
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 DeployHub API Server                                 ║
║                                                           ║
║   Local:   http://localhost:${PORT}                        ║
║   Health:  http://localhost:${PORT}/api/health              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
} catch (err) {
    app.log.error(err);
    process.exit(1);
}

export default app;
