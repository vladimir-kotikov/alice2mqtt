import * as mqtt from "mqtt";
import { MqttClient } from "mqtt";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("debug")("alice2mqtt:lib/mqtt");

export function setupMQTT(brokerUrl: string): MqttClient {
  console.log("Connecting to Alice skill at", brokerUrl);
  const mqttClient = mqtt.connect(brokerUrl);
  return mqttClient
    .subscribe(["alice/request/devices", "alice/request/action", "alice/request/query"])
    .on("connect", () => debug(`Connected to ${brokerUrl}`))
    .on("offline", () => debug("Went offline"))
    .on("reconnect", () => debug("Reconnecting to broker..."))
    .on("error", (err) => {
      debug("Client error", err);
      throw err;
    });
}
