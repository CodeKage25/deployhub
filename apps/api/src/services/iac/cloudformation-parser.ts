/**
 * CloudFormation Parser
 * 
 * Parses CloudFormation templates (JSON/YAML) and extracts resources,
 * parameters, outputs, and their relationships.
 */

import yaml from 'yaml';

interface CloudFormationResource {
    type: string;
    logicalId: string;
    properties: Record<string, any>;
    dependencies: string[];
}

interface CloudFormationParameter {
    name: string;
    type: string;
    default?: any;
    description?: string;
}

interface CloudFormationOutput {
    name: string;
    value: any;
    description?: string;
    exportName?: string;
}

interface ParsedCloudFormation {
    resources: CloudFormationResource[];
    parameters: CloudFormationParameter[];
    outputs: CloudFormationOutput[];
    description?: string;
}

export function parseCloudFormation(content: string): ParsedCloudFormation {
    let template: any;

    // Try parsing as JSON first, then YAML
    try {
        template = JSON.parse(content);
    } catch {
        try {
            template = yaml.parse(content);
        } catch (e) {
            throw new Error('Invalid CloudFormation template: not valid JSON or YAML');
        }
    }

    if (!template || typeof template !== 'object') {
        throw new Error('Invalid CloudFormation template structure');
    }

    const resources: CloudFormationResource[] = [];
    const parameters: CloudFormationParameter[] = [];
    const outputs: CloudFormationOutput[] = [];

    // Parse Resources
    if (template.Resources) {
        for (const [logicalId, resource] of Object.entries(template.Resources as Record<string, any>)) {
            const dependencies = extractCfnDependencies(resource, logicalId);

            resources.push({
                type: resource.Type,
                logicalId,
                properties: resource.Properties || {},
                dependencies,
            });
        }
    }

    // Parse Parameters
    if (template.Parameters) {
        for (const [name, param] of Object.entries(template.Parameters as Record<string, any>)) {
            parameters.push({
                name,
                type: param.Type,
                default: param.Default,
                description: param.Description,
            });
        }
    }

    // Parse Outputs
    if (template.Outputs) {
        for (const [name, output] of Object.entries(template.Outputs as Record<string, any>)) {
            outputs.push({
                name,
                value: output.Value,
                description: output.Description,
                exportName: output.Export?.Name,
            });
        }
    }

    return {
        resources,
        parameters,
        outputs,
        description: template.Description,
    };
}

function extractCfnDependencies(resource: any, selfId: string): string[] {
    const deps = new Set<string>();

    // Add explicit DependsOn
    if (resource.DependsOn) {
        const dependsOn = Array.isArray(resource.DependsOn)
            ? resource.DependsOn
            : [resource.DependsOn];
        dependsOn.forEach((d: string) => deps.add(d));
    }

    // Extract implicit dependencies from intrinsic functions
    extractRefs(resource, deps);

    // Remove self-reference
    deps.delete(selfId);

    return Array.from(deps);
}

function extractRefs(obj: any, deps: Set<string>): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
        obj.forEach((item) => extractRefs(item, deps));
        return;
    }

    // Check for intrinsic functions
    if (obj.Ref && typeof obj.Ref === 'string') {
        // Skip pseudo-parameters
        if (!obj.Ref.startsWith('AWS::')) {
            deps.add(obj.Ref);
        }
    }

    if (obj['Fn::GetAtt']) {
        const getAtt = obj['Fn::GetAtt'];
        if (Array.isArray(getAtt) && getAtt.length > 0) {
            deps.add(getAtt[0]);
        } else if (typeof getAtt === 'string') {
            deps.add(getAtt.split('.')[0]);
        }
    }

    if (obj['Fn::Sub']) {
        const sub = obj['Fn::Sub'];
        const template = Array.isArray(sub) ? sub[0] : sub;
        if (typeof template === 'string') {
            // Extract ${Resource.Attribute} references
            const matches = template.match(/\$\{([^.}]+)/g) || [];
            matches.forEach((m) => {
                const ref = m.slice(2); // Remove ${
                if (!ref.startsWith('AWS::')) {
                    deps.add(ref);
                }
            });
        }
    }

    // Recursively check nested objects
    for (const value of Object.values(obj)) {
        extractRefs(value, deps);
    }
}

// AWS CloudFormation resource type to icon mapping
export const cfnResourceIcons: Record<string, string> = {
    'AWS::EC2::Instance': '🖥️',
    'AWS::EC2::VPC': '🌐',
    'AWS::EC2::Subnet': '📡',
    'AWS::EC2::SecurityGroup': '🔒',
    'AWS::S3::Bucket': '🪣',
    'AWS::RDS::DBInstance': '🗄️',
    'AWS::Lambda::Function': 'λ',
    'AWS::ApiGateway::RestApi': '🚪',
    'AWS::DynamoDB::Table': '📊',
    'AWS::ECS::Cluster': '🐳',
    'AWS::ECS::Service': '🚢',
    'AWS::ElasticLoadBalancingV2::LoadBalancer': '⚖️',
    'AWS::Route53::HostedZone': '🌍',
    'AWS::CloudFront::Distribution': '☁️',
    'AWS::SQS::Queue': '📬',
    'AWS::SNS::Topic': '📢',
    'AWS::IAM::Role': '👤',
    'AWS::IAM::Policy': '📜',
    'AWS::CloudWatch::Alarm': '⏰',
    'AWS::Logs::LogGroup': '📋',
};

// Get service category from CFN resource type
export function getCfnServiceCategory(resourceType: string): string {
    const service = resourceType.split('::')[1] || 'Other';

    const categories: Record<string, string> = {
        EC2: 'Compute',
        Lambda: 'Compute',
        ECS: 'Containers',
        EKS: 'Containers',
        S3: 'Storage',
        DynamoDB: 'Database',
        RDS: 'Database',
        ElastiCache: 'Database',
        VPC: 'Networking',
        CloudFront: 'Networking',
        Route53: 'Networking',
        ElasticLoadBalancingV2: 'Networking',
        ApiGateway: 'API',
        SNS: 'Messaging',
        SQS: 'Messaging',
        IAM: 'Security',
        KMS: 'Security',
        CloudWatch: 'Monitoring',
        Logs: 'Monitoring',
    };

    return categories[service] || 'Other';
}
