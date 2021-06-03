import * as mqtt from "mqtt";
import { MqttClient } from "mqtt";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("debug")("aliceLocal");

let count = 0;

export async function setupMQTT(brokerUrl: string): Promise<MqttClient> {
  console.log("Connecting to Alice skill at", brokerUrl);
  const mqttClient = mqtt.connect(brokerUrl);
  return new Promise((resolve) => {
    mqttClient
      .on("connect", function () {
        console.log(`Connected to ${brokerUrl}`);
        mqttClient.removeAllListeners("message"); // This hangs up everyone on the channel
        mqttClient.subscribe("alice/request/devices");
        mqttClient.subscribe("alice/request/action");
        mqttClient.subscribe("alice/request/query");
        resolve(mqttClient);
      })
      .on("offline", function () {
        debug("offline");
      })
      .on("reconnect", function () {
        count++;
        debug("reconnect");
        if (count % 5 === 0) console.warn("ERROR: No connection to broker. Retrying...");
      })
      .on("error", function (err) {
        debug("error", err);
      });
  });
}
