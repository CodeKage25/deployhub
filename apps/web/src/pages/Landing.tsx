import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Rocket, ArrowRight, Check, Mail, Loader2,
    CheckCircle, Zap, Shield, Globe, Database, Users, Terminal
} from 'lucide-react';
import { waitlist } from '../api';
import './Landing.css';

// Supported languages with SVG-like styling (inspired by pxxl.pro)
const languages = [
    { name: 'Next.js', desc: 'React framework with SSR', icon: 'N', color: '#fff', bg: '#000' },
    { name: 'Express', desc: 'Node.js web framework', icon: 'ex', color: '#fafafa', bg: '#333' },
    { name: 'React', desc: 'JavaScript UI library', icon: '⚛', color: '#61DAFB', bg: 'rgba(97,218,251,0.1)' },
    { name: 'Python', desc: 'Versatile programming language', icon: '🐍', color: '#3776AB', bg: 'rgba(55,118,171,0.1)' },
    { name: 'Go', desc: 'Fast compiled language', icon: 'Go', color: '#00ADD8', bg: 'rgba(0,173,216,0.1)' },
    { name: 'PHP', desc: 'Server-side scripting', icon: 'php', color: '#777BB4', bg: 'rgba(119,123,180,0.1)' },
    { name: 'Rust', desc: 'Memory-safe systems language', icon: '🦀', color: '#CE422B', bg: 'rgba(206,66,43,0.1)' },
    { name: 'Vue.js', desc: 'Progressive JavaScript framework', icon: 'V', color: '#42B883', bg: 'rgba(66,184,131,0.1)' },
    { name: 'Laravel', desc: 'PHP web framework', icon: 'L', color: '#FF2D20', bg: 'rgba(255,45,32,0.1)' },
    { name: 'HTML', desc: 'Markup language for web', icon: '5', color: '#E34F26', bg: 'rgba(227,79,38,0.1)' },
];

// Simulated deployment logs for animation
const deploymentLogs = [
    { time: '14:32:01', text: 'Detecting project environment...', type: 'info' },
    { time: '14:32:02', text: 'Environment detected: Node.js', type: 'success' },
    { time: '14:32:03', text: 'Installing dependencies...', type: 'info' },
    { time: '14:32:08', text: 'npm install --frozen-lockfile', type: 'command' },
    { time: '14:32:15', text: 'Building application...', type: 'info' },
    { time: '14:32:18', text: 'npm run build', type: 'command' },
    { time: '14:32:25', text: 'Build completed successfully', type: 'success' },
    { time: '14:32:26', text: 'Creating container image...', type: 'info' },
    { time: '14:32:35', text: 'Deploying to production...', type: 'info' },
    { time: '14:32:40', text: '✓ Deployment successful!', type: 'success' },
];

// Feature cards  
const features = [
    {
        icon: <Terminal size={22} />,
        number: '01',
        title: 'Git-Based Deployments',
        description: 'Connect your repository and deploy on every push. Zero configuration required.'
    },
    {
        icon: <Shield size={22} />,
        number: '02',
        title: 'Automatic HTTPS',
        description: 'Free SSL certificates provisioned automatically for all your domains.'
    },
    {
        icon: <Zap size={22} />,
        number: '03',
        title: 'Instant Rollbacks',
        description: 'Roll back to any previous deployment with a single click.'
    },
    {
        icon: <Globe size={22} />,
        number: '04',
        title: 'Environment Variables',
        description: 'Securely manage secrets and config per environment.'
    },
    {
        icon: <Users size={22} />,
        number: '05',
        title: 'Real-time Logs',
        description: 'Stream build and runtime logs directly in your browser.'
    },
    {
        icon: <Database size={22} />,
        number: '06',
        title: 'Resource Monitoring',
        description: 'Track CPU, memory, and network usage in real-time.'
    },
];

interface LogEntry {
    time: string;
    text: string;
    type: string;
}

