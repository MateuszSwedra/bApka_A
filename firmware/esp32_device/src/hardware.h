#pragma once

#include <Arduino.h>

void hardwareBegin();
void hardwareAllLedsOff();
void hardwareBuzzerOff();
void hardwareSetWeekdayLed(int weekday0to6);
void hardwareBeep(uint32_t ms = 200);
void hardwareAlarmPattern(bool on);
