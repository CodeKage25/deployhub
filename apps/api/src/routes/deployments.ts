import { FastifyInstance } from 'fastify';
import db from '../db/index.js';
import { triggerBuild } from '../services/builder/index.js';

export default async function deploymentRoutes(app: FastifyInstance) {
    // All routes require authentication
    app.addHook('preHandler', (app as any).authenticate);

    // Get deployment by ID
    app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
        const { id } = request.params;
        const user = request.user as any;

        const deployment = db.prepare(`
      SELECT d.*, p.name as project_name, p.user_id
      FROM deployments d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = ? AND p.user_id = ?
    `).get(id, user.id) as any;

        if (!deployment) {
            return reply.status(404).send({ error: 'Deployment not found' });
        }

        return deployment;
    });

    // Get deployment logs (with streaming support)
    app.get<{ Params: { id: string } }>('/:id/logs', async (request, reply) => {
        const { id } = request.params;
        const user = request.user as any;

        const deployment = db.prepare(`
      SELECT d.logs, p.user_id
      FROM deployments d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = ? AND p.user_id = ?
    `).get(id, user.id) as any;

        if (!deployment) {
            return reply.status(404).send({ error: 'Deployment not found' });
        }

        return { logs: deployment.logs || '' };
    });

    // Trigger a new deployment for a project
    app.post<{ Params: { projectId: string } }>(
        '/trigger/:projectId',
        async (request, reply) => {
            const { projectId } = request.params;
            const user = request.user as any;

            const project = db.prepare(
                'SELECT * FROM projects WHERE id = ? AND user_id = ?'
            ).get(projectId, user.id) as any;

            if (!project) {
                return reply.status(404).send({ error: 'Project not found' });
            }

            // Trigger build asynchronously
            const deployment = await triggerBuild(project);

            return {
                message: 'Deployment triggered',
                deploymentId: deployment.id,
            };
        }
    );

    // Stop a running deployment
    app.post<{ Params: { id: string } }>('/:id/stop', async (request, reply) => {
        const { id } = request.params;
        const user = request.user as any;

        const deployment = db.prepare(`
      SELECT d.*, p.user_id
      FROM deployments d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = ? AND p.user_id = ?
    `).get(id, user.id) as any;

        if (!deployment) {
            return reply.status(404).send({ error: 'Deployment not found' });
        }

        // TODO: Stop the container via deployer service

        db.prepare("UPDATE deployments SET status = 'stopped' WHERE id = ?").run(id);

        return { success: true, message: 'Deployment stopped' };
    });

    // Restart a deployment
    app.post<{ Params: { id: string } }>('/:id/restart', async (request, reply) => {
        const { id } = request.params;
        const user = request.user as any;

        const deployment = db.prepare(`
      SELECT d.*, p.user_id
      FROM deployments d
      JOIN projects p ON d.project_id = p.id
      WHERE d.id = ? AND p.user_id = ?
    `).get(id, user.id) as any;

        if (!deployment) {
            return reply.status(404).send({ error: 'Deployment not found' });
        }

        // TODO: Restart the container via deployer service

        db.prepare("UPDATE deployments SET status = 'running' WHERE id = ?").run(id);

        return { success: true, message: 'Deployment restarted' };
    });
}
