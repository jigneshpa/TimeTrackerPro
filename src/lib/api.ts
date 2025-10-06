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

export async function getEmployees() {
  const response = await fetchAPI<any>('/api/admin/employees', 'GET');
  return response;
}

export async function getEmployee(id: string) {
  const response = await fetchAPI<any>(`/api/admin/employees?id=${id}`, 'GET');
  return response;
}

export async function createEmployee(employeeData: any) {
  const response = await fetchAPI<any>('/api/admin/employees', 'POST', employeeData);
  return response;
}

export async function updateEmployee(employeeData: any) {
  const response = await fetchAPI<any>('/api/admin/employees', 'PUT', employeeData);
  return response;
}

export async function deleteEmployee(id: string) {
  const response = await fetchAPI<any>('/api/admin/employees', 'DELETE', { id });
  return response;
}

export async function getAllTimeEntries(startDate?: string, endDate?: string, employeeId?: string) {
  let endpoint = '/api/admin/time-entries';
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (employeeId) params.append('employee_id', employeeId);
  if (params.toString()) endpoint += `&${params.toString()}`;

  const response = await fetchAPI<any>(endpoint, 'GET');
  return response;
}

export async function getAllVacationRequests(status?: string) {
  let endpoint = '/api/admin/vacation-requests';
  if (status) endpoint += `&status=${status}`;

  const response = await fetchAPI<any>(endpoint, 'GET');
  return response;
}

export async function approveVacation(id: string) {
  const response = await fetchAPI<any>('/api/admin/vacation/approve', 'POST', { id });
  return response;
}

export async function denyVacation(id: string, denialReason?: string) {
  const response = await fetchAPI<any>('/api/admin/vacation/deny', 'POST', { id, denial_reason: denialReason });
  return response;
}

export async function getWorkSchedules(employeeId: string) {
  const response = await fetchAPI<any>(`/api/admin/work-schedules&employee_id=${employeeId}`, 'GET');
  return response;
}

export async function saveWorkSchedule(scheduleData: any) {
  const response = await fetchAPI<any>('/api/admin/work-schedules', 'POST', scheduleData);
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
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAllTimeEntries,
  getAllVacationRequests,
  approveVacation,
  denyVacation,
  getWorkSchedules,
  saveWorkSchedule,
};
