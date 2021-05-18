declare module 'hap-node-client' {
    import { EventEmitter } from "events";
    import { AccessoriesResponse } from "hap-nodejs/dist/internal-types";

    export interface HAPNodeJSClientOptions {
        debug?: boolean;
        refresh?: number;
        timeout?: number;
        reqTimeout?: number;
        pin?: string;
        filter?: boolean;
    }

    interface BonjourMetadata {
        deviceID?: string;
        host?: string;
        port?: number;
        txt?: Record<string, string>;
        url?: string;
    }

    interface Homebridge {
        ipAddress: string;
        instance: BonjourMetadata;
        accessories: AccessoriesResponse;
        deviceID: string;
        name: string;
    }

    export class HAPNodeJSClient extends EventEmitter {
        constructor(options: HAPNodeJSClientOptions)
        HAPaccessories(callback: (accessories: Homebridge[]) => void): void
    }
}
