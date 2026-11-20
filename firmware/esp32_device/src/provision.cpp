#include "provision.h"
#include "device_config.h"
#include "hardware.h"
#include "storage.h"
#include "wifi_mac.h"
#include <ArduinoJson.h>
#include <WebServer.h>
#include <WiFi.h>

static WebServer server(80);
static DeviceConfig *gCfg = nullptr;
static bool gRestartPending = false;

static const char INDEX_HTML[] PROGMEM = R"HTML(
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>bApka setup</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:420px;margin:24px auto;padding:0 16px;background:#f4f6f8}
    h1{font-size:1.25rem}
    label{display:block;margin-top:12px;font-weight:600}
    input{width:100%;padding:10px;margin-top:4px;box-sizing:border-box}
    button{margin-top:16px;width:100%;padding:12px;font-size:1rem;background:#456882;color:#fff;border:0;border-radius:8px}
    .hint{color:#555;font-size:.9rem}
  </style>
</head>
<body>
  <h1>bApka — konfiguracja</h1>
  <p class="hint">Podaj Wi‑Fi 2.4 GHz oraz kod z aplikacji opiekuna.</p>
  <form method="POST" action="/provision">
    <label>Wi-Fi SSID
      <input name="ssid" required placeholder="Nazwa sieci"/>
    </label>
    <label>Hasło Wi-Fi
      <input name="password" type="password" placeholder="Hasło"/>
    </label>
    <label>Kod z aplikacji
      <input name="claimToken" required placeholder="kod" autocomplete="off"
             style="letter-spacing:2px;font-size:1.25rem;text-transform:uppercase"/>
    </label>
    <label>publicId (opcjonalnie)
      <input name="publicId" placeholder="np. WHGY"/>
    </label>
    <label>API URL
      <input name="apiBaseUrl" value="https://bapka-a.onrender.com"/>
    </label>
    <button type="submit">Zapisz i restart</button>
  </form>
</body>
</html>
)HTML";

static void handleRoot() {
  server.send_P(200, "text/html", INDEX_HTML);
}

static void handleStatus() {
  JsonDocument doc;
  doc["mode"] = "config";
  doc["softAp"] = SOFTAP_SSID;
  String out;
  serializeJson(doc, out);
  server.send(200, "application/json", out);
}

static void handleProvision() {
  if (!gCfg) {
    server.send(500, "text/plain", "no cfg");
    return;
  }

  String ssid;
  String password;
  String claimToken;
  String publicId;
  String apiBaseUrl;

  if (server.hasArg("plain")) {
    JsonDocument doc;
    if (deserializeJson(doc, server.arg("plain"))) {
      server.send(400, "application/json", "{\"ok\":false,\"error\":\"bad json\"}");
      return;
    }
    ssid = String((const char *)(doc["ssid"] | ""));
    password = String((const char *)(doc["password"] | ""));
    claimToken = String((const char *)(doc["claimToken"] | ""));
    publicId = String((const char *)(doc["publicId"] | ""));
    apiBaseUrl = String((const char *)(doc["apiBaseUrl"] | DEFAULT_API_BASE));
  } else {
    ssid = server.arg("ssid");
    password = server.arg("password");
    claimToken = server.arg("claimToken");
    publicId = server.arg("publicId");
    apiBaseUrl = server.arg("apiBaseUrl");
  }

  ssid.trim();
  claimToken.trim();
  publicId.trim();
  apiBaseUrl.trim();
  if (apiBaseUrl.length() == 0) {
    apiBaseUrl = DEFAULT_API_BASE;
  }

  if (ssid.length() == 0 || claimToken.length() < 6) {
    server.send(400, "text/html",
                "<h3>Błąd</h3><p>Podaj SSID i kod.</p><a href='/'>Wróć</a>");
    return;
  }

  gCfg->wifiSsid = ssid;
  gCfg->wifiPass = password;
  gCfg->apiBaseUrl = apiBaseUrl;
  gCfg->publicId = publicId;

  if (!storageSavePendingProvision(*gCfg, claimToken)) {
    server.send(500, "text/html", "<h3>Błąd zapisu</h3>");
    return;
  }

  Serial.println(F("Provision saved — restart"));
  server.send(200, "text/html",
              "<h3>OK</h3><p>Urządzenie restartuje i łączy się z Wi‑Fi.</p>");
  delay(800);
  server.stop();
  gRestartPending = true;
}

bool runProvisioningPortal(DeviceConfig &cfg) {
  gCfg = &cfg;
  gRestartPending = false;

  wifiPrepareApMode();
  const bool ok = WiFi.softAP(SOFTAP_SSID, SOFTAP_PASS);
  Serial.printf("SoftAP %s (%s) IP=%s\n", SOFTAP_SSID, ok ? "OK" : "FAIL",
                WiFi.softAPIP().toString().c_str());

  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/provision", HTTP_POST, handleProvision);
  server.begin();

  Serial.println(F("http://192.168.4.1"));

  while (!gRestartPending) {
    server.handleClient();
    hardwareBuzzerOff();
    delay(5);
  }

  Serial.println(F("ESP.restart()"));
  delay(200);
  ESP.restart();
  return false;
}
