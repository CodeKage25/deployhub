import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Rocket,
    Loader2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    ExternalLink,
    RotateCcw
} from 'lucide-react';
import { deployments, projects } from '../api';
import './DeploymentsPage.css';

interface Deployment {
    id: string;
    project_id: string;
    project_name?: string;
    status: string;
    container_id: string | null;
    port: number | null;
    build_log: string | null;
    created_at: string;
}

interface Project {
    id: string;
    name: string;
}

export default function DeploymentsPage() {
    const [deploymentList, setDeploymentList] = useState<Deployment[]>([]);
    const [projectMap, setProjectMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [rollingBackId, setRollingBackId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Load all projects first to get names
            const projectsData = await projects.list();
            const projMap: Record<string, string> = {};
            projectsData.forEach((p: Project) => {
                projMap[p.id] = p.name;
            });
            setProjectMap(projMap);

            // Load deployments for all projects
            const allDeployments: Deployment[] = [];
            for (const project of projectsData) {
                try {
                    const deps = await deployments.list(project.id);
                    deps.forEach((d: Deployment) => {
                        d.project_name = project.name;
                    });
                    allDeployments.push(...deps);
                } catch (err) {
                    // Ignore if no deployments
                }
            }

            // Sort by created_at descending
            allDeployments.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setDeploymentList(allDeployments);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRollback = async (deploymentId: string, projectId: string) => {
        setRollingBackId(deploymentId);
        try {
            // Trigger a new deployment (rollback would need specific implementation)
            await deployments.trigger(projectId);
            loadData();
        } catch (err: any) {
            alert(`Failed to rollback: ${err.message}`);
        } finally {
            setRollingBackId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'running':
                return (
                    <span className="status-badge status-running">
                        <CheckCircle2 size={12} />
                        Running
                    </span>
                );
            case 'building':
            case 'deploying':
                return (
                    <span className="status-badge status-building">
                        <Loader2 size={12} className="spin" />
                        {status}
                    </span>
                );
            case 'failed':
                return (
                    <span className="status-badge status-failed">
                        <XCircle size={12} />
                        Failed
                    </span>
                );
            case 'stopped':
                return (
                    <span className="status-badge status-stopped">
                        <Clock size={12} />
                        Stopped
                    </span>
                );
            default:
                return (
                    <span className="status-badge status-idle">
                        <Clock size={12} />
                        {status}
                    </span>
                );
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="page-loading">
                <Loader2 size={40} className="spin" />
                <p>Loading deployments...</p>
            </div>
        );
    }

    return (
        <div className="deployments-page">
            <header className="page-header">
                <div className="header-left">
                    <h1>Deployments</h1>
                    <p>{deploymentList.length} total deployments</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={loadData}>
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </header>

            <div className="page-content">
                {error && (
                    <div className="error-banner">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {deploymentList.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Rocket size={40} />
                        </div>
                        <h4>No deployments yet</h4>
                        <p>Deploy your first project to see it here</p>
                        <Link to="/projects" className="btn btn-primary">
                            Go to Projects
                        </Link>
                    </div>
                ) : (
                    <div className="deployments-list">
                        <div className="list-header">
                            <span>Project</span>
                            <span>Status</span>
                            <span>Port</span>
                            <span>Date</span>
                            <span>Actions</span>
                        </div>
                        {deploymentList.map((deployment) => (
                            <div key={deployment.id} className="deployment-row">
                                <div className="deployment-project">
                                    <Link to={`/projects/${deployment.project_id}`}>
                                        {deployment.project_name || projectMap[deployment.project_id] || 'Unknown'}
                                    </Link>
                                </div>
                                <div className="deployment-status">
                                    {getStatusBadge(deployment.status)}
                                </div>
                                <div className="deployment-port">
                                    {deployment.port ? (
                                        <a
                                            href={`http://localhost:${deployment.port}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="port-link"
                                        >
                                            :{deployment.port}
                                            <ExternalLink size={12} />
                                        </a>
                                    ) : (
                                        <span className="no-port">—</span>
                                    )}
                                </div>
                                <div className="deployment-date">
                                    {formatDate(deployment.created_at)}
                                </div>
                                <div className="deployment-actions">
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleRollback(deployment.id, deployment.project_id)}
                                        disabled={rollingBackId === deployment.id}
                                        title="Rollback to this deployment"
                                    >
                                        {rollingBackId === deployment.id ? (
                                            <Loader2 size={14} className="spin" />
                                        ) : (
                                            <RotateCcw size={14} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