export default function Landing() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
    const [visibleLogs, setVisibleLogs] = useState<LogEntry[]>([]);
    const logsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        waitlist.getCount()
            .then((data: any) => setWaitlistCount(data.count))
            .catch(() => { });
    }, []);

    // Animate deployment logs - FIXED VERSION
    useEffect(() => {
        let currentIndex = 0;
        let intervalId: NodeJS.Timeout;

        const runAnimation = () => {
            intervalId = setInterval(() => {
                if (currentIndex < deploymentLogs.length) {
                    const logToAdd = deploymentLogs[currentIndex];
                    if (logToAdd) {
                        setVisibleLogs(prev => [...prev, logToAdd]);
                        currentIndex++;
                        // Auto-scroll
                        if (logsRef.current) {
                            logsRef.current.scrollTop = logsRef.current.scrollHeight;
                        }
                    }
                } else {
                    // Stop interval, wait, then restart
                    clearInterval(intervalId);
                    setTimeout(() => {
                        setVisibleLogs([]);
                        currentIndex = 0;
                        runAnimation();
                    }, 3000);
                }
            }, 500);
        };

        runAnimation();

        return () => clearInterval(intervalId);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await waitlist.join(email);
            setSuccess(true);
            const data = await waitlist.getCount();
            setWaitlistCount(data.count);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="landing">
            {/* Navbar */}
            <nav className="landing-nav">
                <Link to="/" className="landing-logo">
                    <Rocket size={28} />
                    <span>DeployHub</span>
                </Link>
                <div className="landing-nav-links">
                    <Link to="/login" className="btn btn-secondary">Login</Link>
                    <Link to="/register" className="btn btn-primary">Get Started</Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="hero">
                <div className="hero-glow"></div>
                <div className="hero-content">
                    <div className="badge">
                        <span className="pulse-dot"></span>
                        Open for early access
                    </div>
                    <h1>
                        Deploy Your Code<br />
                        <span className="gradient-text">In Seconds</span>
                    </h1>
                    <p className="hero-subtitle">
                        Push to Git and we handle the rest. Auto-detect, build, and deploy
                        your applications to a global network with zero configuration.
                    </p>
                    <div className="hero-cta">
                        <Link to="/register" className="btn btn-primary btn-lg">
                            Start Deploying <ArrowRight size={18} />
                        </Link>
                        <a href="#features" className="btn btn-secondary btn-lg">
                            See Features
                        </a>
                    </div>
                </div>

                {/* Terminal Preview - FIXED */}
                <div className="terminal-preview">
                    <div className="terminal-header">
                        <div className="terminal-dots">
                            <span></span><span></span><span></span>
                        </div>
                        <span className="terminal-title">
                            <Zap size={12} className="live-indicator" />
                            DEPLOYMENT LOGS
                        </span>
                    </div>
                    <div className="terminal-body" ref={logsRef}>
                        {visibleLogs.map((log, index) => (
                            <div key={index} className={`terminal-line ${log?.type || 'info'}`}>
                                <span className="log-time">{log?.time}</span>
                                <span className="log-text">{log?.text}</span>
                            </div>
                        ))}
                        {visibleLogs.length > 0 && (
                            <div className="terminal-cursor"></div>
                        )}
                    </div>
                </div>
            </section>

            {/* Languages Grid - NEW DESIGN */}
            <section className="languages-section">
                <h2>Deploy Any Stack</h2>
                <p className="section-subtitle">We auto-detect your framework. No configuration needed.</p>
                <div className="languages-grid">
                    {languages.map((lang, index) => (
                        <div key={lang.name} className="language-card" style={{ animationDelay: `${index * 0.05}s` }}>
                            <div className="language-icon" style={{ background: lang.bg, color: lang.color }}>
                                {lang.icon}
                            </div>
                            <div className="language-info">
                                <span className="language-name">{lang.name}</span>
                                <span className="language-desc">{lang.desc}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="features" id="features">
                <h2>Everything You Need</h2>
                <div className="features-grid">
                    {features.map((feature) => (
                        <div key={feature.number} className="feature-card">
                            <span className="feature-number">{feature.number}</span>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Waitlist */}
            <section className="waitlist-section">
                <div className="waitlist-content">
                    <h2>Get Early Access</h2>
                    <p>Join the waitlist and be the first to deploy when we launch.</p>
                    {success ? (
                        <div className="waitlist-success">
                            <CheckCircle size={24} />
                            <span>You're on the list! We'll notify you when we launch.</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="waitlist-form">
                            <div className="waitlist-input-group">
                                <Mail size={20} className="waitlist-icon" />
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? <Loader2 size={18} className="spin" /> : 'Join Waitlist'}
                                </button>
                            </div>
                            {error && <p className="waitlist-error">{error}</p>}
                        </form>
                    )}
                    {waitlistCount !== null && (
                        <p className="waitlist-count">
                            <strong>{waitlistCount}</strong> developers already signed up
                        </p>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>© 2026 DeployHub. Ship faster.</p>
            </footer>
        </div>
    );
}
