/**
 * bApka — test 7 LED + buzzer (bez Wi‑Fi / API)
 *
 * Co 2 s: następna lampka ON, poprzednia OFF + krótki dźwięk buzzera.
 *
 * LED:  GPIO 33, 25, 26, 27, 14, 21, 13
 * Buzzer (aktywny): GPIO 32
 */

#include <Arduino.h>

static const int LED_PINS[] = {33, 25, 26, 27, 14, 12, 13};
static const size_t LED_COUNT = sizeof(LED_PINS) / sizeof(LED_PINS[0]);
static const int BUZZER_PIN = 32;

static const uint32_t STEP_MS = 2000;
static const uint32_t BEEP_MS = 150;

static size_t currentLed = 0;

static void allLedsOff() {
  for (size_t i = 0; i < LED_COUNT; i++) {
    digitalWrite(LED_PINS[i], LOW);
  }
}

static void beep() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(BEEP_MS);
  digitalWrite(BUZZER_PIN, LOW);
}

void setup() {
  Serial.begin(115200);
  delay(300);

  for (size_t i = 0; i < LED_COUNT; i++) {
    pinMode(LED_PINS[i], OUTPUT);
  }
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  allLedsOff();

  Serial.println();
  Serial.println(F("=== bApka LED + buzzer test ==="));
  Serial.println(F("Cycle every 2s, beep on each step."));
}

void loop() {
  allLedsOff();
  digitalWrite(LED_PINS[currentLed], HIGH);

  Serial.print(F("LED GPIO "));
  Serial.print(LED_PINS[currentLed]);
  Serial.println(F(" ON + beep"));

  beep();

  currentLed = (currentLed + 1) % LED_COUNT;
  delay(STEP_MS - BEEP_MS);
}
