import { env } from "process";

function required(var_name: string): string {
  const value = env[var_name];
  if (value === undefined) {
    throw new Error(`Variable ${var_name} must be specified`);
  }

  return value;
}

function bool(var_name: string): Maybe<boolean> {
  const value = env[var_name];
  if (value === undefined) {
    return;
  }

  return !["false", "0", "no"].some((val) => val === value.toLowerCase());
}

export const config = {
  brokerUrl: required("BROKER_URL"),
  debug: bool(`DEBUG`) ?? false,
  pin: required("PIN"),
};

console.log("Configuration", JSON.stringify(config, null, 2));
