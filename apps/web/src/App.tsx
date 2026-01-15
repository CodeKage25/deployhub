import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuth';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import IacVisualizer from './pages/IacVisualizer';

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

            <Route path="/projects/:id" element={
                <ProtectedRoute>
                    <Layout>
                        <ProjectDetails />
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
        </Routes>
    );
}
