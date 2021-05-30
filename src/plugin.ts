import { EventEmitter } from "events";
import { API as HomebridgeAPI, Logging, PlatformConfig } from "homebridge";

import { setupMQTT } from "./lib/mqtt";
import { AliceResponder } from "./lib/responder";

export default function (homebridge: HomebridgeAPI): void {
  homebridge.registerPlatform("homebridge-alice2mqtt", AliceHome);
}

class AliceHome {
  private eventBus = new EventEmitter();
  private pin: string;
  private debug: boolean;

  constructor(private log: Logging, private config: PlatformConfig, api: HomebridgeAPI) {
    this.pin = config["pin"];
    // Enable config based DEBUG logging enable
    this.debug = config["debug"] || false;
    if (this.debug) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const debug = require("debug");
      let namespaces = debug.disable();

      // this.log("DEBUG-1", namespaces);
      if (namespaces) {
        namespaces = namespaces + ",g-on-alice*";
      } else {
        namespaces = "g-on-alice*";
      }
      // this.log("DEBUG-2", namespaces);
      debug.enable(namespaces);
    }

    api.on("didFinishLaunching", this.didFinishLaunching);
  }

  didFinishLaunching = () => {
    // Initialize HAP Connections
    const alice = new AliceResponder({ debug: this.debug, pin: this.pin }, this.log);
    alice.devices();

    setupMQTT(this.config.brokerUrl, { eventBus: this.eventBus, log: this.log });

    // Alice mesages
    this.eventBus.on("devices", alice.devices);
    this.eventBus.on("query", alice.query);
    this.eventBus.on("action", alice.action);
  };
}
