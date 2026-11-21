# ESP32 — bApka device

SoftAP provisioning → Wi‑Fi → claim → poll `GET /iot/device/me/state`.

## Build / upload

```powershell
cd firmware/esp32_device
pio run -t upload
pio device monitor
```

Default port: COM9 (`platformio.ini`). CH340 boards use `--no-stub`.

## SoftAP

- SSID: `bApka-Setup`
- Password: `bapka1234`
- Portal: http://192.168.4.1

Use a claim code from the caretaker app (`Dodaj płytkę IoT`) or `POST /iot/devices/prepare`.

## Factory reset

Hold **BOOT** ~1.5 s within the first seconds after boot to clear NVS.

## Pins

| GPIO | Role |
|------|------|
| 33, 25, 26, 27, 14, 12, 13 | Weekday LEDs (Mon…Sun) |
| 32 | Buzzer |
| 4 | SOS button (to GND) |
| 0 | BOOT / factory reset |
