/*
 * MIT License
 * Copyright (c) 2023 Michal Szczepanski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { FetchAuthenticate, FetchParams, FetchResponse, FetchResponseType } from './fetch.model';
import { debugLog } from './debug.log';

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

  private static _fetch = (
    url: string,
    params: FetchParams,
    resolve: (value: any, ok: boolean, status: number) => void,
    reject: (error: Error) => void
  ) => {
    const headers = this.applyDefaultHeaders(params.headers);
    // timeout
    const timeout = setTimeout(() => {
      debugLog('FetchService->timeout', url);
      reject(new Error(`Timeout ${url}`));
    }, params.timeout);
    fetch(url, {
      method: params.method,
      headers
    })
      .then((req) => {
        this.getResponse(req, params.type!)
          .then((res) => {
            clearTimeout(timeout);
            resolve(res, req.ok, req.status);
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
        this._fetch(
          url,
          params,
          (res, ok) => {
            //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (!ok && res[auth.refreshToken.key] === auth.refreshToken.value) {
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
        debugLog('Error FetchService->refetch', e);
      }
    });
  };

  private static refreshToken(params: FetchParams, auth: FetchAuthenticate): Promise<void> {
    debugLog('FetchService->refreshToken', auth.refreshToken.url);
    const headers = this.applyDefaultHeaders(params.headers);
    this._fetch(
      auth.refreshToken.url,
      {
        method: auth.refreshToken.method,
        headers,
        timeout: params.timeout
      },
      (value, ok, status) => {
        if (ok && auth.successCallback) auth.successCallback(value, params.headers);
      },
      (error) => {
        if (auth.errorCallback) auth.errorCallback(error);
      }
    );
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
