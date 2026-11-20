# Firmware ESP32 (bApka)

## Device (`esp32_device/`)

Production firmware: SoftAP → claim → API poll. See [`esp32_device/README.md`](esp32_device/README.md).

## Smoke test (`esp32_smoke_test/`)

LED + buzzer hardware check.

- LED: GPIO 33, 25, 26, 27, 14, 21, 13
- Buzzer: GPIO 32

```powershell
cd firmware/esp32_smoke_test
pio run -t upload
pio device monitor
```

## Wi‑Fi minimal (`esp32_wifi_minimal/`)

Optional STA connectivity test (PlatformIO).
