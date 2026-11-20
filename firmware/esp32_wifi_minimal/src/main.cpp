#include <Arduino.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_mac.h>

static volatile bool gotIp = false;
static volatile bool associated = false;
static volatile uint8_t lastReason = 0;

static const uint8_t kSoftMac[6] = {0x02, 0xBA, 0xA0, 0xB1, 0xC2, 0xD3};

static const char *discReason(uint8_t r) {
  switch (r) {
    case 15: return "4WAY_HANDSHAKE";
    case 201: return "NO_AP_FOUND";
    case 202: return "AUTH_FAIL";
    case 203: return "ASSOC_FAIL";
    case 204: return "HANDSHAKE_TIMEOUT";
    default: return "?";
  }
}

static void onWifiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_START:
      Serial.println(F("[evt] STA start"));
      break;
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      associated = true;
      Serial.println(F("[evt] associated"));
      break;
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      gotIp = true;
      Serial.print(F("[evt] GOT IP "));
      Serial.println(WiFi.localIP());
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      lastReason = info.wifi_sta_disconnected.reason;
      Serial.printf("[evt] disc reason=%u (%s)\n", (unsigned)lastReason,
                    discReason(lastReason));
      break;
    default:
      break;
  }
}

static String readLine(const char *prompt) {
  Serial.println(prompt);
  String line;
  while (true) {
    while (Serial.available()) {
      const char c = (char)Serial.read();
      if (c == '\n' || c == '\r') {
        if (line.length() > 0) return line;
      } else {
        line += c;
        Serial.print(c);
      }
    }
    delay(10);
  }
}

static void printMac(const char *label, const uint8_t *m) {
  Serial.printf("%s %02X:%02X:%02X:%02X:%02X:%02X\n", label, m[0], m[1], m[2],
                m[3], m[4], m[5]);
}

static bool macIsBad(const uint8_t *m) {
  for (int i = 0; i < 6; i++) {
    if (m[i] != 0x00) return false;
  }
  return true;
}

static bool forceStaMac() {
  uint8_t after[6] = {0};

  esp_err_t eStop = esp_wifi_stop();
  delay(50);
  esp_err_t eSet = esp_wifi_set_mac(WIFI_IF_STA, kSoftMac);
  esp_err_t eStart = esp_wifi_start();
  delay(100);

  esp_err_t eGet = esp_wifi_get_mac(WIFI_IF_STA, after);
  Serial.printf("stop=%d set_mac=%d start=%d get_mac=%d\n", (int)eStop,
                (int)eSet, (int)eStart, (int)eGet);
  printMac("STA MAC:", after);

  if (eSet != ESP_OK) return false;
  if (macIsBad(after) || memcmp(after, kSoftMac, 6) != 0) return false;
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println();
  Serial.println(F("=== WiFi STA test ==="));

  WiFi.onEvent(onWifiEvent);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(false);
  WiFi.setSleep(false);
  WiFi.mode(WIFI_STA);
  delay(200);

  uint8_t efuse[6] = {0};
  esp_read_mac(efuse, ESP_MAC_WIFI_STA);
  printMac("eFuse:", efuse);

  if (!forceStaMac()) {
    Serial.println(F("soft MAC failed"));
    return;
  }

  esp_wifi_set_ps(WIFI_PS_NONE);
  esp_wifi_set_max_tx_power(44);

  const String ssid = readLine("SSID:");
  Serial.println();
  const String pass = readLine("password:");
  Serial.println();

  Serial.println(F("scan..."));
  int matchIdx = -1;
  int bestRssi = -127;
  const int n = WiFi.scanNetworks(false, true);
  for (int i = 0; i < n; i++) {
    Serial.printf("  '%s' RSSI=%d ch=%d\n", WiFi.SSID(i).c_str(), WiFi.RSSI(i),
                  WiFi.channel(i));
    if (WiFi.SSID(i) == ssid && WiFi.RSSI(i) > bestRssi) {
      bestRssi = WiFi.RSSI(i);
      matchIdx = i;
    }
  }
  if (matchIdx < 0) {
    Serial.println(F("SSID not found"));
    return;
  }
  WiFi.scanDelete();
  forceStaMac();

  gotIp = false;
  associated = false;
  lastReason = 0;
  WiFi.begin(ssid.c_str(), pass.c_str());

  const uint32_t t0 = millis();
  while (!gotIp && millis() - t0 < 30000) {
    delay(1000);
    Serial.printf("  status=%d assoc=%d reason=%u\n", (int)WiFi.status(),
                  (int)associated, (unsigned)lastReason);
    if (!associated && lastReason == 203 && millis() - t0 > 10000) break;
  }

  if (gotIp || WiFi.status() == WL_CONNECTED) {
    Serial.print(F("SUCCESS IP="));
    Serial.println(WiFi.localIP());
  } else {
    Serial.printf("FAIL status=%d reason=%u (%s)\n", (int)WiFi.status(),
                  (unsigned)lastReason, discReason(lastReason));
    WiFi.mode(WIFI_OFF);
  }
}

void loop() {
  delay(15000);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("still OK IP=%s\n", WiFi.localIP().toString().c_str());
  }
}
