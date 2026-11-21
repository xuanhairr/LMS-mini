const BASE_URL = 'http://localhost:3000/api';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  errors?: any[];
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('lms_token');

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const responseData: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    message: 'Could not parse response',
    statusCode: response.status,
  }));

  // Handle 401 (unauthorized) more carefully:
  // - If the request is for the authentication endpoints (e.g. '/login' or '/logout'),
  //   don't force a redirect so the caller can display an error message.
  const isAuthEndpoint = endpoint === '/login' || endpoint === '/logout';
  if (response.status === 401 || responseData.statusCode === 401) {
    localStorage.removeItem('lms_token');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  if (!response.ok || !responseData.success) {
    throw responseData; // Throw the structured response itself
  }

  return responseData; // Return the full structured response
}
// Health Check
export const checkHealth = async () => {
  return apiFetch<any>('/_health/live');
};
