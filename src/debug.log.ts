import { Config } from './config';

export const debugLog = (...args: any[]) => {
  if (!Config.isProduction) {
    //eslint-disable-next-line no-console, @typescript-eslint/no-unsafe-argument
    console.log(...args);
  }
};
