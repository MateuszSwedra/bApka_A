#include "wifi_mac.h"
#include <Arduino.h>
#include <WiFi.h>
#include <esp_mac.h>

static const uint8_t kStaMac[6] = {0x02, 0xBA, 0xA0, 0xB1, 0xC2, 0xD3};
static const uint8_t kApMac[6] = {0x02, 0xBA, 0xA0, 0xB1, 0xC2, 0xD4};

static void printMac(const char *label, const uint8_t *m) {
  Serial.printf("%s %02X:%02X:%02X:%02X:%02X:%02X\n", label, m[0], m[1], m[2],
                m[3], m[4], m[5]);
}

bool wifiNeedsSoftMac() {
  uint8_t m[6] = {0};
  esp_read_mac(m, ESP_MAC_WIFI_STA);
  for (int i = 0; i < 6; i++) {
    if (m[i] != 0x00) return false;
  }
  return true;
}

bool wifiForceSoftMac(wifi_interface_t ifx) {
  const uint8_t *mac = (ifx == WIFI_IF_AP) ? kApMac : kStaMac;

  if (ifx == WIFI_IF_AP) {
    WiFi.mode(WIFI_AP);
  } else {
    WiFi.mode(WIFI_STA);
  }
  delay(50);

  esp_err_t eStop = esp_wifi_stop();
  delay(50);
  esp_err_t eSet = esp_wifi_set_mac(ifx, mac);
  esp_err_t eStart = esp_wifi_start();
  delay(80);

  uint8_t got[6] = {0};
  esp_err_t eGet = esp_wifi_get_mac(ifx, got);
  Serial.printf("softMAC if=%d stop=%d set=%d start=%d get=%d\n", (int)ifx,
                (int)eStop, (int)eSet, (int)eStart, (int)eGet);
  printMac("  active:", got);

  return eSet == ESP_OK && eGet == ESP_OK && memcmp(got, mac, 6) == 0;
}

void wifiPrepareStaMode() {
  WiFi.persistent(false);
  WiFi.setAutoReconnect(false);
  WiFi.setSleep(false);
  WiFi.mode(WIFI_STA);
  delay(100);

  if (wifiNeedsSoftMac()) {
    Serial.println(F("Applying soft STA MAC"));
    if (!wifiForceSoftMac(WIFI_IF_STA)) {
      Serial.println(F("soft STA MAC failed"));
    }
  }

  esp_wifi_set_ps(WIFI_PS_NONE);
}

void wifiPrepareApMode() {
  WiFi.persistent(false);
  WiFi.setSleep(false);
  WiFi.mode(WIFI_AP);
  delay(100);

  if (wifiNeedsSoftMac()) {
    Serial.println(F("Applying soft AP MAC"));
    if (!wifiForceSoftMac(WIFI_IF_AP)) {
      Serial.println(F("soft AP MAC failed"));
    }
  }
}
