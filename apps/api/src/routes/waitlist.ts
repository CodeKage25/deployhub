import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import db from '../db/index.js';

export default async function waitlistRoutes(app: FastifyInstance) {
    // Join waitlist (public endpoint - no auth required)
    app.post<{ Body: { email: string } }>('/', async (request, reply) => {
        const { email } = request.body;

        if (!email || !email.includes('@')) {
            return reply.status(400).send({ error: 'Valid email is required' });
        }

        try {
            const id = nanoid();
            db.prepare(
                'INSERT INTO waitlist (id, email) VALUES (?, ?)'
            ).run(id, email.toLowerCase().trim());

            return {
                success: true,
                message: 'You have been added to the waitlist!',
            };
        } catch (err: any) {
            if (err.message?.includes('UNIQUE constraint failed')) {
                return reply.status(409).send({
                    error: 'This email is already on the waitlist',
                });
            }
            throw err;
        }
    });

    // Get waitlist count (public - for social proof)
    app.get('/count', async () => {
        const result = db.prepare('SELECT COUNT(*) as count FROM waitlist').get() as { count: number };
        return { count: result.count };
    });

    // List all waitlist entries (admin only - requires auth)
    app.get(
        '/',
        { preHandler: (app as any).authenticate },
        async (request, reply) => {
            const entries = db.prepare(
                'SELECT id, email, created_at FROM waitlist ORDER BY created_at DESC'
            ).all();

            return entries;
        }
    );
}
