#pragma once

#include "device_config.h"

bool storageLoad(DeviceConfig &cfg);
bool storageSave(const DeviceConfig &cfg);
bool storageSavePendingProvision(const DeviceConfig &cfg, const String &claimToken);
void storageClearPendingClaim();
void storageClear();
