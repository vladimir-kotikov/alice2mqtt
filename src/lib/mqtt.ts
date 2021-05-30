import EventEmitter = require("events");
import { Logging } from "homebridge";
import * as mqtt from "mqtt";
import { AliceBaseResponse } from "../types/alice";
import * as MQTTPattern from "mqtt-pattern";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("debug")("aliceLocal");

let count = 0;

interface MqttOptions {
  eventBus: EventEmitter;
  log: Logging;
}

export function setupMQTT(brokerUrl: string, options: MqttOptions) {
  options.log("Connecting to Alice skill at", brokerUrl);
  const mqttClient = mqtt.connect(brokerUrl);
  mqttClient.on("connect", function () {
    options.log("connect", "alice/request/#");
    mqttClient.removeAllListeners("message"); // This hangs up everyone on the channel
    mqttClient.subscribe("alice/request/devices");
    mqttClient.subscribe("alice/request/action");
    mqttClient.subscribe("alice/request/query");
    mqttClient.on("message", function (topic, message) {
      let msg = {};

      try {
        msg = JSON.parse(message.toString());
      } catch (e) {
        debug("JSON message is empty or not valid");
        msg = {};
      }

      const { request } = MQTTPattern.exec("alice/request/+request", topic);

      if (options.eventBus.listenerCount(request) > 0) {
        options.eventBus.emit(
          request,
          msg,
          function (err: Maybe<Error>, response: AliceBaseResponse) {
            // TODO: if no message, return error Response
            if (response == null) {
              if (err) {
                debug("Error", err.message);
              } else {
                debug("Error no response");
              }
            } else {
              if (err) {
                debug("Error, but still emitting response", err.message);
                mqttClient.publish("alice/response/" + request, JSON.stringify(response));
              } else {
                debug("Emitting", request);
                mqttClient.publish("alice/response/" + request, JSON.stringify(response));
              }
            }
          }
        );
      } else {
        debug("No listener for", request);
      }
    });
  });

  mqttClient.on("offline", function () {
    debug("offline");
  });

  mqttClient.on("reconnect", function () {
    count++;
    debug("reconnect");
    if (count % 5 === 0)
      options.log(
        "ERROR: No connection to homebridge.g-on.io. Retrying... please review the README and the Homebridge configuration."
      );
  });

  mqttClient.on("error", function (err) {
    debug("error", err);
  });
}
