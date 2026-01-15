import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuth';
import {
    Rocket,
    Network,
    LogOut,
    LayoutDashboard,
    Menu,
    X
} from 'lucide-react';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <div className="layout">
            {/* Mobile Header */}
            <header className="mobile-header">
                <Link to="/dashboard" className="logo">
                    <Rocket className="logo-icon" />
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

            {/* Sidebar */}
            <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <Link to="/dashboard" className="logo" onClick={() => setMobileMenuOpen(false)}>
                        <Rocket className="logo-icon" />
                        <span>DeployHub</span>
                    </Link>
                </div>

                <nav className="sidebar-nav">
                    <Link
                        to="/dashboard"
                        className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </Link>
                    <Link
                        to="/iac"
                        className={`nav-item ${isActive('/iac') ? 'active' : ''}`}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <Network size={20} />
                        <span>IaC Visualizer</span>
                    </Link>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="user-email">{user?.email}</span>
                    </div>
                    <button onClick={handleLogout} className="logout-btn" title="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="mobile-overlay"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
