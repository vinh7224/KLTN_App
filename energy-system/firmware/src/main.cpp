1.3 Khung chương trình firmware/src/main.cpp:
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>

const char* WIFI_SSID = "...";
const char* WIFI_PASS = "...";
const char* MQTT_HOST = "192.168.1.10";
const char* DEV_ID    = "esp32-01";
const int RELAY_PIN = 26, FEEDBACK_PIN = 27;

PZEM004Tv30 pzem(Serial2, 16, 17);
WiFiClient net;
PubSubClient mqtt(net);
uint32_t seq = 0, bootId;
unsigned long lastRead = 0;
char tTele[48], tStatus[48], tCmd[48], tState[48];

void onMsg(char* topic, byte* data, unsigned int len) {
  JsonDocument d;
  if (deserializeJson(d, data, len)) return;
  bool on = d["on"];
  digitalWrite(RELAY_PIN, on ? HIGH : LOW);
  JsonDocument r;
  r["cmd_id"] = d["cmd_id"];
  r["cmd_on"] = on;
  r["ts"] = (uint32_t)time(nullptr);
  r["feedback"] = digitalRead(FEEDBACK_PIN) == LOW; // tiếp điểm phụ
  char buf[160]; serializeJson(r, buf);
  mqtt.publish(tState, buf, true);
}

void connectMqtt() {
  while (!mqtt.connected()) {
    if (mqtt.connect(DEV_ID, "user", "pass", tStatus, 1, true, "offline")) {
      mqtt.publish(tStatus, "online", true);
      mqtt.subscribe(tCmd, 1);
    } else delay(2000);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(FEEDBACK_PIN, INPUT_PULLUP);
  snprintf(tTele, 48, "energy/%s/telemetry", DEV_ID);
  snprintf(tStatus, 48, "energy/%s/status", DEV_ID);
  snprintf(tCmd, 48, "energy/%s/cmd/relay", DEV_ID);
  snprintf(tState, 48, "energy/%s/relay/state", DEV_ID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  configTime(0, 0, "pool.ntp.org");
  bootId = esp_random();
  mqtt.setServer(MQTT_HOST, 1883);
  mqtt.setCallback(onMsg);
  mqtt.setBufferSize(512);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) WiFi.reconnect();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();
  if (millis() - lastRead >= 1000) {
    lastRead += 1000;
    float v = pzem.voltage(), i = pzem.current(), p = pzem.power();
    float e = pzem.energy(), f = pzem.frequency(), pf = pzem.pf();
    JsonDocument d;
    d["id"] = DEV_ID; d["boot"] = bootId; d["seq"] = seq++;
    d["ts"] = (uint32_t)time(nullptr);
    if (isnan(v)) d["err"] = 1;
    else { d["v"]=v; d["i"]=i; d["p"]=p; d["e"]=e; d["f"]=f; d["pf"]=pf; }
    char buf[256]; serializeJson(d, buf);
    mqtt.publish(tTele, buf);
  }
}
