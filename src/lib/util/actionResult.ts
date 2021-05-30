import {
  ActionResult,
  AliceCapabilityActionResult,
  AliceDeviceCapabilityState,
  AliceErrorCode,
} from "../../types/alice";

export function capabilityActionResult(
  { type, state: { instance } }: AliceDeviceCapabilityState,
  action_result: ActionResult
): AliceCapabilityActionResult {
  return { type, state: { instance, action_result } };
}

export function errorActionResult(error_code: AliceErrorCode, error_message: string): ActionResult {
  return { status: "ERROR", error_code, error_message };
}
