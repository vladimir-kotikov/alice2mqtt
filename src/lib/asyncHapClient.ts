import {
  BonjourInstance,
  HAPNodeJSClient,
  HAPNodeJSClientOptions,
  Homebridge,
} from "hap-node-client";
import { CharacteristicValue } from "hap-nodejs";
import { CharacteristicReadData } from "hap-nodejs/dist/internal-types";

export type HapCharacteristicWriteData = {
  aid: number;
  iid: number;
  value: CharacteristicValue;
};

export class AsyncHapClient {
  hapClient: HAPNodeJSClient;

  constructor(options?: HAPNodeJSClientOptions) {
    this.hapClient = new HAPNodeJSClient(options);
  }

  async accessories(): Promise<Homebridge[]> {
    return new Promise<Homebridge[]>((resolve) => this.hapClient.HAPaccessories(resolve));
  }

  async command(
    host: string,
    port: number,
    characteristics: HapCharacteristicWriteData[],
    instance?: BonjourInstance
  ): Promise<object> {
    return new Promise((resolve, reject) => {
      this.hapClient.HAPcontrol(
        host,
        port,
        JSON.stringify({ characteristics }),
        (err, result) => {
          if (err) {
            return reject(err);
          }
          resolve(result ?? {});
        },
        instance
      );
    });
  }

  async getCharacteristics(
    host: string,
    port: number,
    characteristicIds: string[],
    instance?: BonjourInstance
  ): Promise<CharacteristicReadData[]> {
    return new Promise((resolve, reject) =>
      this.hapClient.HAPstatus(
        host,
        port,
        `?id=${characteristicIds.join(",")}`,
        (err, result) => {
          if (err) {
            return reject(err);
          }
          const { characteristics } = result ?? {};
          resolve(characteristics ?? []);
        },
        instance
      )
    );
  }
}
