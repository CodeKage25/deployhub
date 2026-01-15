import { useAuthStore } from '../hooks/useAuth';

const API_BASE = '/api';

async function apiFetch(path: string, options: RequestInit = {}) {
    const token = useAuthStore.getState().token;

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type for requests with body
    if (options.body || options.method === 'POST' || options.method === 'PATCH' || options.method === 'PUT') {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // For POST requests without body, send empty object to avoid Fastify error
    const body = options.body ?? (options.method === 'POST' ? '{}' : undefined);

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        body,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

// Auth
export const auth = {
    login: (email: string, password: string) =>
        apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    register: (email: string, password: string) =>
        apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    me: () => apiFetch('/auth/me'),
};

// Projects
export const projects = {
    list: () => apiFetch('/projects'),

    get: (id: string) => apiFetch(`/projects/${id}`),

    create: (data: { name: string; repoUrl: string; branch?: string }) =>
        apiFetch('/projects', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: { name?: string; branch?: string; envVars?: Record<string, string> }) =>
        apiFetch(`/projects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        apiFetch(`/projects/${id}`, { method: 'DELETE' }),
};

// Deployments
export const deployments = {
    get: (id: string) => apiFetch(`/deployments/${id}`),

    getLogs: (id: string) => apiFetch(`/deployments/${id}/logs`),

    trigger: (projectId: string) =>
        apiFetch(`/deployments/trigger/${projectId}`, { method: 'POST' }),

    stop: (id: string) =>
        apiFetch(`/deployments/${id}/stop`, { method: 'POST' }),

    restart: (id: string) =>
        apiFetch(`/deployments/${id}/restart`, { method: 'POST' }),
};

// IaC
export const iac = {
    listDiagrams: () => apiFetch('/iac/diagrams'),

    getDiagram: (id: string) => apiFetch(`/iac/diagrams/${id}`),

    parse: (data: { name: string; sourceType: 'terraform' | 'cloudformation'; content: string }) =>
        apiFetch('/iac/parse', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateDiagram: (id: string, data: { name?: string; layout?: object }) =>
        apiFetch(`/iac/diagrams/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    deleteDiagram: (id: string) =>
        apiFetch(`/iac/diagrams/${id}`, { method: 'DELETE' }),
};

// Waitlist
export const waitlist = {
    join: (email: string) =>
        apiFetch('/waitlist', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    getCount: () => apiFetch('/waitlist/count'),
};
