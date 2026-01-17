import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import db from '../db/index.js';

interface CreateProjectBody {
    name: string;
    repoUrl: string;
    branch?: string;
    envVars?: Record<string, string>;
}

interface UpdateProjectBody {
    name?: string;
    branch?: string;
    envVars?: Record<string, string>;
}

export default async function projectRoutes(app: FastifyInstance) {
    // All routes require authentication
    app.addHook('preHandler', (app as any).authenticate);

    // List all projects
    app.get('/', async (request) => {
        const user = request.user as any;
        const projects = db.prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM deployments WHERE project_id = p.id) as deployment_count,
        (SELECT status FROM deployments WHERE project_id = p.id ORDER BY started_at DESC LIMIT 1) as latest_status
      FROM projects p
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(user.id);

        return projects.map((p: any) => ({
            ...p,
            envVars: JSON.parse(p.env_vars || '{}'),
        }));
    });

    // Get single project
    app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
        const user = request.user as any;
        const { id } = request.params;

        const project = db.prepare(`
      SELECT * FROM projects WHERE id = ? AND user_id = ?
    `).get(id, user.id) as any;

        if (!project) {
            return reply.status(404).send({ error: 'Project not found' });
        }

        // Get recent deployments
        const deployments = db.prepare(`
      SELECT * FROM deployments WHERE project_id = ? ORDER BY started_at DESC LIMIT 10
    `).all(id);

        return {
            ...project,
            envVars: JSON.parse(project.env_vars || '{}'),
            deployments,
        };
    });

    // List deployments for a project
    app.get<{ Params: { id: string } }>('/:id/deployments', async (request, reply) => {
        const user = request.user as any;
        const { id } = request.params;

        const project = db.prepare(`
      SELECT * FROM projects WHERE id = ? AND user_id = ?
    `).get(id, user.id);

        if (!project) {
            return reply.status(404).send({ error: 'Project not found' });
        }

        const deployments = db.prepare(`
      SELECT * FROM deployments WHERE project_id = ? ORDER BY started_at DESC
    `).all(id);

        return deployments;
    });


    // Create project
    app.post<{ Body: CreateProjectBody }>('/', async (request, reply) => {
        const user = request.user as any;
        const { name, repoUrl, branch = 'main', envVars = {} } = request.body;

        console.log('Creating project. Body:', JSON.stringify(request.body));
        console.log('Parsed fields:', { name, repoUrl });

        if (!name || !repoUrl) {
            return reply.status(400).send({ error: 'Name and repo URL required' });
        }

        // Validate repo URL
        const urlPattern = /^https?:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/.+\/.+/;
        if (!urlPattern.test(repoUrl)) {
            return reply.status(400).send({ error: 'Invalid repository URL' });
        }

        const id = nanoid();

        db.prepare(`
      INSERT INTO projects (id, user_id, name, repo_url, branch, env_vars)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, user.id, name, repoUrl, branch, JSON.stringify(envVars));

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

        return project;
    });

    // Update project
    app.patch<{ Params: { id: string }; Body: UpdateProjectBody }>(
        '/:id',
        async (request, reply) => {
            const user = request.user as any;
            const { id } = request.params;
            const { name, branch, envVars } = request.body;

            const existing = db.prepare(
                'SELECT * FROM projects WHERE id = ? AND user_id = ?'
            ).get(id, user.id);

            if (!existing) {
                return reply.status(404).send({ error: 'Project not found' });
            }

            const updates: string[] = [];
            const values: any[] = [];

            if (name) {
                updates.push('name = ?');
                values.push(name);
            }
            if (branch) {
                updates.push('branch = ?');
                values.push(branch);
            }
            if (envVars) {
                updates.push('env_vars = ?');
                values.push(JSON.stringify(envVars));
            }

            if (updates.length > 0) {
                values.push(id);
                db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);
            }

            const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
            return project;
        }
    );

    // Delete project
    app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
        const user = request.user as any;
        const { id } = request.params;

        const existing = db.prepare(
            'SELECT * FROM projects WHERE id = ? AND user_id = ?'
        ).get(id, user.id);

        if (!existing) {
            return reply.status(404).send({ error: 'Project not found' });
        }

        // TODO: Stop and remove containers for this project

        db.prepare('DELETE FROM projects WHERE id = ?').run(id);

        return { success: true };
    });
}
