import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import db from '../db/index.js';
import { triggerBuild } from '../services/builder/index.js';

interface GitHubPushPayload {
    ref: string;
    repository: {
        clone_url: string;
        html_url: string;
        full_name: string;
    };
    head_commit: {
        id: string;
        message: string;
    };
}

function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

export default async function webhookRoutes(app: FastifyInstance) {
    // GitHub webhook
    app.post<{ Body: GitHubPushPayload }>('/github', {
        config: {
            rawBody: true,
        },
    }, async (request, reply) => {
        const event = request.headers['x-github-event'] as string;
        const signature = request.headers['x-hub-signature-256'] as string;

        // Only process push events
        if (event !== 'push') {
            return { message: `Ignored event: ${event}` };
        }

        const payload = request.body;
        const branch = payload.ref.replace('refs/heads/', '');
        const repoUrl = payload.repository.html_url;

        // Find matching project
        const project = db.prepare(`
      SELECT * FROM projects 
      WHERE repo_url LIKE ? AND branch = ?
    `).get(`%${payload.repository.full_name}%`, branch) as any;

        if (!project) {
            app.log.info(`No project found for ${repoUrl} branch ${branch}`);
            return { message: 'No matching project found' };
        }

        // Verify signature if webhook secret is configured
        const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
        if (webhookSecret && signature) {
            const rawBody = JSON.stringify(request.body);
            if (!verifyGitHubSignature(rawBody, signature, webhookSecret)) {
                return reply.status(401).send({ error: 'Invalid signature' });
            }
        }

        app.log.info(`Triggering build for project ${project.name} from GitHub push`);

        // Trigger build with commit info
        const deployment = await triggerBuild(project, {
            commitSha: payload.head_commit.id,
            commitMessage: payload.head_commit.message,
        });

        return {
            message: 'Build triggered',
            deploymentId: deployment.id,
            project: project.name,
        };
    });

    // GitLab webhook
    app.post('/gitlab', async (request, reply) => {
        const event = request.headers['x-gitlab-event'] as string;
        const token = request.headers['x-gitlab-token'] as string;

        // Verify token if configured
        const gitlabToken = process.env.GITLAB_WEBHOOK_TOKEN;
        if (gitlabToken && token !== gitlabToken) {
            return reply.status(401).send({ error: 'Invalid token' });
        }

        // Only process push events
        if (event !== 'Push Hook') {
            return { message: `Ignored event: ${event}` };
        }

        const payload = request.body as any;
        const branch = payload.ref.replace('refs/heads/', '');
        const repoUrl = payload.repository.homepage;

        // Find matching project
        const project = db.prepare(`
      SELECT * FROM projects 
      WHERE repo_url LIKE ? AND branch = ?
    `).get(`%${payload.project.path_with_namespace}%`, branch) as any;

        if (!project) {
            return { message: 'No matching project found' };
        }

        // Trigger build
        const deployment = await triggerBuild(project, {
            commitSha: payload.checkout_sha,
            commitMessage: payload.commits?.[0]?.message || '',
        });

        return {
            message: 'Build triggered',
            deploymentId: deployment.id,
            project: project.name,
        };
    });

    // Manual trigger endpoint (for testing)
    app.post<{ Params: { projectId: string } }>('/manual/:projectId', {
        preHandler: [(app as any).authenticate],
    }, async (request, reply) => {
        const { projectId } = request.params;
        const user = request.user as any;

        const project = db.prepare(
            'SELECT * FROM projects WHERE id = ? AND user_id = ?'
        ).get(projectId, user.id) as any;

        if (!project) {
            return reply.status(404).send({ error: 'Project not found' });
        }

        const deployment = await triggerBuild(project);

        return {
            message: 'Manual build triggered',
            deploymentId: deployment.id,
        };
    });
}
