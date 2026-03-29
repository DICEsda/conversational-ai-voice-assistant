export interface ElectronAPI {
  backend: {
    start: () => Promise<any>;
    stop: () => Promise<any>;
    getStatus: () => Promise<any>;
    getUrl: () => Promise<string>;
    onStatusChange: (callback: (status: any) => void) => () => void;
  };
  window: {
    resize: (width: number, height: number) => void;
    setMinSize: (width: number, height: number) => void;
  };
  platform: string;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
