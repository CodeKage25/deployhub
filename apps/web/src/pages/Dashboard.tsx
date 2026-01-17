import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus,
    Rocket,
    GitBranch,
    ExternalLink,
    Loader2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Box,
    FolderKanban,
    Clock
} from 'lucide-react';
import { projects, deployments } from '../api';
import { useAuthStore } from '../hooks/useAuth';
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

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function Dashboard() {
    const { user } = useAuthStore();
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
                        Building
                    </span>
                );
            case 'failed':
                return (
                    <span className="status-badge status-failed">
                        <XCircle size={12} />
                        Failed
                    </span>
                );
            default:
                return (
                    <span className="status-badge status-idle">
                        <Clock size={12} />
                        Not deployed
                    </span>
                );
        }
    };

    // Stats
    const runningProjects = projectList.filter(p => p.latest_status === 'running').length;
    const totalDeployments = projectList.reduce((acc, p) => acc + p.deployment_count, 0);

    if (loading) {
        return (
            <div className="page-loading">
                <Loader2 size={40} className="spin" />
                <p>Loading your projects...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            {/* Top Bar */}
            <header className="page-header">
                <div className="header-left">
                    <h1>Dashboard</h1>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewProject(true)}>
                    <Plus size={16} />
                    New Project
                </button>
            </header>

            <div className="page-content">
                {/* Greeting */}
                <div className="greeting">
                    <h2>{getGreeting()}, {user?.email?.split('@')[0] || 'Developer'}</h2>
                    <p>What are you deploying today?</p>
                </div>

                {error && (
                    <div className="error-banner">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {/* Stats Grid */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FolderKanban size={20} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">My Projects</span>
                            <span className="stat-value">{projectList.length}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <CheckCircle2 size={20} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">Running</span>
                            <span className="stat-value">{runningProjects}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <Rocket size={20} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">Total Deploys</span>
                            <span className="stat-value">{totalDeployments}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">
                            <Clock size={20} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">Build Minutes</span>
                            <span className="stat-value">{Math.floor(totalDeployments * 2.5)}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Action Banner */}
                <div className="action-banner">
                    <div className="banner-content">
                        <h3>Connect Your <span className="highlight">Git Repository</span></h3>
                        <p>Push to your repo and we'll automatically build and deploy.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowNewProject(true)}>
                        <Plus size={18} />
                        New Project
                    </button>
                </div>

                {/* Recently Deployed */}
                <section className="section">
                    <h3>Recently Deployed</h3>

                    {projectList.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <Rocket size={40} />
                            </div>
                            <h4>No projects yet</h4>
                            <p>Create your first project to start deploying</p>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowNewProject(true)}
                            >
                                <Plus size={18} />
                                Create Project
                            </button>
                        </div>
                    ) : (
                        <div className="projects-grid">
                            {projectList.map((project) => (
                                <div
                                    key={project.id}
                                    className={`project-card ${project.latest_status === 'running' ? 'is-running' :
                                            ['building', 'deploying'].includes(project.latest_status || '') ? 'is-building' : ''
                                        }`}
                                >
                                    <div className="project-header">
                                        <h4>{project.name}</h4>
                                        {getStatusBadge(project.latest_status)}
                                    </div>

                                    <div className="project-meta">
                                        <span className="meta-item">
                                            <GitBranch size={14} />
                                            {project.branch}
                                        </span>
                                        <span className="meta-item">
                                            <Rocket size={14} />
                                            {project.deployment_count} deploys
                                        </span>
                                    </div>

                                    <p className="project-repo">{project.repo_url}</p>

                                    {project.buildpack && (
                                        <span className="buildpack-badge">
                                            <Box size={12} />
                                            {project.buildpack}
                                        </span>
                                    )}

                                    <div className="project-actions">
                                        <Link to={`/projects/${project.id}`} className="btn btn-secondary btn-sm">
                                            <ExternalLink size={14} />
                                            Details
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
                    )}
                </section>
            </div>

            {/* New Project Modal */}
            {showNewProject && (
                <NewProjectModal
                    onClose={() => setShowNewProject(false)}
                    onCreated={() => {
                        setShowNewProject(false);
                        loadProjects();
                    }}
                />
            )}
        </div>
    );
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [name, setName] = useState('');
    const [repoUrl, setRepoUrl] = useState('');
    const [branch, setBranch] = useState('main');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setCreating(true);

        try {
            await projects.create({ name, repo_url: repoUrl, branch });
            onCreated();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>New Project</h2>
                <p className="modal-subtitle">Connect a Git repository to deploy</p>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="form-error">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label>Project Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="my-awesome-app"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Repository URL</label>
                        <input
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/user/repo"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Branch</label>
                        <input
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            placeholder="main"
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={creating}>
                            {creating ? (
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
