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
    Clock,
    Search
} from 'lucide-react';
import { projects, deployments } from '../api';
import './ProjectsPage.css';

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

export default function ProjectsPage() {
    const [projectList, setProjectList] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showNewProject, setShowNewProject] = useState(false);
    const [deployingId, setDeployingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredProjects = projectList.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.repo_url.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="page-loading">
                <Loader2 size={40} className="spin" />
                <p>Loading projects...</p>
            </div>
        );
    }

    return (
        <div className="projects-page">
            <header className="page-header">
                <div className="header-left">
                    <h1>Projects</h1>
                    <p>{projectList.length} total projects</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewProject(true)}>
                    <Plus size={16} />
                    New Project
                </button>
            </header>

            <div className="page-content">
                {error && (
                    <div className="error-banner">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {/* Search */}
                <div className="search-bar">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Projects List */}
                {filteredProjects.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Rocket size={40} />
                        </div>
                        <h4>{searchQuery ? 'No matching projects' : 'No projects yet'}</h4>
                        <p>{searchQuery ? 'Try a different search term' : 'Create your first project to get started'}</p>
                        {!searchQuery && (
                            <button className="btn btn-primary" onClick={() => setShowNewProject(true)}>
                                <Plus size={18} />
                                Create Project
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="projects-grid">
                        {filteredProjects.map((project) => (
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
            await projects.create({ name, repoUrl, branch });
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
