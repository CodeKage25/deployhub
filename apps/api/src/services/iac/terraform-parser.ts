/**
 * Terraform HCL Parser
 * 
 * Parses Terraform configuration files and extracts resources,
 * variables, outputs, and their relationships.
 */

interface TerraformResource {
    type: string;
    name: string;
    provider: string;
    attributes: Record<string, any>;
    dependencies: string[];
}

interface TerraformVariable {
    name: string;
    type?: string;
    default?: any;
    description?: string;
}

interface TerraformOutput {
    name: string;
    value: string;
    description?: string;
}

interface ParsedTerraform {
    resources: TerraformResource[];
    variables: TerraformVariable[];
    outputs: TerraformOutput[];
    providers: string[];
}

// Simple HCL-like parser for common Terraform patterns
export function parseTerraform(content: string): ParsedTerraform {
    const resources: TerraformResource[] = [];
    const variables: TerraformVariable[] = [];
    const outputs: TerraformOutput[] = [];
    const providers = new Set<string>();

    // Remove comments
    const cleanContent = content
        .replace(/#.*$/gm, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');

    // Parse resource blocks
    const resourceRegex = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
    let match;

    while ((match = resourceRegex.exec(cleanContent)) !== null) {
        const [, resourceType, resourceName, body] = match;
        const provider = resourceType.split('_')[0];
        providers.add(provider);

        // Extract dependencies from references
        const dependencies = extractDependencies(body);

        // Parse attributes
        const attributes = parseAttributes(body);

        resources.push({
            type: resourceType,
            name: resourceName,
            provider,
            attributes,
            dependencies,
        });
    }

    // Parse data sources (treat as resources)
    const dataRegex = /data\s+"([^"]+)"\s+"([^"]+)"\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;

    while ((match = dataRegex.exec(cleanContent)) !== null) {
        const [, resourceType, resourceName, body] = match;
        const provider = resourceType.split('_')[0];
        providers.add(provider);

        resources.push({
            type: `data.${resourceType}`,
            name: resourceName,
            provider,
            attributes: parseAttributes(body),
            dependencies: extractDependencies(body),
        });
    }

    // Parse variables
    const variableRegex = /variable\s+"([^"]+)"\s*\{([^}]*)\}/g;

    while ((match = variableRegex.exec(cleanContent)) !== null) {
        const [, varName, body] = match;
        const attrs = parseAttributes(body);

        variables.push({
            name: varName,
            type: attrs.type,
            default: attrs.default,
            description: attrs.description,
        });
    }

    // Parse outputs
    const outputRegex = /output\s+"([^"]+)"\s*\{([^}]*)\}/g;

    while ((match = outputRegex.exec(cleanContent)) !== null) {
        const [, outputName, body] = match;
        const attrs = parseAttributes(body);

        outputs.push({
            name: outputName,
            value: attrs.value || '',
            description: attrs.description,
        });
    }

    return {
        resources,
        variables,
        outputs,
        providers: Array.from(providers),
    };
}

function extractDependencies(body: string): string[] {
    const deps: string[] = [];

    // Match resource references like: aws_instance.example, module.vpc.id
    const refRegex = /(?:aws|google|azurerm|kubernetes|helm|docker|null|random|local|vault|consul)_[a-z_]+\.[a-z0-9_]+/gi;
    const matches = body.match(refRegex) || [];

    for (const ref of matches) {
        const normalized = ref.toLowerCase();
        if (!deps.includes(normalized)) {
            deps.push(normalized);
        }
    }

    // Match explicit depends_on
    const dependsOnMatch = body.match(/depends_on\s*=\s*\[([^\]]+)\]/);
    if (dependsOnMatch) {
        const explicitDeps = dependsOnMatch[1]
            .split(',')
            .map(d => d.trim().replace(/[\[\]"]/g, ''))
            .filter(Boolean);

        for (const dep of explicitDeps) {
            if (!deps.includes(dep.toLowerCase())) {
                deps.push(dep.toLowerCase());
            }
        }
    }

    return deps;
}

function parseAttributes(body: string): Record<string, any> {
    const attrs: Record<string, any> = {};

    // Simple key = value parsing
    const attrRegex = /^\s*([a-z_]+)\s*=\s*(.+)$/gm;
    let match;

    while ((match = attrRegex.exec(body)) !== null) {
        const [, key, rawValue] = match;
        let value = rawValue.trim();

        // Parse strings
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        // Parse booleans
        else if (value === 'true') {
            value = true as any;
        } else if (value === 'false') {
            value = false as any;
        }
        // Parse numbers
        else if (/^\d+$/.test(value)) {
            value = parseInt(value, 10) as any;
        }

        attrs[key] = value;
    }

    return attrs;
}

// Icon mapping for AWS resources
export const awsResourceIcons: Record<string, string> = {
    aws_instance: '🖥️',
    aws_vpc: '🌐',
    aws_subnet: '📡',
    aws_security_group: '🔒',
    aws_s3_bucket: '🪣',
    aws_rds_instance: '🗄️',
    aws_lambda_function: 'λ',
    aws_api_gateway_rest_api: '🚪',
    aws_dynamodb_table: '📊',
    aws_ecs_cluster: '🐳',
    aws_ecs_service: '🚢',
    aws_alb: '⚖️',
    aws_route53_zone: '🌍',
    aws_cloudfront_distribution: '☁️',
    aws_sqs_queue: '📬',
    aws_sns_topic: '📢',
    aws_iam_role: '👤',
    aws_iam_policy: '📜',
};

// Color mapping for providers
export const providerColors: Record<string, string> = {
    aws: '#FF9900',
    google: '#4285F4',
    azurerm: '#0078D4',
    kubernetes: '#326CE5',
    docker: '#2496ED',
    default: '#6B7280',
};
