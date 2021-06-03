**Alice2MQTT**

This is Yandex Alice API commands handler implemented as an MQTT RPC service using a very simple protocol.

This is _heavily_ modified version of [G-On Alice plugin for Homebridge](https://github.com/G-On-dev/homebridge-g-on-alice.git) rewritten in typescript, modified to be able to connect to any compliant server, not only G-On proprietary one and with all homebridge-related code removed so that it can be run as a standalone service.

## Run:

1. Via docker

   docker build -t alice2mqtt && docker run --rm alice2mqtt

2. As NPM package

   npm i && npm run build && npm start

## Configuration

- `BROKER_URL` - an MQTT broker url (e.g. `mqtt:/localhost:1883`). Required.
- `PIN` - Homebridge's PIN code. Only one pin code is supported. Required.
- `DEBUG` - [debug's](https://www.npmjs.com/package/debug) tag. The app emits debug logs with `alice2mqtt` tag

# Credits

This particular implementation is heavily rewritten version of https://github.com/G-On-dev/homebridge-g-on-alice.git

This implementation of Alice plugin would have been impossible without them.

- NorthernMan54 - for the actual implementation of the `homebridge-alexa` plugin
- G-On - for their Alice plugin and inspiration ;)
