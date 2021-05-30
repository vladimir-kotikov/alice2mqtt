export interface AliceBaseRequest {
  request_id: string;
}

export type AliceDevicesRequest = AliceBaseRequest;

export interface AliceQueryRequest extends AliceBaseRequest {
  devices: {
    id: string;
    custom_data: object;
  }[];
}

export interface AliceActionRequest extends AliceBaseRequest {
  payload: {
    devices: {
      id: string;
      custom_data?: object;
      capabilities: AliceDeviceCapabilityState[];
    }[];
  };
}

// See https://yandex.ru/dev/dialogs/smart-home/doc/concepts/device-types.html
export enum AliceDeviceType {
  Light = "devices.types.light",
  Socket = "devices.types.socket",
  Switch = "devices.types.switch",
  Thermostat = "devices.types.thermostat",
  AirConditioner = "devices.types.thermostat.ac",
  MediaDevice = "devices.types.media_device",
  TV = "devices.types.media_device.tv",
  TVBox = "devices.types.media_device.tv_box",
  Receiver = "devices.types.media_device.receiver",
  Cooking = "devices.types.cooking",
  CoffeeMaker = "devices.types.cooking.coffee_maker",
  Kettle = "devices.types.cooking.kettle",
  Multicooker = "devices.types.cooking.multicooker",
  Openable = "devices.types.openable",
  Curtain = "devices.types.openable.curtain",
  Humidifier = "devices.types.humidifier",
  Purifier = "devices.types.purifier",
  VacuumCleaner = "devices.types.vacuum_cleaner",
  WashingMachine = "devices.types.washing_machine",
  Dishwasher = "devices.types.dishwasher",
  Iron = "devices.types.iron",
  Sensor = "devices.types.sensor",
  Other = "devices.types.other",
}

export enum AliceCapabilityType {
  OnOff = "devices.capabilities.on_off",
  ColorSetting = "devices.capabilities.color_setting",
  Mode = "devices.capabilities.mode",
  Range = "devices.capabilities.range",
  Toggle = "devices.capabilities.toggle",
}

interface BaseAliceDeviceCapabilityInfo {
  type: AliceCapabilityType;
  retrievable?: boolean;
  reportable?: boolean;
}

interface BaseAliceDeviceCapabilityState {
  type: AliceCapabilityType;
  state: {
    instance: string;
    value: any;
  };
}

interface AliceOnOffCapabilityInfo extends BaseAliceDeviceCapabilityInfo {
  type: AliceCapabilityType.OnOff;
  parameters?: {
    split?: boolean;
  };
}

export interface AliceOnOffCapabilityState extends BaseAliceDeviceCapabilityState {
  type: AliceCapabilityType.OnOff;
  state: {
    instance: "on";
    value: boolean;
  };
}

type AliceColorSceneId =
  | "alarm"
  | "alice"
  | "candle"
  | "dinner"
  | "fantasy"
  | "garland"
  | "jungle"
  | "movie"
  | "neon"
  | "night"
  | "ocean"
  | "party"
  | "reading"
  | "rest"
  | "romance"
  | "siren"
  | "sunrise"
  | "sunset";

interface AliceColorSettingCapabilityInfo extends BaseAliceDeviceCapabilityInfo {
  type: AliceCapabilityType.ColorSetting;
  parameters: {
    // At least one is required
    color_model?: "hsv" | "rgb";
    temperature_k?: {
      min: number;
      max: number;
    };
    scenes?: {
      id: AliceColorSceneId;
    }[];
  };
}

export interface AliceColorSettingCapabilityState extends BaseAliceDeviceCapabilityState {
  type: AliceCapabilityType.ColorSetting;
  state:
    | { instance: "rgb" | "temperature_k"; value: number }
    | { instance: "scene"; value: string }
    | { instance: "hsv"; value: { h: number; s: number; v: number } };
}

type AliceModeName =
  | "cleanup_mode"
  | "coffee_mode"
  | "dishwashing"
  | "fan_speed"
  | "heat"
  | "input_source"
  | "program"
  | "swing"
  | "tea_mode"
  | "thermostat"
  | "work_speed";

