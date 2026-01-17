import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuth';
import {
    Rocket,
    LogOut,
    LayoutGrid,
    FolderKanban,
    Activity,
    Settings,
    Layers,
    User,
    ChevronLeft,
    ChevronRight,
    Menu,
    X
} from 'lucide-react';
import AICopilot from './AICopilot';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;

    // All sidebar menu items
    const menuItems = [
        { icon: LayoutGrid, label: 'Dashboard', path: '/dashboard' },
        { icon: FolderKanban, label: 'Projects', path: '/projects' },
        { icon: Rocket, label: 'Deployments', path: '/deployments' },
        { icon: Layers, label: 'IaC Visualizer', path: '/iac' },
        { icon: Activity, label: 'Logs', path: '/logs' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Mobile Header */}
            <header className="mobile-header">
                <Link to="/" className="mobile-logo">
                    <Rocket size={22} />
                    <span>DeployHub</span>
                </Link>
                <button
                    className="mobile-menu-btn"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="mobile-overlay"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`app-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <Link to="/" className="sidebar-logo">
                        <Rocket size={22} />
                        {!sidebarCollapsed && <span>DeployHub</span>}
                    </Link>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        aria-label="Toggle sidebar"
                    >
                        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                        >
                            <item.icon size={20} />
                            {!sidebarCollapsed && <span>{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            <User size={16} />
                        </div>
                        {!sidebarCollapsed && (
                            <span className="user-email">{user?.email?.split('@')[0] || 'User'}</span>
                        )}
                    </div>
                    <button onClick={handleLogout} className="logout-btn" title="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="app-main">
                {children}
            </main>

            {/* AI Deploy Copilot */}
            <AICopilot />
        </div>
    );
}
