import { useState, useCallback, useEffect } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Node,
    Edge,
    Connection,
    BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Upload, FileCode, Loader2, Trash2, Save } from 'lucide-react';
import { iac } from '../api';
import ResourceNode from '../components/ResourceNode';
import './IacVisualizer.css';

const nodeTypes = {
    resourceNode: ResourceNode,
};

interface Diagram {
    id: string;
    name: string;
    source_type: string;
    created_at: string;
}

export default function IacVisualizer() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [diagrams, setDiagrams] = useState<Diagram[]>([]);
    const [currentDiagram, setCurrentDiagram] = useState<string | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadDiagrams();
    }, []);

    const loadDiagrams = async () => {
        try {
            const data = await iac.listDiagrams();
            setDiagrams(data);
        } catch (err) {
            console.error('Failed to load diagrams:', err);
        }
    };

    const loadDiagram = async (id: string) => {
        setLoading(true);
        try {
            const data = await iac.getDiagram(id);
            setCurrentDiagram(id);

            // Apply custom node type
            const nodesWithType = data.layout.nodes?.map((node: any) => ({
                ...node,
                type: 'resourceNode',
            })) || [];

            setNodes(nodesWithType);
            setEdges(data.layout.edges || []);
        } catch (err) {
            console.error('Failed to load diagram:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDiagram = async (id: string) => {
        if (!confirm('Delete this diagram?')) return;

        try {
            await iac.deleteDiagram(id);
            if (currentDiagram === id) {
                setCurrentDiagram(null);
                setNodes([]);
                setEdges([]);
            }
            loadDiagrams();
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const handleSaveLayout = async () => {
        if (!currentDiagram) return;

        try {
            await iac.updateDiagram(currentDiagram, {
                layout: { nodes, edges },
            });
        } catch (err) {
            console.error('Failed to save layout:', err);
        }
    };

    return (
        <div className="iac-visualizer">
            <header className="iac-header">
                <div>
                    <h1>IaC Visualizer</h1>
                    <p>Visualize your Terraform and CloudFormation infrastructure</p>
                </div>
                <div className="iac-actions">
                    {currentDiagram && (
                        <button className="btn btn-secondary" onClick={handleSaveLayout}>
                            <Save size={16} />
                            Save Layout
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                        <Upload size={16} />
                        Upload IaC
                    </button>
                </div>
            </header>

            <div className="iac-content">
                {/* Sidebar with diagrams list */}
                <aside className="iac-sidebar">
                    <h3>Saved Diagrams</h3>
                    {diagrams.length === 0 ? (
                        <p className="no-diagrams">No diagrams yet</p>
                    ) : (
                        <div className="diagram-list">
                            {diagrams.map((diagram) => (
                                <div
                                    key={diagram.id}
                                    className={`diagram-item ${currentDiagram === diagram.id ? 'active' : ''}`}
                                >
                                    <button
                                        className="diagram-btn"
                                        onClick={() => loadDiagram(diagram.id)}
                                    >
                                        <FileCode size={16} />
                                        <div className="diagram-info">
                                            <span className="diagram-name">{diagram.name}</span>
                                            <span className="diagram-type">{diagram.source_type}</span>
                                        </div>
                                    </button>
                                    <button
                                        className="diagram-delete"
                                        onClick={() => handleDeleteDiagram(diagram.id)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </aside>

                {/* Canvas */}
                <main className="iac-canvas">
                    {loading ? (
                        <div className="canvas-loading">
                            <Loader2 className="spin" size={32} />
                        </div>
                    ) : nodes.length === 0 ? (
                        <div className="canvas-empty">
                            <FileCode size={48} />
                            <h2>No diagram loaded</h2>
                            <p>Upload a Terraform or CloudFormation file to visualize</p>
                        </div>
                    ) : (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            nodeTypes={nodeTypes}
                            fitView
                            className="iac-flow"
                        >
                            <Controls />
                            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                        </ReactFlow>
                    )}
                </main>
            </div>

            {/* Upload Modal */}
            {showUpload && (
                <UploadModal
                    onClose={() => setShowUpload(false)}
                    onUploaded={(data) => {
                        setShowUpload(false);
                        loadDiagrams();

                        // Load the new diagram
                        const nodesWithType = data.diagram.nodes?.map((node: any) => ({
                            ...node,
                            type: 'resourceNode',
                        })) || [];

                        setNodes(nodesWithType);
                        setEdges(data.diagram.edges || []);
                        setCurrentDiagram(data.id);
                    }}
                />
            )}
        </div>
    );
}

// Upload Modal
function UploadModal({
    onClose,
    onUploaded,
}: {
    onClose: () => void;
    onUploaded: (data: any) => void;
}) {
    const [name, setName] = useState('');
    const [sourceType, setSourceType] = useState<'terraform' | 'cloudformation'>('terraform');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setContent(event.target?.result as string);

            // Auto-detect type from extension
            if (file.name.endsWith('.tf')) {
                setSourceType('terraform');
            } else if (file.name.endsWith('.json') || file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
                setSourceType('cloudformation');
            }

            if (!name) {
                setName(file.name.replace(/\.[^.]+$/, ''));
            }
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await iac.parse({ name, sourceType, content });
            onUploaded(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                <h2>Upload IaC File</h2>

                <form onSubmit={handleSubmit}>
                    {error && <div className="auth-error">{error}</div>}

                    <div className="form-group">
                        <label>Diagram Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Infrastructure"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Source Type</label>
                        <select
                            value={sourceType}
                            onChange={(e) => setSourceType(e.target.value as any)}
                        >
                            <option value="terraform">Terraform (.tf)</option>
                            <option value="cloudformation">CloudFormation (JSON/YAML)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Upload File or Paste Content</label>
                        <input
                            type="file"
                            accept=".tf,.json,.yaml,.yml"
                            onChange={handleFileUpload}
                            className="file-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>IaC Content</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={sourceType === 'terraform'
                                ? 'resource "aws_instance" "example" {\n  ami = "ami-12345"\n  instance_type = "t2.micro"\n}'
                                : '{\n  "Resources": {\n    "MyInstance": {\n      "Type": "AWS::EC2::Instance"\n    }\n  }\n}'
                            }
                            rows={12}
                            required
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Parsing...' : 'Parse & Visualize'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