export type AliceModeValue =
  | "auto"
  | "eco"
  | "turbo"
  | "cool"
  | "dry"
  | "fan"
  | "only"
  | "heat"
  | "preheat"
  | "high"
  | "low"
  | "medium"
  | "max"
  | "min"
  | "fast"
  | "slow"
  | "express"
  | "normal"
  | "quiet"
  | "horizontal"
  | "stationary"
  | "vertical"
  | "one"
  | "two"
  | "three"
  | "four"
  | "five"
  | "six"
  | "seven"
  | "eight"
  | "nine"
  | "ten"
  | "americano"
  | "cappuccino"
  | "double"
  | "espresso"
  | "espresso"
  | "latte"
  | "black_tea"
  | "flower_tea"
  | "green_tea"
  | "herbal_tea"
  | "oolong_tea"
  | "puerh_tea"
  | "red_tea"
  | "white_tea"
  | "glass"
  | "intensive"
  | "pre_rinse"
  | "aspic"
  | "baby_food"
  | "baking"
  | "bread"
  | "boiling"
  | "cereals"
  | "cheesecake"
  | "deep_fryer"
  | "dessert"
  | "fowl"
  | "frying"
  | "macaroni"
  | "milk_porridge"
  | "multicooker"
  | "pasta"
  | "pilaf"
  | "pizza"
  | "sauce"
  | "slow_cook"
  | "soup"
  | "steam"
  | "stewing"
  | "vacuum"
  | "yogurt";

export interface AliceModeCapabilityInfo extends BaseAliceDeviceCapabilityInfo {
  type: AliceCapabilityType.Mode;
  parameters: {
    instance: AliceModeName;
    modes: {
      value: AliceModeValue;
    }[];
  };
}

export interface AliceModeCapabilityState extends BaseAliceDeviceCapabilityState {
  type: AliceCapabilityType.Mode;
  state: {
    instance: AliceModeName;
    value: AliceModeValue;
  };
}

export type AlicePercentageRangedInstanceName =
  | "brightness"
  | "channel"
  | "humidity"
  | "open"
  | "volume";

// FIXME: These should not overlap
export type AliceTemperatureRangedInstanceName =
  | "brightness"
  | "channel"
  | "humidity"
  | "open"
  | "temperature"
  | "volume";

export type AlicePercentageUnit = "unit.percent";

export type AliceTemperatureUnit = "unit.temperature.celsius" | "unit.temperature.kelvin";

export interface AlicePercentageRangedCapabilityInfo extends BaseAliceDeviceCapabilityInfo {
  type: AliceCapabilityType.Range;
  parameters: {
    instance: AlicePercentageRangedInstanceName;
    unit?: AlicePercentageUnit;
    random_access?: boolean;
    range?: {
      min?: number;
      max?: number;
      precision?: number;
    };
  };
}

export interface AliceTemperatureRangedCapabilityInfo extends BaseAliceDeviceCapabilityInfo {
  type: AliceCapabilityType.Range;
  parameters: {
    instance: AliceTemperatureRangedInstanceName;
    unit?: AliceTemperatureUnit;
    random_access?: boolean;
    range?: {
      min?: number;
      max?: number;
      precision?: number;
    };
  };
}

export type AliceRangedCapabilityInfo =
  | AlicePercentageRangedCapabilityInfo
  | AliceTemperatureRangedCapabilityInfo;

export interface AliceRangedCapabilityState extends BaseAliceDeviceCapabilityInfo {
  type: AliceCapabilityType.Range;
  state: {
    instance: AlicePercentageRangedInstanceName | AliceTemperatureRangedInstanceName;
    value: number;
  };
}

type AliceToggleInstanceName =
  | "backlight"
  | "controls_locked"
  | "ionization"
  | "keep_warm"
  | "mute"
  | "oscillation"
  | "pause";

interface AliceToggleCapabilityInfo extends BaseAliceDeviceCapabilityInfo {
  type: AliceCapabilityType.Toggle;
  parameters: {
    instance: AliceToggleInstanceName;
  };
}

interface AliceToggleCapabilityState extends BaseAliceDeviceCapabilityInfo {
  type: AliceCapabilityType.Toggle;
  state: {
    instance: AliceToggleInstanceName;
    value: boolean;
  };
}

export type AliceDeviceCapabilityInfo =
  | AliceOnOffCapabilityInfo
  | AliceColorSettingCapabilityInfo
  | AliceModeCapabilityInfo
  | AliceRangedCapabilityInfo
  | AliceToggleCapabilityInfo;

export type AliceDeviceCapabilityState =
  | AliceOnOffCapabilityState
  | AliceColorSettingCapabilityState
  | AliceModeCapabilityState
  | AliceRangedCapabilityState
  | AliceToggleCapabilityState;

enum AlicePropertyType {
  Float = "devices.properties.float",
  Event = "devices.properties.event",
}
interface BaseAliceDevicePropertyInfo {
  // TODO: share with BaseAliceDeviceCapabilityInfo
  type: AlicePropertyType;
  retrievable: boolean;
  reportable: boolean;
}

interface BaseAliceDevicePropertyState {
  // TODO: share with BaseAliceDeviceCapabilityInfo
  type: AlicePropertyType;
  state: {
    instance: string;
    value: any;
  };
}

type AlicePressureUnit =
  | "unit.pressure.atm"
  | "unit.pressure.pascal"
  | "unit.pressure.bar"
  | "unit.pressure.mmh";

