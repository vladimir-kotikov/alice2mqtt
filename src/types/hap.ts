import { AliceDeviceType } from "./alice";

export enum HapServiceType {
  AccessoryInformation = "0000003E-0000-1000-8000-0026BB765291",
  AirQualitySensor = "0000008D-0000-1000-8000-0026BB765291",
  BatteryService = "00000096-0000-1000-8000-0026BB765291",
  BridgingState = "00000062-0000-1000-8000-0026BB765291",
  CarbonDioxideSensor = "00000097-0000-1000-8000-0026BB765291",
  CarbonMonoxideSensor = "0000007F-0000-1000-8000-0026BB765291",
  ContactSensor = "00000080-0000-1000-8000-0026BB765291",
  Door = "00000081-0000-1000-8000-0026BB765291",
  Fan = "00000040-0000-1000-8000-0026BB765291",
  GarageDoorOpener = "00000041-0000-1000-8000-0026BB765291",
  HumiditySensor = "00000082-0000-1000-8000-0026BB765291",
  InputSource = "000000D9-0000-1000-8000-0026BB765291",
  LeakSensor = "00000083-0000-1000-8000-0026BB765291",
  Lightbulb = "00000043-0000-1000-8000-0026BB765291",
  LightSensor = "00000084-0000-1000-8000-0026BB765291",
  LockManagement = "00000044-0000-1000-8000-0026BB765291",
  LockMechanism = "00000045-0000-1000-8000-0026BB765291",
  MotionSensor = "00000085-0000-1000-8000-0026BB765291",
  OccupancySensor = "00000086-0000-1000-8000-0026BB765291",
  Outlet = "00000047-0000-1000-8000-0026BB765291",
  ProtocolInformation = "000000A2-0000-1000-8000-0026BB765291",
  SecuritySystem = "0000007E-0000-1000-8000-0026BB765291",
  SmokeSensor = "00000087-0000-1000-8000-0026BB765291",
  StatefulProgrammableSwitch = "00000088-0000-1000-8000-0026BB765291",
  StatelessProgrammableSwitch = "00000089-0000-1000-8000-0026BB765291",
  Switch = "00000049-0000-1000-8000-0026BB765291",
  Television = "000000D8-0000-1000-8000-0026BB765291",
  TelevisionSpeaker = "00000113-0000-1000-8000-0026BB765291",
  TemperatureSensor = "0000008A-0000-1000-8000-0026BB765291",
  Thermostat = "0000004A-0000-1000-8000-0026BB765291",
  Window = "0000008B-0000-1000-8000-0026BB765291",
  WindowCovering = "0000008C-0000-1000-8000-0026BB765291",
}

