export type FetchResponseType = 'JSON' | 'TEXT' | 'BLOB';

export type FetchRequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

export type FetchHeaders = { [key: string]: string };

export interface RefreshTokenData {
  url: string;
  refreshKey: string;
  refreshValue: string;
  method: FetchRequestMethod;
}

export interface RefreshTokenParams {
  data: RefreshTokenData;
  successCallback?: (data: any, headers?: FetchHeaders) => void;
  errorCallback?: (error: Error) => void;
}

export interface FetchParams<T = any> {
  method?: FetchRequestMethod;
  type?: FetchResponseType;
  body?: T;
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
