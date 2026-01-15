import { Handle, Position } from '@xyflow/react';
import './ResourceNode.css';

interface ResourceNodeProps {
    data: {
        label: string;
        resourceType: string;
        icon: string;
        category: string;
        color: string;
        attributes?: Record<string, any>;
    };
}

export default function ResourceNode({ data }: ResourceNodeProps) {
    return (
        <div
            className="resource-node"
            style={{ '--node-color': data.color } as React.CSSProperties}
        >
            <Handle type="target" position={Position.Top} className="node-handle" />

            <div className="node-header">
                <span className="node-icon">{data.icon}</span>
                <span className="node-label">{data.label}</span>
            </div>

            <div className="node-type">{getShortType(data.resourceType)}</div>

            <div className="node-category">{data.category}</div>

            <Handle type="source" position={Position.Bottom} className="node-handle" />
        </div>
    );
}

function getShortType(resourceType: string): string {
    // Extract short name from resource type
    // AWS::EC2::Instance -> EC2 Instance
    // aws_instance -> Instance
    if (resourceType.includes('::')) {
        const parts = resourceType.split('::');
        return `${parts[1]} ${parts[2]}`;
    }

    const parts = resourceType.split('_');
    parts.shift(); // Remove provider prefix
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
