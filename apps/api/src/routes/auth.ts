import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import db from '../db/index.js';

interface RegisterBody {
    email: string;
    password: string;
}

interface LoginBody {
    email: string;
    password: string;
}

export default async function authRoutes(app: FastifyInstance) {
    // Register
    app.post<{ Body: RegisterBody }>('/register', async (request, reply) => {
        const { email, password } = request.body;

        if (!email || !password) {
            return reply.status(400).send({ error: 'Email and password required' });
        }

        if (password.length < 8) {
            return reply.status(400).send({ error: 'Password must be at least 8 characters' });
        }

        // Check if user exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return reply.status(409).send({ error: 'Email already registered' });
        }

        // Hash password and create user
        const passwordHash = await bcrypt.hash(password, 12);
        const id = nanoid();

        db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
            .run(id, email, passwordHash);

        const token = app.jwt.sign({ id, email });

        return {
            user: { id, email },
            token,
        };
    });

    // Login
    app.post<{ Body: LoginBody }>('/login', async (request, reply) => {
        const { email, password } = request.body;

        if (!email || !password) {
            return reply.status(400).send({ error: 'Email and password required' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
        if (!user) {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const token = app.jwt.sign({ id: user.id, email: user.email });

        return {
            user: { id: user.id, email: user.email },
            token,
        };
    });

    // Get current user
    app.get('/me', {
        preHandler: [(app as any).authenticate],
    }, async (request) => {
        const { id, email } = request.user as any;
        return { id, email };
    });
}
