const API_BASE = import.meta.env.VITE_API_URL || 'http://timetrackerpro.kabba.ai/MedooApi/api.php';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

interface VacationAccrual {
  id: string;
  employee_id: string;
  accrual_date: string;
  hours_worked: number;
  hours_accrued: number;
  cumulative_accrued: number;
  created_at: string;
  updated_at: string;
}

async function fetchAPI<T>(
  endpoint: string,
  method: string = 'GET'
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const [basePath, queryString] = endpoint.split('?');
  let url = `${API_BASE}?endpoint=${encodeURIComponent(basePath)}`;

  if (queryString) {
    url += `&${queryString}`;
  }

  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'An error occurred');
  }

  return data;
}

export async function calculateAndUpdateVacationAccrual(employeeId: string): Promise<void> {
  try {
    console.log('[VacationAccrual] Starting accrual calculation for employee:', employeeId);

    const response = await fetchAPI<VacationAccrual>(
      '/api/vacation/accrual/calculate',
      'POST'
    );

    if (response.success) {
      console.log('[VacationAccrual] Accrual calculated successfully:', response.data);
    } else {
      console.error('[VacationAccrual] Error calculating accrual:', response.message);
    }
  } catch (error) {
    console.error('[VacationAccrual] Error in calculateAndUpdateVacationAccrual:', error);
    throw error;
  }
}

export async function getLatestVacationAccrual(employeeId: string): Promise<VacationAccrual | null> {
  try {
    const response = await fetchAPI<VacationAccrual>(
      '/api/vacation/accrual/latest',
      'GET'
    );

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  } catch (error) {
    console.error('[VacationAccrual] Error in getLatestVacationAccrual:', error);
    return null;
  }
}

export async function getAllVacationAccruals(employeeId: string, year?: number): Promise<VacationAccrual[]> {
  try {
    let endpoint = '/api/vacation/accrual/all';
    if (year) {
      endpoint += `?year=${year}`;
    }

    const response = await fetchAPI<VacationAccrual[]>(endpoint, 'GET');

    if (response.success && response.data) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error('[VacationAccrual] Error in getAllVacationAccruals:', error);
    return [];
  }
}