export enum HapCharacteristicType {
  Active = "000000B0-0000-1000-8000-0026BB765291",
  ActiveIdentifier = "000000E7-0000-1000-8000-0026BB765291",
  AdministratorOnlyAccess = "00000001-0000-1000-8000-0026BB765291",
  AirParticulateDensity = "00000064-0000-1000-8000-0026BB765291",
  AirParticulateSize = "00000065-0000-1000-8000-0026BB765291",
  AirQuality = "00000095-0000-1000-8000-0026BB765291",
  AudioFeedback = "00000005-0000-1000-8000-0026BB765291",
  BatteryLevel = "00000068-0000-1000-8000-0026BB765291",
  Brightness = "00000008-0000-1000-8000-0026BB765291",
  CarbonDioxideDetected = "00000092-0000-1000-8000-0026BB765291",
  CarbonDioxideLevel = "00000093-0000-1000-8000-0026BB765291",
  CarbonDioxidePeakLevel = "00000094-0000-1000-8000-0026BB765291",
  CarbonMonoxideDetected = "00000069-0000-1000-8000-0026BB765291",
  CarbonMonoxideLevel = "00000090-0000-1000-8000-0026BB765291",
  CarbonMonoxidePeakLevel = "00000091-0000-1000-8000-0026BB765291",
  CharacteristicValueActiveTransitionCount = "0000024B-0000-1000-8000-0026BB765291",
  CharacteristicValueTransitionControl = "00000143-0000-1000-8000-0026BB765291",
  ChargingState = "0000008F-0000-1000-8000-0026BB765291",
  ColorTemperature = "000000CE-0000-1000-8000-0026BB765291",
  ConfiguredName = "000000E3-0000-1000-8000-0026BB765291",
  ContactSensorState = "0000006A-0000-1000-8000-0026BB765291",
  CoolingThresholdTemperature = "0000000D-0000-1000-8000-0026BB765291",
  CurrentAmbientLightLevel = "0000006B-0000-1000-8000-0026BB765291",
  CurrentDoorState = "0000000E-0000-1000-8000-0026BB765291",
  CurrentHeatingCoolingState = "0000000F-0000-1000-8000-0026BB765291",
  CurrentHorizontalTiltAngle = "0000006C-0000-1000-8000-0026BB765291",
  CurrentPosition = "0000006D-0000-1000-8000-0026BB765291",
  CurrentRelativeHumidity = "00000010-0000-1000-8000-0026BB765291",
  CurrentTemperature = "00000011-0000-1000-8000-0026BB765291",
  CurrentVerticalTiltAngle = "0000006E-0000-1000-8000-0026BB765291",
  CurrentVisibilityState = "00000135-0000-1000-8000-0026BB765291",
  FirmwareRevision = "00000052-0000-1000-8000-0026BB765291",
  HardwareRevision = "00000053-0000-1000-8000-0026BB765291",
  HeatingThresholdTemperature = "00000012-0000-1000-8000-0026BB765291",
  HoldPosition = "0000006F-0000-1000-8000-0026BB765291",
  Hue = "00000013-0000-1000-8000-0026BB765291",
  Identifier = "000000E6-0000-1000-8000-0026BB765291",
  Identify = "00000014-0000-1000-8000-0026BB765291",
  InputSourceType = "000000DB-0000-1000-8000-0026BB765291",
  IsConfigured = "000000D6-0000-1000-8000-0026BB765291",
  LeakDetected = "00000070-0000-1000-8000-0026BB765291",
  LockControlPoint = "00000019-0000-1000-8000-0026BB765291",
  LockCurrentState = "0000001D-0000-1000-8000-0026BB765291",
  LockLastKnownAction = "0000001C-0000-1000-8000-0026BB765291",
  LockManagementAutoSecurityTimeout = "0000001A-0000-1000-8000-0026BB765291",
  LockTargetState = "0000001E-0000-1000-8000-0026BB765291",
  Logs = "0000001F-0000-1000-8000-0026BB765291",
  Manufacturer = "00000020-0000-1000-8000-0026BB765291",
  Model = "00000021-0000-1000-8000-0026BB765291",
  MotionDetected = "00000022-0000-1000-8000-0026BB765291",
  Mute = "0000011A-0000-1000-8000-0026BB765291",
  Name = "00000023-0000-1000-8000-0026BB765291",
  ObstructionDetected = "00000024-0000-1000-8000-0026BB765291",
  OccupancyDetected = "00000071-0000-1000-8000-0026BB765291",
  On = "00000025-0000-1000-8000-0026BB765291",
  OutletInUse = "00000026-0000-1000-8000-0026BB765291",
  PositionState = "00000072-0000-1000-8000-0026BB765291",
  PowerModeSelection = "000000DF-0000-1000-8000-0026BB765291",
  ProgrammableSwitchEvent = "00000073-0000-1000-8000-0026BB765291",
  ProgrammableSwitchOutputState = "00000074-0000-1000-8000-0026BB765291",
  Reachable = "00000063-0000-1000-8000-0026BB765291",
  RemoteKey = "000000E1-0000-1000-8000-0026BB765291",
  RotationDirection = "00000028-0000-1000-8000-0026BB765291",
  RotationSpeed = "00000029-0000-1000-8000-0026BB765291",
  Saturation = "0000002F-0000-1000-8000-0026BB765291",
  SecuritySystemAlarmType = "0000008E-0000-1000-8000-0026BB765291",
  SecuritySystemCurrentState = "00000066-0000-1000-8000-0026BB765291",
  SecuritySystemTargetState = "00000067-0000-1000-8000-0026BB765291",
  SerialNumber = "00000030-0000-1000-8000-0026BB765291",
  SleepDiscoveryMode = "000000E8-0000-1000-8000-0026BB765291",
  SmokeDetected = "00000076-0000-1000-8000-0026BB765291",
  SoftwareRevision = "00000054-0000-1000-8000-0026BB765291",
  StatusActive = "00000075-0000-1000-8000-0026BB765291",
  StatusFault = "00000077-0000-1000-8000-0026BB765291",
  StatusJammed = "00000078-0000-1000-8000-0026BB765291",
  StatusLowBattery = "00000079-0000-1000-8000-0026BB765291",
  StatusTampered = "0000007A-0000-1000-8000-0026BB765291",
  SupportedCharacteristicValueTransitionConfiguration = "00000144-0000-1000-8000-0026BB765291",
  TargetDoorState = "00000032-0000-1000-8000-0026BB765291",
  TargetHeatingCoolingState = "00000033-0000-1000-8000-0026BB765291",
  TargetHorizontalTiltAngle = "0000007B-0000-1000-8000-0026BB765291",
  TargetPosition = "0000007C-0000-1000-8000-0026BB765291",
  TargetRelativeHumidity = "00000034-0000-1000-8000-0026BB765291",
  TargetTemperature = "00000035-0000-1000-8000-0026BB765291",
  TargetVerticalTiltAngle = "0000007D-0000-1000-8000-0026BB765291",
  TargetVisibilityState = "00000134-0000-1000-8000-0026BB765291",
  TemperatureDisplayUnits = "00000036-0000-1000-8000-0026BB765291",
  Version = "00000037-0000-1000-8000-0026BB765291",
  Volume = "00000119-0000-1000-8000-0026BB765291",
  VolumeControlType = "000000E9-0000-1000-8000-0026BB765291",
  VolumeSelector = "000000EA-0000-1000-8000-0026BB765291",
}

