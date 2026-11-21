#include <Arduino.h>
#include <WiFi.h>

#include "api_client.h"
#include "device_config.h"
#include "hardware.h"
#include "pins.h"
#include "provision.h"
#include "sos.h"
#include "storage.h"

static DeviceConfig gCfg;
static uint32_t lastPollMs = 0;
static bool apiWantsAlarm = false;
static bool alarmMuted = false;
static uint32_t alarmStartedMs = 0;
static int alarmWeekday = 0;

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
  apiWantsAlarm = false;
  alarmMuted = false;
  alarmStartedMs = 0;
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

static void runAlarmTick() {
  sosPoll(gCfg);

  if (!apiWantsAlarm) {
    alarmMuted = false;
    alarmStartedMs = 0;
    hardwareBuzzerOff();
    return;
  }

  if (alarmStartedMs == 0) {
    alarmStartedMs = millis();
    alarmMuted = false;
    Serial.println(F("Alarm start (max 60s)"));
  }

  if (!alarmMuted && (millis() - alarmStartedMs) >= ALARM_MAX_MS) {
    alarmMuted = true;
    hardwareBuzzerOff();
    Serial.println(F("Alarm muted after 60s"));
  }

  hardwareSetWeekdayLed(alarmWeekday);

  if (alarmMuted) {
    delay(200);
    return;
  }

  hardwareBeep(BEEP_MS);
  hardwareBuzzerOff();
  delay(ALARM_GAP_MS);
}

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_ACTIVE_LOW ? HIGH : LOW);

  Serial.begin(115200);
  delay(400);
  Serial.println();
  Serial.println(F("=== bApka ESP32 ==="));

  hardwareBegin();
  sosBegin();
  hardwareBuzzerOff();

  if (holdBootForReset()) {
    storageClear();
    Serial.println(F("NVS cleared"));
  }
  hardwareBuzzerOff();

  storageLoad(gCfg);

  if (gCfg.configured) {
    Serial.println(F("NVS config — WiFi..."));
    for (int attempt = 1; attempt <= 5; attempt++) {
      Serial.printf("WiFi try %d/5\n", attempt);
      if (wifiConnect(gCfg)) {
        enterWorkMode();
        return;
      }
      delay(2000);
    }
    Serial.println(F("WiFi pending — WORK without link"));
    enterWorkMode();
    return;
  }

  if (finishPendingClaim()) {
    enterWorkMode();
    return;
  }

  runProvisioningPortal(gCfg);
}

void loop() {
  sosPoll(gCfg);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("WiFi lost — reconnect"));
    hardwareAllLedsOff();
    hardwareBuzzerOff();
    apiWantsAlarm = false;
    if (!wifiConnect(gCfg)) {
      delay(5000);
      return;
    }
  }

  const uint32_t now = millis();
  if (lastPollMs != 0 && (now - lastPollMs) < POLL_INTERVAL_MS) {
    runAlarmTick();
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
    apiWantsAlarm = false;
    return;
  }

  Serial.printf("state OK weekday=%d alarm=%d\n", state.weekday,
                state.shouldAlarm ? 1 : 0);

  alarmWeekday = state.weekday;
  if (state.shouldAlarm) {
    if (!apiWantsAlarm) {
      alarmStartedMs = 0;
      alarmMuted = false;
    }
    apiWantsAlarm = true;
    hardwareSetWeekdayLed(alarmWeekday);
  } else {
    apiWantsAlarm = false;
    alarmMuted = false;
    alarmStartedMs = 0;
    hardwareSetWeekdayLed(alarmWeekday);
    delay(200);
    hardwareAllLedsOff();
    hardwareBuzzerOff();
  }
}
