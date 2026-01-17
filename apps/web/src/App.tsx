import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuth';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import IacVisualizer from './pages/IacVisualizer';
import ProjectsPage from './pages/ProjectsPage';
import DeploymentsPage from './pages/DeploymentsPage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { token } = useAuthStore();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <Layout>
                        <Dashboard />
                    </Layout>
                </ProtectedRoute>
            } />

            <Route path="/projects" element={
                <ProtectedRoute>
                    <Layout>
                        <ProjectsPage />
                    </Layout>
                </ProtectedRoute>
            } />

            <Route path="/projects/:id" element={
                <ProtectedRoute>
                    <Layout>
                        <ProjectDetails />
                    </Layout>
                </ProtectedRoute>
            } />

            <Route path="/deployments" element={
                <ProtectedRoute>
                    <Layout>
                        <DeploymentsPage />
                    </Layout>
                </ProtectedRoute>
            } />

            <Route path="/iac" element={
                <ProtectedRoute>
                    <Layout>
                        <IacVisualizer />
                    </Layout>
                </ProtectedRoute>
            } />

            <Route path="/logs" element={
                <ProtectedRoute>
                    <Layout>
                        <LogsPage />
                    </Layout>
                </ProtectedRoute>
            } />

            <Route path="/settings" element={
                <ProtectedRoute>
                    <Layout>
                        <SettingsPage />
                    </Layout>
                </ProtectedRoute>
            } />
        </Routes>
    );
}
