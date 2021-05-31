import { API as HomebridgeAPI, Logging, PlatformConfig } from "homebridge";
import { setupMQTT } from "./lib/mqtt";
import { AliceResponder } from "./lib/responder";
import * as MQTTPattern from "mqtt-pattern";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("debug")("alice2mqtt");

type AliceRequestType = "devices" | "query" | "action";

export default function (homebridge: HomebridgeAPI): void {
  homebridge.registerPlatform("homebridge-alice2mqtt", AliceHome);
}

class AliceHome {
  private pin: string;
  private debug: boolean;

  constructor(private log: Logging, private config: PlatformConfig, api: HomebridgeAPI) {
    this.pin = config["pin"];
    // Enable config based DEBUG logging enable
    this.debug = config["debug"] || false;

    api.on("didFinishLaunching", this.didFinishLaunching);
  }

  didFinishLaunching = async () => {
    // Initialize HAP Connections
    const alice = new AliceResponder({ debug: this.debug, pin: this.pin }, this.log);
    const handlers = {
      devices: alice.devices,
      query: alice.query,
      action: alice.action,
    };

    const mqttClient = await setupMQTT(this.config.brokerUrl, this.log);
    mqttClient.on("message", async function (topic, message) {
      try {
        const msg = JSON.parse(message.toString());
        const { request } =
          MQTTPattern.exec<{ request: AliceRequestType }>("alice/request/+request", topic) ?? {};
        if (!request || !handlers[request]) {
          debug(`No handlers found for alice request '${request}'`);
          return;
        }

        const response = await handlers[request](msg);
        mqttClient.publish("alice/response/" + request, JSON.stringify(response));
      } catch (error) {
        debug("Error", error.message);
      }
    });
  };
}
