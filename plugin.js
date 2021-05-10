"use strict";

var setupMQTT = require('./lib/aliceLocal.js').setupMQTT;
var aliceActions = require('./lib/aliceActions.js');
var EventEmitter = require('events').EventEmitter;
// var debug = require('debug')('alicePlugin');

const packageConfig = require('./package.json');

var options = {};

module.exports = function (homebridge) {
  homebridge.registerPlatform("homebridge-alice2mqtt", aliceHome);
};

function aliceHome(log, config, api) {
  this.log = log;
  this.eventBus = new EventEmitter();
  this.config = config;
  this.pin = config['pin']

  // Enable config based DEBUG logging enable
  this.debug = config['debug'] || false;
  if (this.debug) {
    let debugEnable = require('debug');
    let namespaces = debugEnable.disable();

    // this.log("DEBUG-1", namespaces);
    if (namespaces) {
      namespaces = namespaces + ',g-on-alice*';
    } else {
      namespaces = 'g-on-alice*';
    }
    // this.log("DEBUG-2", namespaces);
    debugEnable.enable(namespaces);
  }

  if (api) {
    this.api = api;
    this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  }

  this.log.info(
    '%s v%s, node %s, homebridge v%s',
    packageConfig.name, packageConfig.version, process.version, api.serverVersion
  );
}

aliceHome.prototype = {
  accessories: function (callback) {
    this.log("accessories");
    callback();
  }
};

aliceHome.prototype.didFinishLaunching = function () {
  options = {
    eventBus: this.eventBus,
    debug: this.debug,
    log: this.log,
    pin: this.pin,
  };

  // Initialize HAP Connections
  aliceActions.hapDiscovery(options);

  setupMQTT(this.config.brokerUrl, options);

  // Alice mesages

  this.eventBus.on('devices', aliceActions.aliceDiscovery.bind(this));
  this.eventBus.on('action', aliceActions.aliceAction.bind(this));
  this.eventBus.on('query', aliceActions.aliceQuery.bind(this));
};

aliceHome.prototype.configureAccessory = function (accessory) {
  this.log("configureAccessory");
  // callback();
};
