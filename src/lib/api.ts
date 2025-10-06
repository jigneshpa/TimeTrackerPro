const API_BASE = import.meta.env.VITE_API_URL || 'http://timetrackerpro.kabba.ai/MedooApi/api.php';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

export function setToken(token: string | null) {
  console.log('setToken called with:', token ? 'TOKEN_EXISTS' : 'NULL');
  if (token) {
    localStorage.setItem('auth_token', token);
    console.log('Token stored in localStorage');
  } else {
    localStorage.removeItem('auth_token');
    console.log('Token removed from localStorage');
  }
  const stored = localStorage.getItem('auth_token');
  console.log('Token verification - stored:', stored ? 'TOKEN_EXISTS' : 'NULL');
}

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function fetchAPI<T>(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  console.log('fetchAPI - endpoint:', endpoint, 'token:', token ? 'TOKEN_EXISTS' : 'NULL');
  console.log('Full token:', token);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('Authorization header set:', headers['Authorization']);
  }

  const url = `${API_BASE}?endpoint=${encodeURIComponent(endpoint)}`;

  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log('Request headers:', headers);

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    console.error('Response error:', response.status, data);
    throw new Error(data.message || 'An error occurred');
  }

  return data;
}

export async function login(email: string, password: string) {
  const response = await fetchAPI<{ token: string; user: any }>(
    '/api/auth/login',
    'POST',
    { email, password }
  );
  return response;
}

export async function getAuthMe() {
  const response = await fetchAPI<any>('/api/auth/me', 'GET');
  return response;
}

export async function getActiveTimeClock() {
  const response = await fetchAPI<any>('/api/timeclock/active', 'GET');
  return response;
}

export async function getTodayTimeEntries() {
  const response = await fetchAPI<any>('/api/timeclock/today', 'GET');
  return response;
}

export async function clockIn(notes?: string) {
  const response = await fetchAPI<any>('/api/timeclock/clock-in', 'POST', { notes });
  return response;
}

export async function clockOut(breakDuration?: number) {
  const response = await fetchAPI<any>(
    '/api/timeclock/clock-out',
    'POST',
    { break_duration: breakDuration }
  );
  return response;
}

export const api = {
  setToken,
  login,
  getAuthMe,
  getActiveTimeClock,
  getTodayTimeEntries,
  clockIn,
  clockOut,
};
