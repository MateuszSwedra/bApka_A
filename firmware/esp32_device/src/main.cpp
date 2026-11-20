#include <Arduino.h>
#include <WiFi.h>

#include "api_client.h"
#include "device_config.h"
#include "hardware.h"
#include "pins.h"
#include "provision.h"
#include "storage.h"

static DeviceConfig gCfg;
static uint32_t lastPollMs = 0;
static bool lastAlarm = false;

static bool holdBootForReset() {
  pinMode(FACTORY_RESET_PIN, INPUT_PULLUP);
  Serial.println(F("Hold BOOT 1.5s to factory-reset..."));

  const uint32_t windowEnd = millis() + 6000;
  while (millis() < windowEnd) {
    if (digitalRead(FACTORY_RESET_PIN) == LOW) {
      Serial.println(F("BOOT held..."));
      const uint32_t holdStart = millis();
      while (digitalRead(FACTORY_RESET_PIN) == LOW) {
        if (millis() - holdStart > 1500) {
          Serial.println(F("Factory reset"));
          return true;
        }
        delay(20);
      }
      Serial.println(F("Released too early"));
    }
    delay(30);
  }
  return false;
}

static void enterWorkMode() {
  Serial.println(F("=== WORK mode ==="));
  Serial.printf("API %s\n", gCfg.apiBaseUrl.c_str());
  Serial.printf("deviceId %s publicId %s\n", gCfg.deviceId.c_str(),
                gCfg.publicId.c_str());
  lastPollMs = 0;
}

static bool finishPendingClaim() {
  if (!gCfg.pendingClaim || gCfg.pendingClaimToken.length() < 6) {
    return false;
  }
  if (gCfg.wifiSsid.length() == 0) {
    return false;
  }

  Serial.println(F("Pending claim — STA connect..."));
  if (!wifiConnect(gCfg)) {
    Serial.println(F("WiFi FAIL — SoftAP"));
    return false;
  }

  String err;
  if (!apiClaim(gCfg, gCfg.pendingClaimToken, err)) {
    Serial.print(F("Claim FAIL: "));
    Serial.println(err);
    storageClearPendingClaim();
    return false;
  }

  if (!storageSave(gCfg)) {
    Serial.println(F("NVS save FAIL"));
    return false;
  }

  Serial.println(F("Claim OK"));
  return true;
}

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.begin(115200);
  delay(400);
  Serial.println();
  Serial.println(F("=== bApka ESP32 ==="));

  hardwareBegin();
  hardwareBuzzerOff();

  if (holdBootForReset()) {
    storageClear();
    Serial.println(F("NVS cleared"));
  }
  hardwareBuzzerOff();

  storageLoad(gCfg);

  if (gCfg.configured) {
    Serial.println(F("NVS config — WiFi..."));
    if (wifiConnect(gCfg)) {
      enterWorkMode();
      return;
    }
    Serial.println(F("WiFi FAIL — SoftAP"));
  } else if (finishPendingClaim()) {
    enterWorkMode();
    return;
  }

  runProvisioningPortal(gCfg);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("WiFi lost — reconnect"));
    hardwareAllLedsOff();
    hardwareBuzzerOff();
    if (!wifiConnect(gCfg)) {
      delay(5000);
      return;
    }
  }

  const uint32_t now = millis();
  if (lastPollMs != 0 && (now - lastPollMs) < POLL_INTERVAL_MS) {
    if (lastAlarm) {
      hardwareBeep(120);
      hardwareBuzzerOff();
      delay(2000);
    } else {
      hardwareBuzzerOff();
      delay(50);
    }
    return;
  }
  lastPollMs = now;

  DeviceState state;
  String err;
  if (!apiGetState(gCfg, state, err)) {
    Serial.print(F("state FAIL: "));
    Serial.println(err);
    hardwareAllLedsOff();
    hardwareBuzzerOff();
    lastAlarm = false;
    return;
  }

  Serial.printf("state OK weekday=%d alarm=%d\n", state.weekday,
                state.shouldAlarm ? 1 : 0);

  if (state.shouldAlarm) {
    hardwareSetWeekdayLed(state.weekday);
    lastAlarm = true;
  } else {
    hardwareSetWeekdayLed(state.weekday);
    delay(200);
    hardwareAllLedsOff();
    hardwareBuzzerOff();
    lastAlarm = false;
  }
}
