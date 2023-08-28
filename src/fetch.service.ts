import { FetchParams, FetchResponse, FetchResponseType, RefreshTokenParams } from './fetch.model';
import { fnConsoleLog } from './fn.console.log';

export class FetchService {
  private static assignDefaultParams(params: FetchParams) {
    if (!params.method) params.method = 'GET';
    if (!params.type) params.type = 'JSON';
    if (!params.timeout) params.timeout = 15000;
  }

  static async fetch<T>(
    url: string,
    params: FetchParams,
    refreshParams?: RefreshTokenParams
  ): Promise<FetchResponse<T>> {
    this.assignDefaultParams(params);
    return new Promise((resolve, reject) => {
      if (refreshParams) {
        this.refetch<T>(url, params, refreshParams, resolve, reject);
      } else {
        this._fetch(url, params, resolve, reject);
      }
    });
  }

  private static _fetch = <T>(
    url: string,
    params: FetchParams,
    resolveFetch: (value: FetchResponse<T>) => void,
    rejectFetch: (error: Error) => void
  ): void => {
    fnConsoleLog('FetchService->_fetch', url);
    const headers = this.applyDefaultHeaders(params.headers);
    // timeout
    const timeout = setTimeout(() => {
      fnConsoleLog('FetchService->timeout', url);
      rejectFetch(new Error(`Timeout ${url}`));
    }, params.timeout);
    fetch(url, {
      method: params.method,
      headers,
      //eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body: params.body
    })
      .then((res) => {
        this.getResponse(res, params.type!)
          .then((data) => {
            clearTimeout(timeout);
            fnConsoleLog('FetchService->_fetch->resolve', res.ok, 'status', res.status);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            resolveFetch({ url, type: params.type!, status: res.status, data, ok: res.ok });
          })
          .catch((e: Error) => rejectFetch(e));
      })
      .catch((e: Error) => rejectFetch(e));
  };

  private static refetch = <T>(
    url: string,
    params: FetchParams,
    refreshParams: RefreshTokenParams,
    resolveFetch: (value: FetchResponse<T>) => void,
    rejectFetch: (error: Error) => void
  ): void => {
    this._fetch<T>(
      url,
      params,
      (res) => {
        //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!res.ok && (res.data as any)[refreshParams.data.refreshKey] === refreshParams.data.refreshValue) {
          this.refreshToken(params, refreshParams)
            .then(() => {
              this._fetch(url, params, resolveFetch, rejectFetch);
            })
            .catch((e: Error) => rejectFetch(e));
        } else {
          resolveFetch(res);
        }
      },
      (error) => {
        rejectFetch(error);
      }
    );
  };

  private static refreshToken(params: FetchParams, refreshParams: RefreshTokenParams): Promise<void> {
    fnConsoleLog('FetchService->refreshToken', refreshParams.data.url);
    return new Promise<void>((resolve, reject) => {
      const headers = this.applyDefaultHeaders(params.headers);
      this._fetch(
        refreshParams.data.url,
        {
          method: refreshParams.data.method,
          headers,
          timeout: params.timeout
        },
        (res) => {
          if (res.ok && refreshParams.successCallback) {
            params.headers = refreshParams.successCallback(res);
          }
          resolve();
        },
        (error) => {
          if (refreshParams.errorCallback) refreshParams.errorCallback(error);
          reject(error);
        }
      );
    });
  }

  private static applyDefaultHeaders(headers?: { [key: string]: string }): { [key: string]: string } {
    if (!headers) headers = {};
    Object.assign(headers, {
      'Content-Type': 'application/json'
    });
    return headers;
  }

  private static getResponse = async (req: Response, type: FetchResponseType): Promise<any> => {
    if (type === 'BLOB') {
      return await req.blob();
    } else if (type === 'JSON') {
      return await req.json();
    }
    return await req.text();
  };
}
