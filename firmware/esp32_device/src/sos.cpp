#include "sos.h"

#include "api_client.h"
#include "device_config.h"
#include "hardware.h"
#include "pins.h"

#include <Arduino.h>
#include <WiFi.h>

static uint32_t sosLowSinceMs = 0;
static bool sosArmed = true;
static uint32_t sosCooldownUntilMs = 0;
static uint32_t sosEventSeq = 0;

static void sosFeedbackOk() {
  hardwareAllLedsOn();
  hardwareBeep(180);
  delay(80);
  hardwareBeep(180);
  hardwareAllLedsOff();
}

static void sosFeedbackLocal() {
  hardwareAllLedsOn();
  hardwareBeep(120);
  delay(40);
  hardwareAllLedsOff();
}

static void sosFeedbackFail() {
  hardwareBeep(80);
  delay(60);
  hardwareBeep(80);
  delay(60);
  hardwareBeep(80);
}

void sosBegin() {
  hardwareSosBegin();
  sosLowSinceMs = 0;
  sosArmed = true;
  sosCooldownUntilMs = 0;
}

void sosPoll(DeviceConfig &cfg) {
  const uint32_t now = millis();
  const bool pressed = hardwareSosPressedRaw();

  if (!pressed) {
    sosLowSinceMs = 0;
    sosArmed = true;
    return;
  }

  if (sosLowSinceMs == 0) {
    sosLowSinceMs = now;
    return;
  }
  if ((now - sosLowSinceMs) < SOS_DEBOUNCE_MS) {
    return;
  }
  if (!sosArmed) {
    return;
  }
  if ((int32_t)(now - sosCooldownUntilMs) < 0) {
    Serial.println(F("SOS cooldown"));
    sosArmed = false;
    return;
  }

  sosArmed = false;
  sosCooldownUntilMs = now + SOS_COOLDOWN_MS;
  sosEventSeq++;

  Serial.printf("SOS press gpio=%d seq=%lu\n", SOS_PIN,
                (unsigned long)sosEventSeq);

  if (!cfg.configured || cfg.deviceSecret.length() == 0) {
    Serial.println(F("SOS local (not claimed)"));
    sosFeedbackLocal();
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("SOS no WiFi"));
    sosFeedbackFail();
    return;
  }

  char eventId[40];
  snprintf(eventId, sizeof(eventId), "sos-%lu-%lu", (unsigned long)now,
           (unsigned long)sosEventSeq);

  Serial.printf("SOS POST %s\n", eventId);
  String err;
  if (apiSos(cfg, "ESP32 SOS button", String(eventId), err)) {
    Serial.println(F("SOS OK"));
    sosFeedbackOk();
  } else {
    Serial.print(F("SOS FAIL: "));
    Serial.println(err);
    sosFeedbackFail();
  }
}
