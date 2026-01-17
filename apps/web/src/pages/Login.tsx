import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Rocket, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { auth } from '../api';
import { useAuthStore } from '../hooks/useAuth';
import './Auth.css';

export default function Login() {
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await auth.login(email, password);
            setAuth(result.user, result.token);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to log in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-split">
            {/* Left side - Form */}
            <div className="auth-form-side">
                <div className="auth-form-container">
                    <Link to="/" className="auth-logo">
                        <Rocket />
                        <span>DeployHub</span>
                    </Link>

                    <div className="auth-header">
                        <h1>Welcome Back</h1>
                        <p>Login and Deploy in seconds</p>
                    </div>

                    {/* GitHub OAuth */}
                    <button
                        type="button"
                        className="btn btn-oauth btn-github-full"
                        onClick={() => window.location.href = '/api/auth/github'}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        Continue with GitHub
                    </button>

                    <div className="auth-divider">
                        <span>Or</span>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {error && (
                            <div className="auth-error">{error}</div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email">Email*</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="johndoe@gmail.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <div className="form-label-row">
                                <label htmlFor="password">Password*</label>
                                <Link to="/forgot-password" className="form-link">Forgot Password?</Link>
                            </div>
                            <div className="input-with-toggle">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
                                    required
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-auth-submit" disabled={loading}>
                            {loading ? 'Signing in...' : 'Login'}
                        </button>
                    </form>

                    <p className="auth-footer">
                        Not yet registered? <Link to="/register">Create an Account</Link>
                    </p>
                </div>
            </div>

            {/* Right side - Hero */}
            <div className="auth-hero-side">
                <div className="auth-hero-content">
                    <div className="hero-text">
                        <h2>DeployHub</h2>
                        <p>Create account and Deploy in seconds</p>
                    </div>
                    <div className="hero-marquee">
                        <span>CODE</span>
                        <span className="dot">•</span>
                        <span>DEPLOY</span>
                        <span className="dot">•</span>
                        <span>SHIP</span>
                        <span className="dot">•</span>
                        <span>CODE</span>
                        <span className="dot">•</span>
                        <span>DEPLOY</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
