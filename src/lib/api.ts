import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:3000';
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api`;

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        let errorMsg = 'Request failed';
        try {
            const data = await res.json();
            errorMsg = data.error || data.details || errorMsg;
        } catch (e) {
            // Response was not JSON (e.g. 404 HTML, 500 Text)
            errorMsg = `Server Error (${res.status}): ${res.statusText}`;
        }
        throw new Error(errorMsg);
    }
    return res.json();
};

// --- Registration ---

export const registerUser = async (username: string) => {
    try {
        const options = await registerBegin(username);
        const attResp = await startRegistration({ optionsJSON: options });
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
        console.log('[WebAuthn] login options from server:', JSON.stringify({ rpId: options.rpId, allowCredentials: options.allowCredentials?.length, timeout: options.timeout }));
        const authResp = await startAuthentication({ optionsJSON: options });
        return await loginFinish(username, authResp, action, location);
    } catch (e) {
        console.error('[WebAuthn] auth failed:', e);
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

export const approveWorker = async (workerId: string, departmentId: string, establishmentId?: string) => {
    const res = await fetch(`${API_URL}/admin/workers/${workerId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId, establishmentId }),
    });
    return handleResponse(res);
};

export const rejectWorker = async (workerId: string, reason: string) => {
    const res = await fetch(`${API_URL}/admin/workers/${workerId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
};

export const saveTicket = async (ticketDetails: any) => {
    const res = await fetch(`${API_URL}/conductor/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketDetails),
    });
    return handleResponse(res);
};
