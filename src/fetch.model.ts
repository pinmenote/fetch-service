export type FetchResponseType = 'JSON' | 'TEXT' | 'BLOB';

export type FetchRequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

export type FetchHeaders = { [key: string]: string };

export interface FetchRefreshToken {
  url: string;
  key: string;
  value: string;
  method: FetchRequestMethod;
}

export interface FetchAuthenticate {
  refreshToken: FetchRefreshToken;
  successCallback?: (data: any, headers?: FetchHeaders) => void;
  errorCallback?: (error: Error) => void;
}

export interface FetchParams<T = undefined> {
  method?: FetchRequestMethod;
  type?: FetchResponseType;
  data?: T;
  timeout?: number;
  headers?: FetchHeaders;
}

export interface FetchResponse<T> {
  url: string;
  ok: boolean;
  status: number;
  data: T;
  type: FetchResponseType;
}
