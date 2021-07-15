import {
  BonjourInstance,
  HAPNodeJSClient,
  HAPNodeJSClientOptions,
  Homebridge,
} from "hap-node-client";
import { CharacteristicValue } from "hap-nodejs";
import {
  CharacteristicReadData,
  CharacteristicReadDataValue,
  CharacteristicsReadResponse,
} from "hap-nodejs/dist/internal-types";
import { HAPStatus as HAPStatusEnum } from "../types/hap";
import { enumNameByValue } from "./util/common";

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
    characteristicIds: [number, number][],
    instance?: BonjourInstance
  ): Promise<CharacteristicReadData[]> {
    return new Promise((resolve, reject) =>
      this.hapClient.HAPstatus(
        host,
        port,
        `?id=${characteristicIds.map(([aid, iid]) => `${aid}.${iid}`).join(",")}`,
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

  async getCharacteristic(
    host: string,
    port: number,
    aid: number,
    iid: number
  ): Promise<Nullable<CharacteristicValue>> {
    return new Promise((resolve, reject) =>
      this.hapClient.HAPstatus(host, port, `?id=${aid}.${iid}`, (err, result) => {
        if (err) {
          result;
          return reject(err);
        }
        err;
        const { characteristics } = result as CharacteristicsReadResponse;
        if (characteristics.length !== 1) {
          return reject(new Error("No data returned"));
        }

        const char = characteristics[0];
        // FUXME: type cast
        if (char.status && (char.status as number) !== 0) {
          return reject(
            new Error(enumNameByValue(HAPStatusEnum, char.status as unknown as HAPStatusEnum))
          );
        }

        resolve((char as CharacteristicReadDataValue).value);
      })
    );
  }
}