export const HAP_SERVICE_TYPE_2_ALICE_DEVICE_TYPE: { [K in HapServiceType]?: AliceDeviceType } = {
  [HapServiceType.Lightbulb]: AliceDeviceType.Light,
  [HapServiceType.Switch]: AliceDeviceType.Switch,
  [HapServiceType.Outlet]: AliceDeviceType.Socket,
  [HapServiceType.Television]: AliceDeviceType.TV,
  [HapServiceType.TelevisionSpeaker]: AliceDeviceType.MediaDevice,
  // Not supported yet
  [HapServiceType.AirQualitySensor]: AliceDeviceType.Other,
  [HapServiceType.BatteryService]: AliceDeviceType.Other,
  [HapServiceType.BridgingState]: AliceDeviceType.Other,
  [HapServiceType.CarbonDioxideSensor]: AliceDeviceType.Other,
  [HapServiceType.CarbonMonoxideSensor]: AliceDeviceType.Other,
  [HapServiceType.ContactSensor]: AliceDeviceType.Other,
  [HapServiceType.Door]: AliceDeviceType.Other,
  [HapServiceType.Fan]: AliceDeviceType.Other,
  [HapServiceType.GarageDoorOpener]: AliceDeviceType.Other,
  [HapServiceType.HumiditySensor]: AliceDeviceType.Other,
  [HapServiceType.LeakSensor]: AliceDeviceType.Other,
  [HapServiceType.LightSensor]: AliceDeviceType.Other,
  [HapServiceType.LockManagement]: AliceDeviceType.Other,
  [HapServiceType.LockMechanism]: AliceDeviceType.Other,
  [HapServiceType.MotionSensor]: AliceDeviceType.Other,
  [HapServiceType.OccupancySensor]: AliceDeviceType.Other,
  [HapServiceType.SecuritySystem]: AliceDeviceType.Other,
  [HapServiceType.SmokeSensor]: AliceDeviceType.Other,
  [HapServiceType.StatefulProgrammableSwitch]: AliceDeviceType.Other,
  [HapServiceType.StatelessProgrammableSwitch]: AliceDeviceType.Other,
  [HapServiceType.TemperatureSensor]: AliceDeviceType.Other,
  [HapServiceType.Thermostat]: AliceDeviceType.Other,
  [HapServiceType.Window]: AliceDeviceType.Other,
  [HapServiceType.WindowCovering]: AliceDeviceType.Other,
};