interface AliceFloatDevicePropertyInfo extends BaseAliceDevicePropertyInfo {
  type: AlicePropertyType.Float;
  parameters:
    | { instance: "amperage"; unit?: "unit.ampere" }
    | { instance: "battery_level"; unit?: "unit.percent" }
    | { instance: "co2_level"; unit?: "unit.ppm" }
    | { instance: "humidity"; unit?: "unit.percent" }
    | { instance: "power"; unit?: "unit.watt" }
    | { instance: "pressure"; unit?: AlicePressureUnit }
    | { instance: "temperature"; unit?: AliceTemperatureUnit }
    | { instance: "voltage"; unit?: "unit.volt" }
    | { instance: "water_level"; unit?: "unit.percent" };
}

interface AliceFloatDevicePropertyState extends BaseAliceDevicePropertyState {
  type: AlicePropertyType.Float;
  state: {
    instance:
      | "battery_level"
      | "co2_level"
      | "humidity"
      | "power"
      | "pressure"
      | "temperature"
      | "voltage"
      | "water_level";
    value: number;
  };
}
interface AliceEventDevicePropertyInfo extends BaseAliceDevicePropertyInfo {
  type: AlicePropertyType.Event;
  parameters:
    | { instance: "vibration"; events: { value: "tilt" | "fall" | "vibration" }[] }
    | { instance: "open"; events: { value: "opened" | "closed" }[] }
    | { instance: "button"; events: { value: "click" | "double_click" | "long_press" }[] }
    | { instance: "motion"; events: { value: "detected" | "not_detected" }[] }
    | { instance: "smoke" | "gas"; events: { value: "detected" | "not_detected" | "high" }[] }
    | { instance: "battery_level" | "water_level"; events: { value: "low" | "normal" }[] }
    | { instance: "water_leak"; events: { value: "dry" | "leak" }[] };
}

interface AliceEventDevicePropertyState extends BaseAliceDevicePropertyState {
  type: AlicePropertyType.Event;
  state: {
    instance:
      | "vibration"
      | "open"
      | "button"
      | "motion"
      | "smoke"
      | "gas"
      | "battery_level"
      | "water_level"
      | "water_leak";
    value: string;
  };
}

export type AliceDevicePropertyInfo = AliceFloatDevicePropertyInfo | AliceEventDevicePropertyInfo;
export type AliceDevicePropertyState =
  | AliceFloatDevicePropertyState
  | AliceEventDevicePropertyState;

export interface AliceDeviceMetadata {
  id: string;
  name: string;
  description?: string;
  room?: string;
  type: AliceDeviceType;
  custom_data?: object;
  capabilities?: AliceDeviceCapabilityInfo[];
  properties?: AliceDevicePropertyInfo[];
  device_info: {
    manufacturer?: string;
    model?: string;
    hw_version?: string;
    sw_version?: string;
  };
}

export interface AliceBaseResponse {
  request_id: string;
  payload: any;
}

export interface AliceDevicesResponse extends AliceBaseResponse {
  payload: {
    user_id: string;
    devices: AliceDeviceMetadata[];
  };
}

export type AliceErrorCode =
  | "DOOR_OPEN"
  | "LID_OPEN"
  | "REMOTE_CONTROL_DISABLED"
  | "NOT_ENOUGH_WATER"
  | "LOW_CHARGE_LEVEL"
  | "CONTAINER_FULL"
  | "CONTAINER_EMPTY"
  | "DRIP_TRAY_FULL"
  | "DEVICE_STUCK"
  | "DEVICE_OFF"
  | "FIRMWARE_OUT_OF_DATE"
  | "NOT_ENOUGH_DETERGENT"
  | "HUMAN_INVOLVEMENT_NEEDED"
  | "DEVICE_UNREACHABLE"
  | "DEVICE_BUSY"
  | "INTERNAL_ERROR"
  | "INVALID_ACTION"
  | "INVALID_VALUE"
  | "NOT_SUPPORTED_IN_CURRENT_MODE"
  | "ACCOUNT_LINKING_ERROR";

export interface AliceDeviceState {
  id: string;
  capabilities?: AliceDeviceCapabilityState[];
  properties?: AliceDevicePropertyState[];
  error_code?: AliceErrorCode;
  error_message?: string;
}

export interface AliceQueryResponse extends AliceBaseResponse {
  payload: {
    devices: AliceDeviceState[];
  };
}

export interface ActionResult {
  status: "DONE" | "ERROR";
  error_code?: AliceErrorCode;
  error_message?: string;
}

export interface AliceCapabilityActionResult {
  type: AliceCapabilityType;
  state: {
    instance: string;
    action_result?: ActionResult;
  };
}

export interface AliceDeviceActionResult {
  id: string;
  capabilities?: AliceCapabilityActionResult[];
  action_result?: ActionResult;
}

export interface AliceActionResponse extends AliceBaseResponse {
  payload: {
    devices: AliceDeviceActionResult[];
  };
}
