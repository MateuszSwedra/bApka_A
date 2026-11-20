#include "hardware.h"
#include "pins.h"

void hardwareBegin() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

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

void hardwareBuzzerOff() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
}

void hardwareSetWeekdayLed(int weekday0to6) {
  hardwareAllLedsOff();
  if (weekday0to6 >= 0 && weekday0to6 < 7) {
    digitalWrite(LED_PINS[weekday0to6], HIGH);
  }
}

void hardwareBeep(uint32_t ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}

void hardwareAlarmPattern(bool on) {
  if (!on) {
    digitalWrite(BUZZER_PIN, LOW);
    return;
  }
  digitalWrite(BUZZER_PIN, HIGH);
  delay(120);
  digitalWrite(BUZZER_PIN, LOW);
}
