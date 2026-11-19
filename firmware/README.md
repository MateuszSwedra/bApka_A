# Firmware ESP32 (bApka)

Na razie tylko **testy sprzętowe**, bez integracji z aplikacją / backendem.

## Wymagania

- ESP32-WROOM (DevKit) + kabel USB (data, nie „charge-only”)
- Wtyczka **PlatformIO IDE** w Cursor (już macie) + PlatformIO Core

## Test LED + buzzer — PlatformIO

Projekt: [`esp32_smoke_test/`](esp32_smoke_test/) (`platformio.ini` + `src/main.cpp`)

Pinout testu:
- LED: GPIO **33, 25, 26, 27, 14, 21, 13**
- Buzzer (aktywny): GPIO **32**

Zachowanie: co **2 s** kolejna lampka + krótki bip.

1. Podłącz płytkę USB (i okablowanie LED/buzzer → GND wspólne, + przez rezystor 220 Ω do GPIO).
2. PlatformIO: **Build** → **Upload** → **Serial Monitor** (115200).
3. Sukces = kolejno świecą 7 LED + słychać bip przy każdej zmianie.

### CLI (opcjonalnie)

Z katalogu `firmware/esp32_smoke_test`:

```bash
pio run
pio run -t upload
pio device monitor
```

Lista portów: `pio device list`  
Jeśli upload nie trafia w COM: w `platformio.ini` odkomentuj `upload_port = COMx`.

Jeśli dioda nie miga, a Serial działa: zmień `LED_PIN` w `src/main.cpp` (często `2`, czasem `8`).

## Następne kroki (później)

- Test buzzera / przycisków / 7 LED / DS3231
- SoftAP + provisioning
- Integracja z API bApka na Render
