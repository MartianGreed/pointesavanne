import { Injectable } from '@angular/core';

export interface ApiProblem {
  readonly error?: string;
  readonly _tag?: string;
  readonly message?: string;
  readonly issues?: readonly string[];
}

/** A typed, cookie-carrying fetch wrapper over the API. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ApiProblem,
  ) {
    super(problem.message ?? problem.error ?? `HTTP ${status}`);
  }
}

@Injectable({ providedIn: 'root' })
export class Api {
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(path, {
      method,
      credentials: 'include',
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      let problem: ApiProblem = {};
      try {
        problem = (await response.json()) as typeof problem;
      } catch {
        problem = { message: `HTTP ${response.status}` };
      }
      throw new ApiError(response.status, problem);
    }
    return (await response.json()) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }
}
