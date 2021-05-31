import { Logging } from "homebridge";
import * as mqtt from "mqtt";
import { MqttClient } from "mqtt";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("debug")("aliceLocal");

let count = 0;

export async function setupMQTT(brokerUrl: string, log: Logging): Promise<MqttClient> {
  log("Connecting to Alice skill at", brokerUrl);
  const mqttClient = mqtt.connect(brokerUrl);
  return new Promise((resolve) => {
    mqttClient
      .on("connect", function () {
        log(`Connected to ${brokerUrl}`);
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
        if (count % 5 === 0)
          log(
            "ERROR: No connection to homebridge.g-on.io. Retrying... please review the README and the Homebridge configuration."
          );
      })
      .on("error", function (err) {
        debug("error", err);
      });
  });
}
