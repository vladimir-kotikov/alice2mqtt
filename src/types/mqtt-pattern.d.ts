declare module "mqtt-pattern" {
  export function exec<T = Record<string, string>>(pattern: string, topic: string): T;
}
