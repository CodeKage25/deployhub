import { useState, useEffect } from 'react';
import {
    User,
    Key,
    Bell,
    Shield,
    Palette,
    Save,
    Loader2,
    CheckCircle2,
    Plus,
    Trash2,
    Eye,
    EyeOff
} from 'lucide-react';
import { useAuthStore } from '../hooks/useAuth';
import { projects } from '../api';
import './SettingsPage.css';

interface EnvVar {
    key: string;
    value: string;
    isSecret: boolean;
}

interface Project {
    id: string;
    name: string;
    envVars?: Record<string, string>;
}

export default function SettingsPage() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Projects for env vars
    const [projectList, setProjectList] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [projectLoading, setProjectLoading] = useState(true);

    // Environment Variables state
    const [envVars, setEnvVars] = useState<EnvVar[]>([]);
    const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        if (selectedProject) {
            loadProjectEnvVars(selectedProject);
        }
    }, [selectedProject]);

    const loadProjects = async () => {
        try {
            const data = await projects.list();
            setProjectList(data);
            if (data.length > 0) {
                setSelectedProject(data[0].id);
            }
        } catch (err) {
            console.error('Failed to load projects:', err);
        } finally {
            setProjectLoading(false);
        }
    };

    const loadProjectEnvVars = async (projectId: string) => {
        try {
            const project = await projects.get(projectId);
            const vars = project.envVars || {};
            setEnvVars(
                Object.entries(vars).map(([key, value]) => ({
                    key,
                    value: value as string,
                    isSecret: key.toLowerCase().includes('secret') ||
                        key.toLowerCase().includes('password') ||
                        key.toLowerCase().includes('key') ||
                        key.toLowerCase().includes('token')
                }))
            );
        } catch (err) {
            console.error('Failed to load env vars:', err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (activeTab === 'env' && selectedProject) {
                // Save environment variables
                const envVarsObj: Record<string, string> = {};
                envVars.forEach(ev => {
                    if (ev.key.trim()) {
                        envVarsObj[ev.key.trim()] = ev.value;
                    }
                });
                await projects.update(selectedProject, { envVars: envVarsObj });
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setSaving(false);
        }
    };

    const addEnvVar = () => {
        setEnvVars([...envVars, { key: '', value: '', isSecret: false }]);
    };

    const removeEnvVar = (index: number) => {
        setEnvVars(envVars.filter((_, i) => i !== index));
    };

    const updateEnvVar = (index: number, field: keyof EnvVar, value: string | boolean) => {
        const updated = [...envVars];
        updated[index] = { ...updated[index], [field]: value };
        setEnvVars(updated);
    };

    const toggleShowSecret = (index: number) => {
        setShowSecrets({ ...showSecrets, [index]: !showSecrets[index] });
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'env', label: 'Environment Variables', icon: Key },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'appearance', label: 'Appearance', icon: Palette },
    ];

    return (
        <div className="settings-page">
            <header className="page-header">
                <div className="header-left">
                    <h1>Settings</h1>
                    <p>Manage your account and preferences</p>
                </div>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <>
                            <Loader2 size={16} className="spin" />
                            Saving...
                        </>
                    ) : saved ? (
                        <>
                            <CheckCircle2 size={16} />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save size={16} />
                            Save Changes
                        </>
                    )}
                </button>
            </header>

            <div className="page-content">
                <div className="settings-layout">
                    {/* Tabs */}
                    <aside className="settings-tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <tab.icon size={18} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </aside>

                    {/* Content */}
                    <div className="settings-content">
                        {activeTab === 'profile' && (
                            <div className="settings-section">
                                <h2>Profile Settings</h2>
                                <p className="section-desc">Manage your personal information</p>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input type="email" value={user?.email || ''} disabled />
                                        <span className="form-hint">Email cannot be changed</span>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Display Name</label>
                                        <input
                                            type="text"
                                            placeholder="Your name"
                                            defaultValue={user?.email?.split('@')[0]}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Timezone</label>
                                        <select defaultValue="UTC">
                                            <option value="UTC">UTC</option>
                                            <option value="America/New_York">Eastern Time</option>
                                            <option value="America/Los_Angeles">Pacific Time</option>
                                            <option value="Europe/London">London</option>
                                            <option value="Asia/Tokyo">Tokyo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'env' && (
                            <div className="settings-section">
                                <h2>Environment Variables</h2>
                                <p className="section-desc">Securely manage secrets and config per project</p>

                                {/* Project Selector */}
                                <div className="project-selector-row">
                                    <label>Project:</label>
                                    {projectLoading ? (
                                        <span>Loading...</span>
                                    ) : projectList.length === 0 ? (
                                        <span className="no-projects">No projects yet. Create a project first.</span>
                                    ) : (
                                        <select
                                            value={selectedProject || ''}
                                            onChange={(e) => setSelectedProject(e.target.value)}
                                        >
                                            {projectList.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {selectedProject && (
                                    <>
                                        <div className="env-vars-list">
                                            {envVars.length === 0 ? (
                                                <div className="no-vars">
                                                    No environment variables set for this project.
                                                </div>
                                            ) : (
                                                envVars.map((envVar, index) => (
                                                    <div key={index} className="env-var-row">
                                                        <input
                                                            type="text"
                                                            placeholder="KEY"
                                                            value={envVar.key}
                                                            onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                                                            className="env-key"
                                                        />
                                                        <div className="env-value-wrapper">
                                                            <input
                                                                type={envVar.isSecret && !showSecrets[index] ? 'password' : 'text'}
                                                                placeholder="Value"
                                                                value={envVar.value}
                                                                onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                                                                className="env-value"
                                                            />
                                                            {envVar.isSecret && (
                                                                <button
                                                                    type="button"
                                                                    className="toggle-visibility"
                                                                    onClick={() => toggleShowSecret(index)}
                                                                >
                                                                    {showSecrets[index] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <label className="secret-toggle">
                                                            <input
                                                                type="checkbox"
                                                                checked={envVar.isSecret}
                                                                onChange={(e) => updateEnvVar(index, 'isSecret', e.target.checked)}
                                                            />
                                                            Secret
                                                        </label>
                                                        <button
                                                            className="btn-icon-danger"
                                                            onClick={() => removeEnvVar(index)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <button className="btn btn-secondary btn-sm" onClick={addEnvVar}>
                                            <Plus size={16} />
                                            Add Variable
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="settings-section">
                                <h2>Notifications</h2>
                                <p className="section-desc">Configure how you receive updates</p>

                                <div className="toggle-list">
                                    <label className="toggle-item">
                                        <div className="toggle-info">
                                            <span className="toggle-label">Email Notifications</span>
                                            <span className="toggle-desc">Receive email updates about your deployments</span>
                                        </div>
                                        <input type="checkbox" defaultChecked />
                                    </label>

                                    <label className="toggle-item">
                                        <div className="toggle-info">
                                            <span className="toggle-label">Build Failure Alerts</span>
                                            <span className="toggle-desc">Get notified when a build fails</span>
                                        </div>
                                        <input type="checkbox" defaultChecked />
                                    </label>

                                    <label className="toggle-item">
                                        <div className="toggle-info">
                                            <span className="toggle-label">Deployment Success</span>
                                            <span className="toggle-desc">Get notified when a deployment succeeds</span>
                                        </div>
                                        <input type="checkbox" />
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="settings-section">
                                <h2>Security</h2>
                                <p className="section-desc">Manage your account security</p>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Current Password</label>
                                        <input type="password" placeholder="Enter current password" />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>New Password</label>
                                        <input type="password" placeholder="Enter new password" />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Confirm New Password</label>
                                        <input type="password" placeholder="Confirm new password" />
                                    </div>
                                </div>

                                <button className="btn btn-secondary">Update Password</button>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="settings-section">
                                <h2>Appearance</h2>
                                <p className="section-desc">Customize the look and feel</p>

                                <div className="theme-selector">
                                    <label className="theme-option active">
                                        <input type="radio" name="theme" value="dark" defaultChecked />
                                        <div className="theme-preview dark-preview"></div>
                                        <span>Dark</span>
                                    </label>
                                    <label className="theme-option">
                                        <input type="radio" name="theme" value="light" />
                                        <div className="theme-preview light-preview"></div>
                                        <span>Light</span>
                                    </label>
                                    <label className="theme-option">
                                        <input type="radio" name="theme" value="system" />
                                        <div className="theme-preview system-preview"></div>
                                        <span>System</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
