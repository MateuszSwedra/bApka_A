#pragma once

#include "device_config.h"
#include <ArduinoJson.h>

struct DeviceState {
  bool ok = false;
  int weekday = 0;
  bool shouldAlarm = false;
  String rawJson;
};

bool wifiConnect(const DeviceConfig &cfg);
bool apiClaim(DeviceConfig &cfg, const String &claimToken, String &errorOut);
bool apiGetState(const DeviceConfig &cfg, DeviceState &state, String &errorOut);
