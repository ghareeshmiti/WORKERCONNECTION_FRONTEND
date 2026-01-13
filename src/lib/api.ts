import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:3000';
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api`;

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.details || 'Request failed');
    }
    return res.json();
};

// --- Registration ---

export const registerUser = async (username: string) => {
    try {
        const options = await registerBegin(username);
        const attResp = await startRegistration(options);
        const verify = await registerFinish(username, attResp);
        return verify.verified;
    } catch (e) {
        throw e;
    }
};

export const registerBegin = async (username: string) => {
    const res = await fetch(`${API_URL}/register/begin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
    });
    return handleResponse(res);
};

export const registerFinish = async (username: string, body: any) => {
    const res = await fetch(`${API_URL}/register/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, body }),
    });
    return handleResponse(res);
};

// --- Authentication (Login / Check-in) ---

export const authenticateUser = async (username: string, action: string | null = null, location: string = 'Unknown') => {
    try {
        const options = await loginBegin(username);
        const authResp = await startAuthentication(options);
        return await loginFinish(username, authResp, action, location);
    } catch (e) {
        throw e;
    }
}

export const loginBegin = async (username: string = '') => {
    const res = await fetch(`${API_URL}/login/begin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
    });
    return handleResponse(res);
};

export const loginFinish = async (username: string, body: any, action: string | null, location: string) => {
    const res = await fetch(`${API_URL}/login/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, body, action, location }),
    });
    return handleResponse(res);
};

// --- Data & Admin ---

export const getStatus = async (username: string) => {
    const res = await fetch(`${API_URL}/status/${username}`);
    return handleResponse(res);
};

export const getAdminData = async () => {
    const res = await fetch(`${API_URL}/admin/data`);
    return handleResponse(res);
};

export const deleteUser = async (username: string) => {
    const res = await fetch(`${API_URL}/admin/user/${username}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Delete failed');
    return res.json();
};

export const getAuditLogs = async (username: string) => {
    const res = await fetch(`${API_URL}/admin/audit/${username}`);
    return handleResponse(res);
};

export const getStations = async () => {
    const res = await fetch(`${API_URL}/admin/stations`);
    return handleResponse(res);
};

export const addStation = async (name: string, description: string) => {
    const res = await fetch(`${API_URL}/admin/stations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
    });
    return handleResponse(res);
};

export const deleteStation = async (name: string) => {
    const res = await fetch(`${API_URL}/admin/stations/${name}`, {
        method: 'DELETE',
    });
    return handleResponse(res);
};

export const getExportData = async () => {
    const res = await fetch(`${API_URL}/admin/export`);
    return handleResponse(res);
};
