#include "api_client.h"
#include "device_config.h"
#include "wifi_mac.h"
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

static String trimSlash(String base) {
  while (base.endsWith("/")) {
    base.remove(base.length() - 1);
  }
  return base;
}

bool wifiConnect(const DeviceConfig &cfg) {
  wifiPrepareStaMode();
  WiFi.disconnect(false, false);
  delay(300);

  Serial.printf("WiFi connecting to '%s'\n", cfg.wifiSsid.c_str());
  Serial.printf("pass len=%d\n", cfg.wifiPass.length());

  WiFi.begin(cfg.wifiSsid.c_str(), cfg.wifiPass.c_str());

  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > WIFI_CONNECT_TIMEOUT_MS) {
      Serial.printf("WiFi FAIL status=%d\n", (int)WiFi.status());
      return false;
    }
    Serial.printf(" status=%d\n", (int)WiFi.status());
    delay(1000);
  }

  Serial.print(F("WiFi OK, IP="));
  Serial.println(WiFi.localIP());
  return true;
}

static bool httpsPostJson(
    const String &url,
    const String &bearer,
    const String &body,
    int &statusCode,
    String &responseBody,
    String &errorOut) {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  if (!https.begin(client, url)) {
    errorOut = "https.begin failed";
    return false;
  }
  https.setTimeout(20000);
  https.addHeader("Content-Type", "application/json");
  if (bearer.length() > 0) {
    https.addHeader("Authorization", "Bearer " + bearer);
  }

  statusCode = https.POST(body);
  responseBody = https.getString();
  https.end();

  if (statusCode < 200 || statusCode >= 300) {
    errorOut = "HTTP " + String(statusCode) + ": " + responseBody;
    return false;
  }
  return true;
}

static bool httpsGet(
    const String &url,
    const String &bearer,
    int &statusCode,
    String &responseBody,
    String &errorOut) {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  if (!https.begin(client, url)) {
    errorOut = "https.begin failed";
    return false;
  }
  https.setTimeout(20000);
  if (bearer.length() > 0) {
    https.addHeader("Authorization", "Bearer " + bearer);
  }

  statusCode = https.GET();
  responseBody = https.getString();
  https.end();

  if (statusCode < 200 || statusCode >= 300) {
    errorOut = "HTTP " + String(statusCode) + ": " + responseBody;
    return false;
  }
  return true;
}

bool apiClaim(DeviceConfig &cfg, const String &claimToken, String &errorOut) {
  const String url = trimSlash(cfg.apiBaseUrl) + "/iot/devices/claim";
  JsonDocument doc;
  doc["claimToken"] = claimToken;
  if (cfg.publicId.length() > 0) {
    doc["publicId"] = cfg.publicId;
  }
  String body;
  serializeJson(doc, body);

  int code = 0;
  String resp;
  if (!httpsPostJson(url, "", body, code, resp, errorOut)) {
    return false;
  }

  JsonDocument out;
  DeserializationError err = deserializeJson(out, resp);
  if (err) {
    errorOut = String("JSON claim: ") + err.c_str();
    return false;
  }

  const char *secret = out["deviceSecret"];
  if (!secret || !*secret) {
    errorOut = "Brak deviceSecret w odpowiedzi";
    return false;
  }

  cfg.deviceSecret = secret;
  if (out["deviceId"].is<const char *>()) {
    cfg.deviceId = out["deviceId"].as<const char *>();
  }
  if (out["publicId"].is<const char *>()) {
    cfg.publicId = out["publicId"].as<const char *>();
  }
  cfg.configured = true;
  return true;
}

bool apiGetState(const DeviceConfig &cfg, DeviceState &state, String &errorOut) {
  const String url = trimSlash(cfg.apiBaseUrl) + "/iot/device/me/state";
  int code = 0;
  String resp;
  if (!httpsGet(url, cfg.deviceSecret, code, resp, errorOut)) {
    state.ok = false;
    return false;
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, resp);
  if (err) {
    errorOut = String("JSON state: ") + err.c_str();
    state.ok = false;
    return false;
  }

  state.ok = true;
  state.rawJson = resp;
  state.weekday = doc["weekday"] | 0;
  state.shouldAlarm = doc["shouldAlarm"] | false;
  return true;
}
