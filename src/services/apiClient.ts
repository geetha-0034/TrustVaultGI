/**
 * TrustVault Real HTTP & Service Client Layer
 * Performs genuine HTTP requests against the backend REST API with Bearer token authentication,
 * standard error handling, diagnostics fault simulation, and seamless fallback.
 */

export interface ApiClientConfig {
  simulateLatency: boolean;
  latencyMs: number;
  simulateErrors: boolean;
  simulateSessionExpired: boolean;
  useRealApi: boolean;
}

const STORAGE_KEY_CONFIG = 'tv_api_client_config';
const STORAGE_KEY_TOKEN = 'tv_auth_token';

class ApiClient {
  private config: ApiClientConfig = {
    simulateLatency: false,
    latencyMs: 150,
    simulateErrors: false,
    simulateSessionExpired: false,
    useRealApi: true,
  };

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
  }

  public getConfig(): ApiClientConfig {
    return { ...this.config };
  }

  public setConfig(newConfig: Partial<ApiClientConfig>) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.config));
  }

  public getToken(): string | null {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
  }

  public async http<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (this.config.simulateLatency) {
      await new Promise((resolve) => setTimeout(resolve, this.config.latencyMs));
    }

    if (this.config.simulateSessionExpired) {
      this.config.simulateSessionExpired = false;
      this.setConfig({ simulateSessionExpired: false });
      throw {
        status: 401,
        code: 'SESSION_EXPIRED',
        message: 'Your cryptographic session has expired. Please authenticate again.',
      };
    }

    if (this.config.simulateErrors) {
      throw {
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Simulated backend service error (500). Security gateway responded with fault condition.',
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      const message = errorData.error?.message || errorData.message || `Request failed with status ${response.status}`;
      const code = errorData.error?.code || errorData.code || 'API_ERROR';

      throw {
        status: response.status,
        code,
        message,
        details: errorData.error?.details,
      };
    }

    return response.json();
  }

  public async download(endpoint: string): Promise<{ blob: Blob; filename: string }> {
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      throw {
        status: response.status,
        code: errorData.error?.code || 'DOWNLOAD_ERROR',
        message: errorData.error?.message || 'Download forbidden or failed.',
      };
    }

    // Extract filename from Content-Disposition header if present
    const disposition = response.headers.get('content-disposition');
    let filename = 'trustvault_document.bin';
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const blob = await response.blob();
    return { blob, filename };
  }

  public async request<T>(executor: () => T | Promise<T>): Promise<T> {
    if (this.config.simulateLatency) {
      await new Promise((resolve) => setTimeout(resolve, this.config.latencyMs));
    }
    if (this.config.simulateSessionExpired) {
      this.config.simulateSessionExpired = false;
      this.setConfig({ simulateSessionExpired: false });
      throw {
        status: 401,
        code: 'SESSION_EXPIRED',
        message: 'Your cryptographic session has expired. Please authenticate again.',
      };
    }
    if (this.config.simulateErrors) {
      throw {
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Simulated backend service error (500). Security gateway responded with fault condition.',
      };
    }
    return executor();
  }
}

export const apiClient = new ApiClient();
