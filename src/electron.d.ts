export { };

declare global {
    interface Window {
        electron?: {
            ipcRenderer: {
                send: (channel: string, ...args: any[]) => void;
                on: (channel: string, func: (...args: any[]) => void) => () => void;
                invoke: (channel: string, ...args: any[]) => Promise<any>;
                selectFile: (options: any) => Promise<string | string[] | null>;
                selectFolder: () => Promise<string | null>;
                readDirectoryRecursive: (path: string) => Promise<any[]>;
                readFileData: (path: string) => Promise<{ data: Uint8Array; mimeType: string } | null>;
            };
            templates: {
                list: () => Promise<string[]>;
                read: (filename: string) => Promise<Uint8Array | null>;
                write: (filename: string, data: Uint8Array) => Promise<boolean>;
                delete: (filename: string) => Promise<boolean>;
                getPath: () => Promise<string>;
            }
        };
    }
}
