const API_BASE = 'http://localhost/MedooApi/api.php';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

let authToken: string | null = localStorage.getItem('auth_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

async function fetchAPI<T>(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
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

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
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
