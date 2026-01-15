/**
 * Diagram Generator
 * 
 * Converts parsed IaC resources into React Flow compatible
 * nodes and edges with automatic layout.
 */

import { awsResourceIcons, providerColors } from './terraform-parser.js';
import { cfnResourceIcons, getCfnServiceCategory } from './cloudformation-parser.js';

interface DiagramNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
        label: string;
        resourceType: string;
        icon: string;
        category: string;
        color: string;
        attributes?: Record<string, any>;
    };
}

interface DiagramEdge {
    id: string;
    source: string;
    target: string;
    animated?: boolean;
    style?: { stroke: string };
}

interface DiagramData {
    nodes: DiagramNode[];
    edges: DiagramEdge[];
}

interface ParsedResource {
    type: string;
    name?: string;
    logicalId?: string;
    provider?: string;
    dependencies: string[];
    attributes?: Record<string, any>;
    properties?: Record<string, any>;
}

interface ParsedIaC {
    resources: ParsedResource[];
    providers?: string[];
}

export function generateDiagram(parsed: ParsedIaC): DiagramData {
    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];
    const resourceMap = new Map<string, string>();

    // Create node ID mapping
    for (const resource of parsed.resources) {
        const id = resource.name
            ? `${resource.type}.${resource.name}`
            : resource.logicalId || resource.type;
        resourceMap.set(id.toLowerCase(), id);
    }

    // Calculate layout
    const layout = calculateLayout(parsed.resources);

    // Create nodes
    for (let i = 0; i < parsed.resources.length; i++) {
        const resource = parsed.resources[i];
        const id = resource.name
            ? `${resource.type}.${resource.name}`
            : resource.logicalId || `${resource.type}-${i}`;

        const isTerraform = !!resource.provider;
        const icon = getResourceIcon(resource.type, isTerraform);
        const category = getResourceCategory(resource.type, isTerraform);
        const color = getResourceColor(resource, isTerraform);

        nodes.push({
            id,
            type: 'resourceNode',
            position: layout[i],
            data: {
                label: resource.name || resource.logicalId || getShortType(resource.type),
                resourceType: resource.type,
                icon,
                category,
                color,
                attributes: resource.attributes || resource.properties,
            },
        });
    }

    // Create edges from dependencies
    for (const resource of parsed.resources) {
        const sourceId = resource.name
            ? `${resource.type}.${resource.name}`
            : resource.logicalId || resource.type;

        for (const dep of resource.dependencies) {
            // Find the target resource
            let targetId = resourceMap.get(dep.toLowerCase());

            if (!targetId) {
                // Try partial match
                for (const [key, value] of resourceMap.entries()) {
                    if (key.includes(dep.toLowerCase()) || dep.toLowerCase().includes(key)) {
                        targetId = value;
                        break;
                    }
                }
            }

            if (targetId && targetId !== sourceId) {
                edges.push({
                    id: `${sourceId}->${targetId}`,
                    source: targetId,
                    target: sourceId,
                    animated: true,
                    style: { stroke: '#6B7280' },
                });
            }
        }
    }

    // Remove duplicate edges
    const uniqueEdges = edges.filter((edge, index, self) =>
        index === self.findIndex(e => e.id === edge.id)
    );

    return { nodes, edges: uniqueEdges };
}

function calculateLayout(resources: ParsedResource[]): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];

    // Group resources by category
    const categories = new Map<string, number[]>();

    resources.forEach((resource, index) => {
        const isTerraform = !!resource.provider;
        const category = getResourceCategory(resource.type, isTerraform);

        if (!categories.has(category)) {
            categories.set(category, []);
        }
        categories.get(category)!.push(index);
    });

    // Layout parameters
    const nodeWidth = 200;
    const nodeHeight = 80;
    const horizontalGap = 80;
    const verticalGap = 60;
    const categoryGap = 120;

    let currentY = 50;

    // Layout each category in rows
    for (const [, indices] of categories) {
        const itemsPerRow = 4;
        let row = 0;
        let col = 0;

        for (const index of indices) {
            positions[index] = {
                x: 50 + col * (nodeWidth + horizontalGap),
                y: currentY + row * (nodeHeight + verticalGap),
            };

            col++;
            if (col >= itemsPerRow) {
                col = 0;
                row++;
            }
        }

        currentY += (row + 1) * (nodeHeight + verticalGap) + categoryGap;
    }

    return positions;
}

function getResourceIcon(resourceType: string, isTerraform: boolean): string {
    if (isTerraform) {
        // Terraform resource type (e.g., aws_instance)
        return awsResourceIcons[resourceType] || '📦';
    } else {
        // CloudFormation resource type (e.g., AWS::EC2::Instance)
        return cfnResourceIcons[resourceType] || '📦';
    }
}

function getResourceCategory(resourceType: string, isTerraform: boolean): string {
    if (isTerraform) {
        // Parse category from Terraform resource type
        const parts = resourceType.split('_');
        if (parts.length >= 2) {
            const service = parts[1];
            const categories: Record<string, string> = {
                instance: 'Compute',
                lambda: 'Compute',
                ecs: 'Containers',
                vpc: 'Networking',
                subnet: 'Networking',
                security: 'Security',
                s3: 'Storage',
                rds: 'Database',
                dynamodb: 'Database',
                iam: 'Security',
                api: 'API',
                sqs: 'Messaging',
                sns: 'Messaging',
            };
            return categories[service] || 'Other';
        }
        return 'Other';
    } else {
        return getCfnServiceCategory(resourceType);
    }
}

function getResourceColor(resource: ParsedResource, isTerraform: boolean): string {
    if (isTerraform && resource.provider) {
        return providerColors[resource.provider] || providerColors.default;
    }

    // CloudFormation - use AWS orange
    return '#FF9900';
}

function getShortType(resourceType: string): string {
    // Extract short name from resource type
    // AWS::EC2::Instance -> Instance
    // aws_instance -> instance
    const parts = resourceType.split(/[::_]/);
    return parts[parts.length - 1];
}
