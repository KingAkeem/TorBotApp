export {};

declare global {
  interface Window {
    torbot: {
      getBackendStatus: () => Promise<{
        available: boolean;
        engine: string;
        status: string;
        source?: string;
        error?: string;
      }>;
      getTorStatus: (input: {
        host: string;
        port: number;
      }) => Promise<{
        configured: boolean;
        reachable: boolean;
        host: string;
        port: number;
        configPath?: string;
        socksPorts: string[];
        controlPorts: string[];
        dataDirectory?: string;
        torBinary?: string;
        portMatches?: boolean;
        searchedPaths: string[];
        checkedAt: string;
      }>;
      startCrawl: (request: {
        url: string;
        depth: number;
        useTor: boolean;
        socks5Host: string;
        socks5Port: number;
      }) => Promise<unknown>;
      cancelCrawl: () => Promise<unknown>;
      openExternal: (url: string) => Promise<void>;
    };
  }
}
