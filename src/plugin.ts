import * as MQTTPattern from "mqtt-pattern";
import * as Sentry from "@sentry/node";
import { setupMQTT } from "./lib/mqtt";
import { AliceResponder } from "./lib/responder";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("debug")("alice2mqtt");

type AliceRequestType = "devices" | "query" | "action";

Sentry.init({
  dsn: "https://9a05b76d99034936947edc6b589741f4@o333403.ingest.sentry.io/5793709",
});

import { config } from "./config";

const alice = new AliceResponder({ debug: config.debug, pin: config.pin });
const handlers = {
  devices: alice.devices,
  query: alice.query,
  action: alice.action,
};

setupMQTT(config.brokerUrl).then((mqttClient) => {
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
});
