#include "storage.h"
#include <Preferences.h>

static Preferences prefs;

bool storageLoad(DeviceConfig &cfg) {
  if (!prefs.begin("bapka", true)) {
    return false;
  }
  cfg.wifiSsid = prefs.getString("wifiSsid", "");
  cfg.wifiPass = prefs.getString("wifiPass", "");
  cfg.apiBaseUrl = prefs.getString("apiBase", DEFAULT_API_BASE);
  cfg.deviceSecret = prefs.getString("secret", "");
  cfg.publicId = prefs.getString("publicId", "");
  cfg.deviceId = prefs.getString("deviceId", "");
  cfg.pendingClaimToken = prefs.getString("claimTok", "");
  cfg.pendingClaim = prefs.getBool("pendClaim", false);
  cfg.configured =
      cfg.wifiSsid.length() > 0 && cfg.deviceSecret.length() > 0;
  prefs.end();
  return cfg.configured;
}

bool storageSave(const DeviceConfig &cfg) {
  if (!prefs.begin("bapka", false)) {
    return false;
  }
  prefs.putString("wifiSsid", cfg.wifiSsid);
  prefs.putString("wifiPass", cfg.wifiPass);
  prefs.putString("apiBase", cfg.apiBaseUrl);
  prefs.putString("secret", cfg.deviceSecret);
  prefs.putString("publicId", cfg.publicId);
  prefs.putString("deviceId", cfg.deviceId);
  prefs.putBool("pendClaim", false);
  prefs.putString("claimTok", "");
  prefs.end();
  return true;
}

bool storageSavePendingProvision(const DeviceConfig &cfg, const String &claimToken) {
  if (!prefs.begin("bapka", false)) {
    return false;
  }
  prefs.putString("wifiSsid", cfg.wifiSsid);
  prefs.putString("wifiPass", cfg.wifiPass);
  prefs.putString("apiBase", cfg.apiBaseUrl);
  prefs.putString("publicId", cfg.publicId);
  prefs.putString("claimTok", claimToken);
  prefs.putBool("pendClaim", true);
  prefs.putString("secret", "");
  prefs.end();
  return true;
}

void storageClearPendingClaim() {
  if (!prefs.begin("bapka", false)) {
    return;
  }
  prefs.putBool("pendClaim", false);
  prefs.putString("claimTok", "");
  prefs.end();
}

void storageClear() {
  if (prefs.begin("bapka", false)) {
    prefs.clear();
    prefs.end();
  }
}
