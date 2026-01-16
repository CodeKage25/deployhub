import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Rocket,
    GitBranch,
    ExternalLink,
    Trash2,
    RefreshCw,
    Loader2,
    Clock,
    Check,
    X,
    Plus,
    Settings,
    Eye,
    EyeOff,
    Save
} from 'lucide-react';
import { projects, deployments } from '../api';
import './ProjectDetails.css';

interface Deployment {
    id: string;
    status: string;
    docker_image: string | null;
    container_id: string | null;
    port: number | null;
    commit_sha: string | null;
    started_at: string;
    finished_at: string | null;
    logs: string;
}

interface Project {
    id: string;
    name: string;
    repo_url: string;
    branch: string;
    buildpack: string | null;
    envVars: Record<string, string>;
    deployments: Deployment[];
}

export default function ProjectDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
    const [logs, setLogs] = useState('');
    const [deploying, setDeploying] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Environment Variables state
    const [showEnvVars, setShowEnvVars] = useState(false);
    const [envVars, setEnvVars] = useState<Record<string, string>>({});
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const [savingEnv, setSavingEnv] = useState(false);
    const [showValues, setShowValues] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadProject();
    }, [id]);

    useEffect(() => {
        if (selectedDeployment) {
            loadLogs(selectedDeployment.id);
        }
    }, [selectedDeployment]);

    useEffect(() => {
        if (project) {
            setEnvVars(project.envVars || {});
        }
    }, [project]);

    const loadProject = async () => {
        try {
            const data = await projects.get(id!);
            setProject(data);
            if (data.deployments.length > 0) {
                setSelectedDeployment(data.deployments[0]);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadLogs = async (deploymentId: string) => {
        try {
            const data = await deployments.getLogs(deploymentId);
            setLogs(data.logs || '');
        } catch (err: any) {
            setLogs(`Failed to load logs: ${err.message}`);
        }
    };

    // Connect to WebSocket for real-time logs
    const connectWebSocket = useCallback((deploymentId: string) => {
        // Close existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws/logs/${deploymentId}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsStreaming(true);
            console.log('WebSocket connected for logs');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'log') {
                    setLogs(prev => prev + data.message + '\n');
                    // Auto-scroll to bottom
                    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                } else if (data.type === 'status') {
                    // Reload project to get updated deployment status
                    loadProject();
                }
            } catch {
                // Handle non-JSON messages
            }
        };

        ws.onclose = () => {
            setIsStreaming(false);
            console.log('WebSocket disconnected');
        };

        ws.onerror = () => {
            setIsStreaming(false);
        };

        return ws;
    }, []);

    // Cleanup WebSocket on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const handleDeploy = async () => {
        setDeploying(true);
        setLogs(''); // Clear previous logs
        try {
            const deployment = await deployments.trigger(project!.id);

            // Connect WebSocket for real-time logs
            connectWebSocket(deployment.id);

            // Select the new deployment
            await loadProject();

            // The WebSocket will handle streaming logs in real-time
        } catch (err: any) {
            alert(`Failed to deploy: ${err.message}`);
            setDeploying(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this project?')) return;

        try {
            await projects.delete(project!.id);
            navigate('/dashboard');
        } catch (err: any) {
            alert(`Failed to delete: ${err.message}`);
        }
    };

    const handleAddEnvVar = () => {
        if (!newKey.trim()) return;
        setEnvVars({ ...envVars, [newKey.trim()]: newValue });
        setNewKey('');
        setNewValue('');
    };

    const handleRemoveEnvVar = (key: string) => {
        const updated = { ...envVars };
        delete updated[key];
        setEnvVars(updated);
    };

    const handleSaveEnvVars = async () => {
        setSavingEnv(true);
        try {
            await projects.update(project!.id, { envVars });
            setProject({ ...project!, envVars });
            alert('Environment variables saved! Redeploy to apply changes.');
        } catch (err: any) {
            alert(`Failed to save: ${err.message}`);
        } finally {
            setSavingEnv(false);
        }
    };

    const toggleShowValue = (key: string) => {
        setShowValues({ ...showValues, [key]: !showValues[key] });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'running':
                return <Check size={14} className="status-icon success" />;
            case 'building':
            case 'deploying':
                return <Loader2 size={14} className="status-icon warning spin" />;
            case 'failed':
                return <X size={14} className="status-icon error" />;
            default:
                return <Clock size={14} className="status-icon" />;
        }
    };

    if (loading) {
        return (
            <div className="project-loading">
                <Loader2 className="spin" size={32} />
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="project-error">
                <p>{error || 'Project not found'}</p>
                <Link to="/dashboard" className="btn btn-secondary">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="project-details">
            <header className="project-header">
                <div className="project-header-left">
                    <Link to="/dashboard" className="back-link">
                        <ArrowLeft size={18} />
                        Back
                    </Link>
                    <h1>{project.name}</h1>
                    <div className="project-meta">
                        <span className="meta-item">
                            <GitBranch size={14} />
                            {project.branch}
                        </span>
                        {project.buildpack && (
                            <span className="meta-item buildpack">{project.buildpack}</span>
                        )}
                    </div>
                </div>

                <div className="project-actions">
                    <button
                        className={`btn btn-secondary ${showEnvVars ? 'active' : ''}`}
                        onClick={() => setShowEnvVars(!showEnvVars)}
                        title="Environment Variables"
                    >
                        <Settings size={16} />
                        Env Vars
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleDeploy}
                        disabled={deploying}
                    >
                        {deploying ? <Loader2 size={16} className="spin" /> : <Rocket size={16} />}
                        {deploying ? 'Deploying...' : 'Deploy'}
                    </button>
                    <button className="btn btn-secondary btn-icon" onClick={handleDelete} title="Delete project">
                        <Trash2 size={16} />
                    </button>
                </div>
            </header>

            {/* Environment Variables Panel */}
            {showEnvVars && (
                <div className="env-vars-panel">
                    <div className="env-vars-header">
                        <h3>
                            <Settings size={18} />
                            Environment Variables
                        </h3>
                        <p>These will be available to your app at runtime. Redeploy after making changes.</p>
                    </div>

                    <div className="env-vars-list">
                        {Object.entries(envVars).map(([key, value]) => (
                            <div key={key} className="env-var-item">
                                <span className="env-key">{key}</span>
                                <div className="env-value-container">
                                    <input
                                        type={showValues[key] ? 'text' : 'password'}
                                        value={value}
                                        onChange={(e) => setEnvVars({ ...envVars, [key]: e.target.value })}
                                        className="env-value-input"
                                    />
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => toggleShowValue(key)}
                                        title={showValues[key] ? 'Hide' : 'Show'}
                                    >
                                        {showValues[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                <button
                                    className="btn btn-ghost btn-sm btn-danger"
                                    onClick={() => handleRemoveEnvVar(key)}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}

                        {Object.keys(envVars).length === 0 && (
                            <p className="no-env-vars">No environment variables set</p>
                        )}
                    </div>

                    <div className="env-var-add">
                        <input
                            type="text"
                            placeholder="KEY"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                            className="env-key-input"
                        />
                        <input
                            type="text"
                            placeholder="value"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="env-value-input"
                        />
                        <button
                            className="btn btn-secondary"
                            onClick={handleAddEnvVar}
                            disabled={!newKey.trim()}
                        >
                            <Plus size={14} />
                            Add
                        </button>
                    </div>

                    <div className="env-var-actions">
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveEnvVars}
                            disabled={savingEnv}
                        >
                            {savingEnv ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                            {savingEnv ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}

            <div className="project-content">
                {/* Deployments List */}
                <aside className="deployments-list">
                    <h3>Deployments</h3>
                    {project.deployments.length === 0 ? (
                        <p className="no-deployments">No deployments yet</p>
                    ) : (
                        <div className="deployment-items">
                            {project.deployments.map((deployment) => (
                                <button
                                    key={deployment.id}
                                    className={`deployment-item ${selectedDeployment?.id === deployment.id ? 'active' : ''}`}
                                    onClick={() => setSelectedDeployment(deployment)}
                                >
                                    {getStatusIcon(deployment.status)}
                                    <div className="deployment-info">
                                        <span className="deployment-id">{deployment.id.slice(0, 8)}</span>
                                        <span className="deployment-time">
                                            {new Date(deployment.started_at).toLocaleString()}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </aside>

                {/* Deployment Details */}
                <main className="deployment-details">
                    {selectedDeployment ? (
                        <>
                            <div className="deployment-header">
                                <h3>Deployment {selectedDeployment.id.slice(0, 8)}</h3>
                                <span className={`badge badge-${selectedDeployment.status === 'running' ? 'success' : selectedDeployment.status === 'failed' ? 'error' : 'warning'}`}>
                                    {selectedDeployment.status}
                                </span>
                            </div>

                            {selectedDeployment.port && (
                                <div className="deployment-url">
                                    <a
                                        href={`http://localhost:${selectedDeployment.port}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        http://localhost:{selectedDeployment.port}
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            )}

                            <div className="deployment-logs">
                                <div className="logs-header">
                                    <h4>
                                        Build Logs
                                        {isStreaming && (
                                            <span className="streaming-indicator">
                                                <span className="streaming-dot"></span>
                                                Live
                                            </span>
                                        )}
                                    </h4>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => loadLogs(selectedDeployment.id)}
                                    >
                                        <RefreshCw size={14} />
                                        Refresh
                                    </button>
                                </div>
                                <pre className="logs-content">
                                    {logs || 'No logs available'}
                                    <div ref={logsEndRef} />
                                </pre>
                            </div>
                        </>
                    ) : (
                        <div className="no-selection">
                            <p>Select a deployment to view details</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
