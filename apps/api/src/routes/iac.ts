import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import db from '../db/index.js';
import { parseTerraform } from '../services/iac/terraform-parser.js';
import { parseCloudFormation } from '../services/iac/cloudformation-parser.js';
import { generateDiagram } from '../services/iac/diagram-generator.js';

interface ParseIacBody {
    name: string;
    sourceType: 'terraform' | 'cloudformation';
    content: string;
}

interface UpdateDiagramBody {
    name?: string;
    layout?: object;
}

export default async function iacRoutes(app: FastifyInstance) {
    // All routes require authentication
    app.addHook('preHandler', (app as any).authenticate);

    // List all diagrams
    app.get('/diagrams', async (request) => {
        const user = request.user as any;

        const diagrams = db.prepare(`
      SELECT id, name, source_type, created_at, updated_at
      FROM iac_diagrams
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(user.id);

        return diagrams;
    });

    // Get single diagram with full data
    app.get<{ Params: { id: string } }>('/diagrams/:id', async (request, reply) => {
        const { id } = request.params;
        const user = request.user as any;

        const diagram = db.prepare(`
      SELECT * FROM iac_diagrams WHERE id = ? AND user_id = ?
    `).get(id, user.id) as any;

        if (!diagram) {
            return reply.status(404).send({ error: 'Diagram not found' });
        }

        return {
            ...diagram,
            parsedResources: JSON.parse(diagram.parsed_resources || '{}'),
            layout: JSON.parse(diagram.layout || '{}'),
        };
    });

    // Parse IaC and create diagram
    app.post<{ Body: ParseIacBody }>('/parse', async (request, reply) => {
        const user = request.user as any;
        const { name, sourceType, content } = request.body;

        if (!name || !sourceType || !content) {
            return reply.status(400).send({ error: 'Name, source type, and content required' });
        }

        let parsedResources;
        try {
            if (sourceType === 'terraform') {
                parsedResources = parseTerraform(content);
            } else if (sourceType === 'cloudformation') {
                parsedResources = parseCloudFormation(content);
            } else {
                return reply.status(400).send({ error: 'Invalid source type' });
            }
        } catch (error: any) {
            return reply.status(400).send({ error: `Parse error: ${error.message}` });
        }

        // Generate diagram layout
        const diagramData = generateDiagram(parsedResources);

        const id = nanoid();
        db.prepare(`
      INSERT INTO iac_diagrams (id, user_id, name, source_type, source_content, parsed_resources, layout)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
            id,
            user.id,
            name,
            sourceType,
            content,
            JSON.stringify(parsedResources),
            JSON.stringify(diagramData)
        );

        return {
            id,
            name,
            sourceType,
            parsedResources,
            diagram: diagramData,
        };
    });

    // Update diagram (name or layout)
    app.patch<{ Params: { id: string }; Body: UpdateDiagramBody }>(
        '/diagrams/:id',
        async (request, reply) => {
            const { id } = request.params;
            const user = request.user as any;
            const { name, layout } = request.body;

            const existing = db.prepare(
                'SELECT * FROM iac_diagrams WHERE id = ? AND user_id = ?'
            ).get(id, user.id);

            if (!existing) {
                return reply.status(404).send({ error: 'Diagram not found' });
            }

            const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
            const values: any[] = [];

            if (name) {
                updates.push('name = ?');
                values.push(name);
            }
            if (layout) {
                updates.push('layout = ?');
                values.push(JSON.stringify(layout));
            }

            values.push(id);
            db.prepare(`UPDATE iac_diagrams SET ${updates.join(', ')} WHERE id = ?`).run(...values);

            return { success: true };
        }
    );

    // Delete diagram
    app.delete<{ Params: { id: string } }>('/diagrams/:id', async (request, reply) => {
        const { id } = request.params;
        const user = request.user as any;

        const existing = db.prepare(
            'SELECT * FROM iac_diagrams WHERE id = ? AND user_id = ?'
        ).get(id, user.id);

        if (!existing) {
            return reply.status(404).send({ error: 'Diagram not found' });
        }

        db.prepare('DELETE FROM iac_diagrams WHERE id = ?').run(id);

        return { success: true };
    });
}
