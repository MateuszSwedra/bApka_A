#include "hardware.h"
#include "pins.h"

static inline void buzzerWriteOn() {
  digitalWrite(BUZZER_PIN, BUZZER_ACTIVE_LOW ? LOW : HIGH);
}

static inline void buzzerWriteOff() {
  digitalWrite(BUZZER_PIN, BUZZER_ACTIVE_LOW ? HIGH : LOW);
}

void hardwareBegin() {
  pinMode(BUZZER_PIN, OUTPUT);
  buzzerWriteOff();

  for (int i = 0; i < 7; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW);
  }
}

void hardwareAllLedsOff() {
  for (int i = 0; i < 7; i++) {
    digitalWrite(LED_PINS[i], LOW);
  }
}

void hardwareAllLedsOn() {
  for (int i = 0; i < 7; i++) {
    digitalWrite(LED_PINS[i], HIGH);
  }
}

void hardwareBuzzerOff() {
  pinMode(BUZZER_PIN, OUTPUT);
  buzzerWriteOff();
}

void hardwareSetWeekdayLed(int weekday0to6) {
  hardwareAllLedsOff();
  if (weekday0to6 >= 0 && weekday0to6 < 7) {
    digitalWrite(LED_PINS[weekday0to6], HIGH);
  }
}

void hardwareBeep(uint32_t ms) {
  buzzerWriteOn();
  delay(ms);
  buzzerWriteOff();
}

void hardwareAlarmPattern(bool on) {
  if (!on) {
    buzzerWriteOff();
    return;
  }
  buzzerWriteOn();
  delay(120);
  buzzerWriteOff();
}

void hardwareSosBegin() {
  pinMode(SOS_PIN, INPUT_PULLUP);
}

bool hardwareSosPressedRaw() {
  return digitalRead(SOS_PIN) == LOW;
}
