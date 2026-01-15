import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, GitBranch, Network, ArrowRight, Check, Mail, Loader2, CheckCircle } from 'lucide-react';
import { waitlist } from '../api';
import './Landing.css';

const features = [
    {
        icon: <GitBranch />,
        title: 'Git Push to Deploy',
        description: 'Connect your GitHub or GitLab repo and deploy automatically on every push.',
    },
    {
        icon: <Rocket />,
        title: 'Auto-Detect Framework',
        description: 'We detect Node.js, Python, Go, and more — no Dockerfile needed.',
    },
    {
        icon: <Network />,
        title: 'IaC Visualizer',
        description: 'Upload Terraform or CloudFormation files and see your infrastructure come alive.',
    },
];

export default function Landing() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

    useEffect(() => {
        // Fetch waitlist count for social proof
        waitlist.getCount()
            .then((data) => setWaitlistCount(data.count))
            .catch(() => { }); // Silently fail
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await waitlist.join(email);
            setSuccess(true);
            setEmail('');
            // Update count
            if (waitlistCount !== null) {
                setWaitlistCount(waitlistCount + 1);
            }
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
                    <Rocket />
                    <span>DeployHub</span>
                </Link>
                <div className="landing-nav-links">
                    <Link to="/login" className="btn btn-ghost">Log in</Link>
                    <Link to="/register" className="btn btn-primary">Get Started</Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="hero">
                <div className="hero-glow"></div>
                <div className="hero-content">
                    <div className="badge badge-neutral">
                        <span className="pulse-dot"></span>
                        Now in Beta
                    </div>
                    <h1>
                        Deploy your code in
                        <span className="gradient-text"> seconds</span>
                    </h1>
                    <p className="hero-subtitle">
                        Push your code. We build, containerize, and deploy it automatically.
                        No infrastructure headaches. No complex configs.
                    </p>
                    <div className="hero-cta">
                        <Link to="/register" className="btn btn-primary btn-lg">
                            Start Deploying <ArrowRight size={20} />
                        </Link>
                        <Link to="/login" className="btn btn-secondary btn-lg">
                            Sign In
                        </Link>
                    </div>
                </div>

                {/* Terminal preview */}
                <div className="terminal-preview">
                    <div className="terminal-header">
                        <div className="terminal-dots">
                            <span></span><span></span><span></span>
                        </div>
                        <span className="terminal-title">Terminal</span>
                    </div>
                    <div className="terminal-body">
                        <div className="terminal-line">
                            <span className="terminal-prompt">$</span>
                            <span>git push origin main</span>
                        </div>
                        <div className="terminal-line dim">
                            <span>🔍 Detecting buildpack... Node.js detected</span>
                        </div>
                        <div className="terminal-line dim">
                            <span>🐳 Building Docker image...</span>
                        </div>
                        <div className="terminal-line dim">
                            <span>🚀 Deploying to cluster...</span>
                        </div>
                        <div className="terminal-line success">
                            <Check size={16} />
                            <span>Deployed! https://my-app.deployhub.io</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Waitlist Section */}
            <section className="waitlist-section">
                <div className="waitlist-content">
                    <h2>Join the Waitlist</h2>
                    <p>Be the first to know when we launch new features and get early access.</p>

                    {success ? (
                        <div className="waitlist-success">
                            <CheckCircle size={24} />
                            <span>You're on the list! We'll be in touch soon.</span>
                        </div>
                    ) : (
                        <form className="waitlist-form" onSubmit={handleSubmit}>
                            <div className="waitlist-input-group">
                                <Mail size={18} className="waitlist-icon" />
                                <input
                                    type="email"
                                    placeholder="Enter your email"
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

                    {waitlistCount !== null && waitlistCount > 0 && (
                        <p className="waitlist-count">
                            🎉 <strong>{waitlistCount.toLocaleString()}</strong> developers already joined
                        </p>
                    )}
                </div>
            </section>

            {/* Features */}
            <section className="features">
                <h2>Everything you need to ship fast</h2>
                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-card card">
                            <div className="feature-icon">{feature.icon}</div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>&copy; {new Date().getFullYear()} DeployHub. Built with ❤️ for developers.</p>
            </footer>
        </div>
    );
}
