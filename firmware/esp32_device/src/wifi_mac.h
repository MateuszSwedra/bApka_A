#pragma once

#include <esp_wifi.h>

bool wifiNeedsSoftMac();
bool wifiForceSoftMac(wifi_interface_t ifx);
void wifiPrepareStaMode();
void wifiPrepareApMode();
