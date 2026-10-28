import * as https from 'https';
import * as http from 'http';

export interface RosRestOptions {
  host: string;
  port?: number;
  useSsl?: boolean;
  username: string;
  password?: string;
  timeoutMs?: number;
}

export class RosRestClient {
  private baseUrl: string;
  private authHeader: string;
  private agent: http.Agent | https.Agent;

  constructor(private options: RosRestOptions) {
    const isSsl = options.useSsl ?? true;
    const port = options.port || (isSsl ? 443 : 80);
    const protocol = isSsl ? 'https' : 'http';
    this.baseUrl = `${protocol}://${options.host}:${port}/rest`;

    const credentials = Buffer.from(`${options.username}:${options.password || ''}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;

    this.agent = isSsl
      ? new https.Agent({ rejectUnauthorized: false })
      : new http.Agent();
  }

  public async request<T = any>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = `${this.baseUrl}/${cleanPath}`;

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs || 6000);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        // @ts-ignore
        agent: this.agent,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        let errorText = '';
        try {
          const errJson = await response.json();
          errorText = errJson.message || errJson.detail || JSON.stringify(errJson);
        } catch {
          errorText = await response.text();
        }
        throw new Error(`RouterOS REST Error (${response.status}): ${errorText}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Falha na REST API de ${this.options.host}: ${err.message}`);
    }
  }

  public async getSystemResource() {
    return this.request('system/resource');
  }

  public async getHotspotUsers() {
    return this.request('ip/hotspot/user');
  }

  public async addHotspotUser(userData: Record<string, any>) {
    return this.request('ip/hotspot/user', 'PUT', userData);
  }

  public async updateHotspotUser(id: string, userData: Record<string, any>) {
    return this.request(`ip/hotspot/user/${id}`, 'PATCH', userData);
  }

  public async deleteHotspotUser(id: string) {
    return this.request(`ip/hotspot/user/${id}`, 'DELETE');
  }
}
