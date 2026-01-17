import { useState, useCallback, useEffect } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Upload,
    FileCode,
    Loader2,
    Trash2,
    Save,
    AlertCircle
} from 'lucide-react';
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
        <div className="iac-page">
            {/* Header */}
            <header className="page-header">
                <div className="header-left">
                    <h1>IaC Visualizer</h1>
                    <p>Visualize Terraform and CloudFormation</p>
                </div>
                <div className="header-actions">
                    {currentDiagram && (
                        <button className="btn btn-secondary btn-sm" onClick={handleSaveLayout}>
                            <Save size={16} />
                            Save Layout
                        </button>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>
                        <Upload size={16} />
                        Upload IaC
                    </button>
                </div>
            </header>

            <div className="iac-content">
                {/* Saved Diagrams Panel */}
                <div className="diagrams-panel">
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
                </div>

                {/* Canvas */}
                <div className="canvas-wrapper">
                    {loading ? (
                        <div className="canvas-loading">
                            <Loader2 className="spin" size={32} />
                        </div>
                    ) : nodes.length === 0 ? (
                        <div className="canvas-empty">
                            <FileCode size={40} />
                            <h3>No diagram loaded</h3>
                            <p>Upload a Terraform or CloudFormation file</p>
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
                </div>
            </div>

            {/* Upload Modal */}
            {showUpload && (
                <UploadModal
                    onClose={() => setShowUpload(false)}
                    onUploaded={(data) => {
                        setShowUpload(false);
                        loadDiagrams();

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

            if (file.name.endsWith('.tf')) {
                setSourceType('terraform');
            } else if (file.name.endsWith('.json') || file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
                setSourceType('cloudformation');
            }

            if (!name) {
                setName(file.name.replace(/\.[^/.]+$/, ''));
            }
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await iac.parseDiagram({
                name,
                source_type: sourceType,
                content,
            });
            onUploaded(result);
        } catch (err: any) {
            setError(err.message || 'Failed to parse');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>Upload IaC File</h2>
                <p className="modal-subtitle">Upload Terraform (.tf) or CloudFormation (.json, .yaml)</p>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="form-error">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label>Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="my-infrastructure"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Type</label>
                        <select
                            value={sourceType}
                            onChange={(e) => setSourceType(e.target.value as any)}
                        >
                            <option value="terraform">Terraform</option>
                            <option value="cloudformation">CloudFormation</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>File</label>
                        <input
                            type="file"
                            accept=".tf,.json,.yaml,.yml"
                            onChange={handleFileUpload}
                        />
                    </div>

                    <div className="form-group">
                        <label>Or paste content</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Paste your IaC content here..."
                            rows={6}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading || !content}>
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="spin" />
                                    Parsing...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} />
                                    Parse & Visualize
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
