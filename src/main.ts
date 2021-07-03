import * as MQTTPattern from "mqtt-pattern";
import * as Sentry from "@sentry/node";
import { setupMQTT } from "./lib/mqtt";
import { AliceResponder } from "./lib/responder";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("debug")("alice2mqtt:main");

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

const mqttClient = setupMQTT(config.brokerUrl);
mqttClient.on("message", async function (topic, message) {
  debug(`${topic} <- ${message}`);
  const msg = JSON.parse(message.toString());
  const { request } =
    MQTTPattern.exec<{ request: AliceRequestType }>("alice/request/+request", topic) ?? {};
  if (!request || !handlers[request]) {
    debug(`No handlers found for alice request '${request}'`);
    return;
  }

  const responseTopic = "alice/response/" + request;
  const response = await handlers[request](msg);
  const responseStr = JSON.stringify(response);
  mqttClient.publish(responseTopic, responseStr);
  debug(`${responseTopic} -> ${responseStr}`);
});
