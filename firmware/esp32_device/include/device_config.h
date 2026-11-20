#pragma once

#include <Arduino.h>

inline constexpr char SOFTAP_SSID[] = "bApka-Setup";
inline constexpr char SOFTAP_PASS[] = "bapka1234";
inline constexpr char DEFAULT_API_BASE[] = "https://bapka-a.onrender.com";

static const uint32_t POLL_INTERVAL_MS = 10000;
static const uint32_t WIFI_CONNECT_TIMEOUT_MS = 45000;
static const uint32_t BEEP_MS = 200;

struct DeviceConfig {
  String wifiSsid;
  String wifiPass;
  String apiBaseUrl;
  String deviceSecret;
  String publicId;
  String deviceId;
  String pendingClaimToken;
  bool configured = false;
  bool pendingClaim = false;
};
