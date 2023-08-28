import { FetchAuthenticate, FetchParams, FetchResponse, FetchResponseType } from './fetch.model';
import { fnConsoleLog } from './fn.console.log';

export class FetchService {
  private static assignDefaultParams(params: FetchParams) {
    if (!params.method) params.method = 'GET';
    if (!params.type) params.type = 'JSON';
    if (!params.timeout) params.timeout = 15000;
  }

  static async fetch<T>(url: string, params: FetchParams, auth?: FetchAuthenticate): Promise<FetchResponse<T>> {
    this.assignDefaultParams(params);
    return new Promise((resolve, reject) => {
      if (auth) {
        this.refetch<T>(url, params, auth)
          .then((res) => resolve(res))
          .catch((e) => reject(e));
      } else {
        this._fetch(url, params, resolve, reject);
      }
    });
  }

  private static _fetch = <T>(
    url: string,
    params: FetchParams,
    resolve: (value: FetchResponse<T>) => void,
    reject: (error: Error) => void
  ): void => {
    fnConsoleLog('FetchService->_fetch', url, params);
    const headers = this.applyDefaultHeaders(params.headers);
    // timeout
    const timeout = setTimeout(() => {
      fnConsoleLog('FetchService->timeout', url);
      reject(new Error(`Timeout ${url}`));
    }, params.timeout);
    fetch(url, {
      method: params.method,
      headers,
      //eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body: params.body
    })
      .then((req) => {
        this.getResponse(req, params.type!)
          .then((data) => {
            clearTimeout(timeout);
            fnConsoleLog('FetchService->_fetch->resolve', req.ok, 'status', req.status);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            resolve({ url, type: params.type!, status: req.status, data, ok: req.ok });
          })
          .catch((e: Error) => reject(e));
      })
      .catch((e: Error) => reject(e));
  };

  private static refetch = async <T>(
    url: string,
    params: FetchParams,
    auth: FetchAuthenticate
  ): Promise<FetchResponse<T>> => {
    return new Promise((resolve, reject) => {
      try {
        auth.refreshToken;
        this._fetch<T>(
          url,
          params,
          (res) => {
            //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (!res.ok && (res.data as any)[auth.refreshToken.key] === auth.refreshToken.value) {
              this.refreshToken(params, auth)
                .then(() => {
                  this._fetch(url, params, resolve, reject);
                })
                .catch((e) => reject(e));
            }
          },
          (error) => {
            reject(error);
          }
        );
      } catch (e) {
        fnConsoleLog('Error FetchService->refetch', e);
      }
    });
  };

  private static refreshToken(params: FetchParams, auth: FetchAuthenticate): Promise<void> {
    fnConsoleLog('FetchService->refreshToken', auth.refreshToken.url);
    return new Promise<void>((resolve, reject) => {
      const headers = this.applyDefaultHeaders(params.headers);
      this._fetch(
        auth.refreshToken.url,
        {
          method: auth.refreshToken.method,
          headers,
          timeout: params.timeout
        },
        (res) => {
          if (res.ok && auth.successCallback) auth.successCallback(res, params.headers);
          resolve();
        },
        (error) => {
          if (auth.errorCallback) auth.errorCallback(error);
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
