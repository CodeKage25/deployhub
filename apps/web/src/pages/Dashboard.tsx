import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus,
    Rocket,
    GitBranch,
    Clock,
    ExternalLink,
    Loader2,
    AlertCircle,
    Folder,
    Activity,
    CheckCircle2,
    XCircle,
    Layers,
    Box
} from 'lucide-react';
import { projects, deployments } from '../api';
import './Dashboard.css';

interface Project {
    id: string;
    name: string;
    repo_url: string;
    branch: string;
    buildpack: string | null;
    latest_status: string | null;
    deployment_count: number;
    created_at: string;
}

export default function Dashboard() {
    const [projectList, setProjectList] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showNewProject, setShowNewProject] = useState(false);
    const [deployingId, setDeployingId] = useState<string | null>(null);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await projects.list();
            setProjectList(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeploy = async (projectId: string) => {
        setDeployingId(projectId);
        try {
            await deployments.trigger(projectId);
            // Reload projects to get updated status
            loadProjects();
        } catch (err: any) {
            alert(`Failed to deploy: ${err.message}`);
        } finally {
            setDeployingId(null);
        }
    };

    const getStatusBadge = (status: string | null) => {
        switch (status) {
            case 'running':
                return (
                    <span className="badge badge-success">
                        <CheckCircle2 size={12} />
                        Running
                    </span>
                );
            case 'building':
            case 'deploying':
                return (
                    <span className="badge badge-warning">
                        <Loader2 size={12} className="spin" />
                        Building
                    </span>
                );
            case 'failed':
                return (
                    <span className="badge badge-error">
                        <XCircle size={12} />
                        Failed
                    </span>
                );
            default:
                return (
                    <span className="badge badge-neutral">
                        <Clock size={12} />
                        Not deployed
                    </span>
                );
        }
    };

    // Calculate stats
    const stats = {
        total: projectList.length,
        running: projectList.filter(p => p.latest_status === 'running').length,
        building: projectList.filter(p => ['building', 'deploying'].includes(p.latest_status || '')).length,
        failed: projectList.filter(p => p.latest_status === 'failed').length,
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner" />
                <p>Loading your projects...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            {/* Hero Header */}
            <div className="dashboard-hero">
                <header className="dashboard-header">
                    <div className="dashboard-header-content">
                        <h1>Your Projects</h1>
                        <p>Manage, deploy, and monitor your applications</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowNewProject(true)}
                    >
                        <Plus size={18} />
                        New Project
                    </button>
                </header>
            </div>

            {error && (
                <div className="dashboard-error">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* Stats Overview */}
            {projectList.length > 0 && (
                <div className="dashboard-stats">
                    <div className="stat-card">
                        <div className="stat-icon primary">
                            <Folder size={22} />
                        </div>
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Projects</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon success">
                            <Activity size={22} />
                        </div>
                        <div className="stat-value">{stats.running}</div>
                        <div className="stat-label">Running</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon warning">
                            <Loader2 size={22} />
                        </div>
                        <div className="stat-value">{stats.building}</div>
                        <div className="stat-label">Building</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon error">
                            <XCircle size={22} />
                        </div>
                        <div className="stat-value">{stats.failed}</div>
                        <div className="stat-label">Failed</div>
                    </div>
                </div>
            )}

            {showNewProject && (
                <NewProjectModal
                    onClose={() => setShowNewProject(false)}
                    onCreated={() => {
                        setShowNewProject(false);
                        loadProjects();
                    }}
                />
            )}

            {projectList.length === 0 ? (
                <div className="dashboard-empty">
                    <div className="empty-icon">
                        <Rocket size={36} />
                    </div>
                    <h2>No projects yet</h2>
                    <p>Create your first project to start deploying your code with a single click</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowNewProject(true)}
                    >
                        <Plus size={18} />
                        Create Your First Project
                    </button>
                </div>
            ) : (
                <>
                    <div className="section-header">
                        <h2>
                            <Layers size={20} />
                            All Projects
                        </h2>
                    </div>
                    <div className="projects-grid">
                        {projectList.map((project) => (
                            <div key={project.id} className="project-card">
                                <div className="project-header">
                                    <div className="project-info">
                                        <h3>{project.name}</h3>
                                    </div>
                                    {getStatusBadge(project.latest_status)}
                                </div>

                                <div className="project-meta">
                                    <div className="project-meta-item">
                                        <GitBranch size={14} />
                                        <span>{project.branch}</span>
                                    </div>
                                    <div className="project-meta-item">
                                        <Rocket size={14} />
                                        <span>{project.deployment_count} deploys</span>
                                    </div>
                                </div>

                                <div className="project-repo">{project.repo_url}</div>

                                {project.buildpack && (
                                    <div className="project-buildpack">
                                        <Box size={14} />
                                        {project.buildpack}
                                    </div>
                                )}

                                <div className="project-actions">
                                    <Link to={`/projects/${project.id}`} className="btn btn-secondary btn-sm">
                                        <ExternalLink size={14} />
                                        View Details
                                    </Link>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleDeploy(project.id)}
                                        disabled={deployingId === project.id}
                                    >
                                        {deployingId === project.id ? (
                                            <>
                                                <Loader2 size={14} className="spin" />
                                                Deploying...
                                            </>
                                        ) : (
                                            <>
                                                <Rocket size={14} />
                                                Deploy
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// New Project Modal Component
function NewProjectModal({
    onClose,
    onCreated
}: {
    onClose: () => void;
    onCreated: () => void;
}) {
    const [name, setName] = useState('');
    const [repoUrl, setRepoUrl] = useState('');
    const [branch, setBranch] = useState('main');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await projects.create({ name, repoUrl, branch });
            onCreated();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>Create New Project</h2>
                <p className="modal-description">
                    Connect a Git repository to deploy your application
                </p>

                <form onSubmit={handleSubmit}>
                    {error && <div className="dashboard-error"><AlertCircle size={16} />{error}</div>}

                    <div className="form-group">
                        <label htmlFor="project-name">Project Name</label>
                        <input
                            id="project-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="my-awesome-app"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="repo-url">Repository URL</label>
                        <input
                            id="repo-url"
                            type="url"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/username/repo"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="branch">Branch</label>
                        <input
                            id="branch"
                            type="text"
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            placeholder="main"
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus size={16} />
                                    Create Project
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
