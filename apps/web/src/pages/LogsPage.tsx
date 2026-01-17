import { useState, useEffect, useRef } from 'react';
import {
    Loader2,
    AlertCircle,
    RefreshCw,
    Terminal,
    Download,
    Trash2
} from 'lucide-react';
import { projects, deployments } from '../api';
import './LogsPage.css';

interface Project {
    id: string;
    name: string;
}

interface LogEntry {
    timestamp: string;
    type: 'info' | 'error' | 'success' | 'warning';
    message: string;
}

export default function LogsPage() {
    const [projectList, setProjectList] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(false);
    const [error, setError] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        loadProjects();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    const loadProjects = async () => {
        try {
            const data = await projects.list();
            setProjectList(data);
            if (data.length > 0 && !selectedProject) {
                setSelectedProject(data[0].id);
                loadProjectLogs(data[0].id);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadProjectLogs = async (projectId: string) => {
        setLogsLoading(true);
        setLogs([]);

        try {
            // Get the latest deployment for this project
            const deps = await deployments.list(projectId);
            if (deps.length === 0) {
                setLogs([{
                    timestamp: new Date().toISOString(),
                    type: 'info',
                    message: 'No deployments found for this project'
                }]);
                return;
            }

            const latestDep = deps[0];

            // Parse build log if available
            if (latestDep.build_log) {
                const logLines = latestDep.build_log.split('\n').filter(Boolean);
                const parsedLogs: LogEntry[] = logLines.map((line: string) => ({
                    timestamp: new Date().toISOString(),
                    type: line.includes('error') || line.includes('ERROR') ? 'error' :
                        line.includes('success') || line.includes('✅') ? 'success' :
                            line.includes('warning') || line.includes('WARN') ? 'warning' : 'info',
                    message: line
                }));
                setLogs(parsedLogs);
            } else {
                setLogs([{
                    timestamp: new Date().toISOString(),
                    type: 'info',
                    message: `Latest deployment status: ${latestDep.status}`
                }]);
            }

            // Connect to WebSocket for live logs
            connectWebSocket(latestDep.id);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLogsLoading(false);
        }
    };

    const connectWebSocket = (deploymentId: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        try {
            const ws = new WebSocket(`ws://localhost:3001/api/deployments/${deploymentId}/logs`);

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                setLogs(prev => [...prev, {
                    timestamp: new Date().toISOString(),
                    type: data.type || 'info',
                    message: data.log || data.message
                }]);
            };

            ws.onerror = () => {
                // WebSocket failed, that's okay
            };

            wsRef.current = ws;
        } catch (err) {
            // WebSocket not available
        }
    };

    const handleProjectChange = (projectId: string) => {
        setSelectedProject(projectId);
        loadProjectLogs(projectId);
    };

    const handleClearLogs = () => {
        setLogs([]);
    };

    const handleDownloadLogs = () => {
        const logText = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${selectedProject}-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="page-loading">
                <Loader2 size={40} className="spin" />
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="logs-page">
            <header className="page-header">
                <div className="header-left">
                    <h1>Logs</h1>
                    <p>Real-time build and runtime logs</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-ghost btn-sm" onClick={handleClearLogs} title="Clear logs">
                        <Trash2 size={16} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={handleDownloadLogs} title="Download logs">
                        <Download size={16} />
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => selectedProject && loadProjectLogs(selectedProject)}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </header>

            <div className="page-content">
                {error && (
                    <div className="error-banner">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {/* Project Selector */}
                <div className="logs-controls">
                    <div className="project-selector">
                        <label>Project:</label>
                        <select
                            value={selectedProject || ''}
                            onChange={(e) => handleProjectChange(e.target.value)}
                        >
                            {projectList.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <label className="auto-scroll-toggle">
                        <input
                            type="checkbox"
                            checked={autoScroll}
                            onChange={(e) => setAutoScroll(e.target.checked)}
                        />
                        Auto-scroll
                    </label>
                </div>

                {/* Logs Terminal */}
                <div className="logs-terminal">
                    <div className="terminal-header">
                        <Terminal size={16} />
                        <span>Terminal</span>
                        {logsLoading && <Loader2 size={14} className="spin" />}
                    </div>
                    <div className="terminal-content">
                        {logs.length === 0 ? (
                            <div className="terminal-empty">
                                <Terminal size={32} />
                                <p>No logs available. Deploy a project to see logs.</p>
                            </div>
                        ) : (
                            <>
                                {logs.map((log, index) => (
                                    <div key={index} className={`log-line log-${log.type}`}>
                                        <span className="log-time">{formatTime(log.timestamp)}</span>
                                        <span className="log-message">{log.message}</span>
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
