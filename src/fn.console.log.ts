import { Config } from './config';

export const fnConsoleLog = (...args: any[]) => {
  if (Config.isProduction) return;
  //eslint-disable-next-line no-console, @typescript-eslint/no-unsafe-argument
  console.log(...args);
};
