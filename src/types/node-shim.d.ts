declare module "node:fs" {
  export interface MkdirOptions {
    readonly recursive?: boolean;
  }

  export interface RmOptions {
    readonly recursive?: boolean;
    readonly force?: boolean;
  }

  export const promises: {
    readFile(path: string, encoding: string): Promise<string>;
    writeFile(path: string, data: string, encoding: string): Promise<void>;
    mkdir(path: string, options: MkdirOptions): Promise<void>;
    rm(path: string, options: RmOptions): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
  };
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
}

declare namespace NodeJS {
  interface ErrnoException extends Error {
    readonly code?: string;
  }
}
