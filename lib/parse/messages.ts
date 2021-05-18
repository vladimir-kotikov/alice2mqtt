import { AliceCapabilityType, AliceDeviceCapabilityInfo, AliceDeviceType } from "../../types/alice";
import { HapCharacteristicType, HapServiceType, HAP_SERVICE_TYPE_2_ALICE_DEVICE_TYPE } from "../../types/hap";
import { CharacteristicJsonObject } from "../../types/hap-nodejs_internal";
import { mireds2Kelvin } from "../util";
import Characteristic = require("./Characteristic");

var debug = require('debug')('alice2mqtt:messages');


export function lookupCapabilities(char: CharacteristicJsonObject): AliceDeviceCapabilityInfo[] {
  var response: AliceDeviceCapabilityInfo[] = [];

  switch (char.type) {
    case HapCharacteristicType.ConfiguredName:
    case HapCharacteristicType.Name:
    case HapCharacteristicType.Version:
      // We're not interested in these characteristics to be mapped to capabilities
      break;
    case HapCharacteristicType.TargetHeatingCoolingState:
      if (!char["valid-values"]) {
        // allowed modes are not specified, enable all
        response.push({
          type: AliceCapabilityType.OnOff
        });
        response.push({
          type: AliceCapabilityType.Mode,
          "parameters": {
            "instance": "thermostat",
            "modes": [
              {
                "value": "heat"
              },
              {
                "value": "cool"
              },
              {
                "value": "auto"
              }
            ],
            "ordered": false
          }
        });
      } else {
        var modes = [];
        for (var i = 0; i < char["valid-values"].length; i++) {
          switch (char["valid-values"][i]) {
            case 0:
              //off
              response.push({
                type: AliceCapabilityType.OnOff
              });
              break;
            case 1:
              modes.push({
                "value": "heat"
              });
              break;
            case 2:
              modes.push({
                "value": "cool"
              });
              break;
            case 3:
              modes.push({
                "value": "auto"
              });
              break;
          }
        }
        if (modes.length) {
          response.push({
            type: AliceCapabilityType.Mode,
            "parameters": {
              "instance": "thermostat",
              "modes": modes,
              "ordered": false
            }
          });
        }
      }
      break;
    case HapCharacteristicType.TargetTemperature:
      response.push({
        type: AliceCapabilityType.Range,
        "parameters": {
          "instance": "temperature",
          "unit": "unit.temperature.celsius",
          "range": {
            "min": 10,
            "max": 38,
            "precision": 1
          }
        }
      });
      break;
    case HapCharacteristicType.RotationSpeed:
    case HapCharacteristicType.Brightness:
      response.push({
        type: AliceCapabilityType.Range,
        "parameters": {
          "instance": "brightness",
          "unit": "unit.percent",
          "range": {
            "min": 0,
            "max": 100,
            "precision": 1
          }
        }
      });
      break;
    case HapCharacteristicType.ColorTemperature:
      response.push({
        type: AliceCapabilityType.ColorSetting,
        parameters: {
          temperature_k: {
            min: mireds2Kelvin(char.minValue || 140),
            max: mireds2Kelvin(char.maxValue || 500),
          }
        }
      });
      break;
    case HapCharacteristicType.TargetPosition:
      response.push({
        type: AliceCapabilityType.Range,
        "parameters": {
          "instance": "brightness",
          "unit": "unit.percent",
          "range": {
            "min": 0,
            "max": 100,
            "precision": 1
          }
        }
      });
      break;
    case HapCharacteristicType.StatusActive: // Active on a Fan 2 aka Dyson or Valve
    case HapCharacteristicType.TargetDoorState:
    case HapCharacteristicType.On:
      response.push({
        type: AliceCapabilityType.OnOff,
      });
      break;
    default:
      debug(`Unsupported characteristic ${char.type} (${char.description})`)
      break;
  }

  return response;
}

export function lookupDeviceType(serviceType: HapServiceType): Maybe<AliceDeviceType> {
  const deviceType = HAP_SERVICE_TYPE_2_ALICE_DEVICE_TYPE[serviceType];
  if (!deviceType) {
    debug(`Unknown device type ${serviceType}`);
  }

  if (deviceType === AliceDeviceType.Other) {
    debug(`Unsupported device type ${serviceType}`);
  }

  return deviceType;
}

export function convertAliceValueToHomeBridgeValue(request_capability_data) {
  switch (request_capability_data.type) {
    case "devices.capabilities.on_off":
      if (request_capability_data.state.instance == 'on') {
        if (request_capability_data.state.value) {
          return {
            value: 1
          };
        } else {
          return {
            value: 0
          };
        }
      }
      break;

    case "devices.capabilities.range":
      switch (request_capability_data.state.instance) {
        case 'brightness':
          if ((request_capability_data.state.value >= 0) || (request_capability_data.state.value <= 100)) {
            return {
              value: request_capability_data.state.value
            };
          }
          break;

        case 'temperature':
          if ((request_capability_data.state.value >= 10) || (request_capability_data.state.value <= 38)) {
            return {
              value: request_capability_data.state.value
            };
          }
          break;

        default:
          break;
      }
      break;

    case "devices.capabilities.mode":
      if (request_capability_data.state.instance == 'thermostat') {
        switch (request_capability_data.state.value) {
          case "auto":
            return {
              value: 3
            };

          case "cool":
            return {
              value: 2
            };

          case "heat":
            return {
              value: 1
            };

          default:
            break;
        }
      }
      break;

    default:
      break;
  }

  return {
    error_code: "INVALID_VALUE",
    error_message: "Requested value is not valid for requested capability"
  };
}

export function convertHomeBridgeValueToAliceValue(
  capability_data: AliceDeviceCapabilityInfo, characteristic_data: Characteristic) {
  var converted_capability_data = {
    type: capability_data.type,
    state: {}
  }
  switch (capability_data.type) {
    case AliceCapabilityType.OnOff:
      converted_capability_data.state.instance = "on";
      converted_capability_data.state.value = !!characteristic_data.value;
      return converted_capability_data;
    case AliceCapabilityType.Range:
      if (capability_data.parameters && capability_data.parameters.instance) {
        converted_capability_data.state.instance = capability_data.parameters.instance;
        converted_capability_data.state.value = characteristic_data.value;
        return converted_capability_data;
      }
      break;
    case AliceCapabilityType.Mode:
      if (capability_data.parameters && capability_data.parameters.instance) {
        converted_capability_data.state.instance = capability_data.parameters.instance;
        switch (characteristic_data.value) {
          case 3:
            converted_capability_data.state.value = "auto";
            return converted_capability_data;

          case 2:
            converted_capability_data.state.value = "cool";
            return converted_capability_data;

          case 1:
            converted_capability_data.state.value = "heat";
            return converted_capability_data;

          case 0:
            converted_capability_data.state.value = "off";
            return converted_capability_data;

          default:
            break;
        }
      }
      break;
    case AliceCapabilityType.ColorSetting:
      converted_capability_data.state.instance = 'temperature_k';
      converted_capability_data.state.value = mireds2Kelvin(characteristic_data.value);
      return converted_capability_data;
    default:
      break;
  }

  return {
    error_code: "INTERNAL_ERROR",
    error_message: "Couldn't convert device capability value for Alice"
  };
}
