#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>

// Pins for sensors and components
#define PIR_PIN 3                 // PIR motion sensor pin
#define SMOKE_SENSOR_PIN A1       // Smoke sensor pin
#define DHT_PIN 2                 // DHT sensor pin
#define LED_PIN 13                // LED pin (shared for smoke sensor and PIR)
#define BELL_PIN 12               // Fire alarm bell pin

// PIR motion sensor variables
const unsigned long PIR_ACTIVE_DURATION = 120000; // 2 minutes
bool pirMotionDetected = false;
unsigned long pirMotionTimer = 0;
bool pirEnabled = false;  // Add PIR enable/disable flag

// Smoke sensor variables
const int SMOKE_THRESHOLD = 210;
const int SMOKE_HYSTERESIS = 5;
#define SAMPLE_SIZE 3             // Reduced from 10 to 3 for faster response
int smokeSamples[SAMPLE_SIZE];
int smokeIndex = 0;
int smokeTotal = 0;
bool smokeDetected = false;
unsigned long smokeAlarmTimer = 0;    // Timer for alarm duration
const unsigned long ALARM_DURATION = 10000; // 10 seconds in milliseconds

// DHT sensor variables
#define DHTTYPE DHT22
DHT_Unified dht(DHT_PIN, DHTTYPE);
uint32_t dhtDelayMS;

// Function prototypes
void addSmokeSample(int value);
int getSmokeAverage();
void printSensorData(float temperature, float humidity, const char* motionStatus, const char* smokeStatus);

void setup() {
  Serial.begin(9600);
  pinMode(PIR_PIN, INPUT);
  pinMode(SMOKE_SENSOR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BELL_PIN, OUTPUT);

  digitalWrite(LED_PIN, HIGH); // LED off (HIGH)
  digitalWrite(BELL_PIN, LOW); // Alarm off (LOW)

  dht.begin();
  sensor_t sensor;
  dht.temperature().getSensor(&sensor);
  dhtDelayMS = sensor.min_delay / 1000;

  for (int i = 0; i < SAMPLE_SIZE; i++) {
    smokeSamples[i] = 0;
  }
}

void loop() {
  // Check for commands from Node.js
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "PIR_ON") {
      pirEnabled = true;
      Serial.println("{\"status\":\"PIR enabled\"}");
    }
    else if (command == "PIR_OFF") {
      pirEnabled = false;
      pirMotionDetected = false;  // Reset motion detection when disabled
      digitalWrite(LED_PIN, HIGH); // Turn LED off
      Serial.println("{\"status\":\"PIR disabled\"}");
    }
  }

  // --- PIR Motion Sensor ---
  if (pirEnabled) {  // Only check PIR if enabled
    int pirState = digitalRead(PIR_PIN);
    if (pirState == HIGH) {
      pirMotionDetected = true;
      pirMotionTimer = millis();
      digitalWrite(LED_PIN, LOW); // LED on
    }

    if (pirMotionDetected && (millis() - pirMotionTimer > PIR_ACTIVE_DURATION)) {
      pirMotionDetected = false;
      digitalWrite(LED_PIN, HIGH); // LED off
    }
  }

  // --- Smoke Sensor ---
  int rawSmokeData = analogRead(SMOKE_SENSOR_PIN);
  addSmokeSample(rawSmokeData);
  int smokeAverage = getSmokeAverage();

  if (smokeAverage >= SMOKE_THRESHOLD + SMOKE_HYSTERESIS && !smokeDetected) {
    digitalWrite(LED_PIN, LOW); // LED on
    digitalWrite(BELL_PIN, HIGH); // Activate alarm
    smokeDetected = true;
    smokeAlarmTimer = millis(); // Start the alarm timer
  } else if (smokeDetected && millis() - smokeAlarmTimer >= ALARM_DURATION) {
    // Only turn off the alarm after 10 seconds, regardless of smoke level
    digitalWrite(LED_PIN, HIGH); // LED off
    digitalWrite(BELL_PIN, LOW); // Deactivate alarm
    smokeDetected = false;
  }

  // --- DHT Sensor ---
  delay(dhtDelayMS);
  sensors_event_t event;
  float temperature = NAN, humidity = NAN;

  dht.temperature().getEvent(&event);
  if (!isnan(event.temperature)) {
    temperature = event.temperature;
  }

  dht.humidity().getEvent(&event);
  if (!isnan(event.relative_humidity)) {
    humidity = event.relative_humidity;
  }

  // Determine motion and smoke status
  const char* motionStatus = (pirEnabled && pirMotionDetected) ? "Motion is Detected!" : "No Motion";
  const char* smokeStatus = smokeDetected ? "Smoke is Detected!" : "No Smoke";

  // Print all sensor data with PIR enabled status
  Serial.print("{");
  Serial.print("\"temperature\":");
  Serial.print(isnan(temperature) ? "null" : String(temperature));
  Serial.print(",\"humidity\":");
  Serial.print(isnan(humidity) ? "null" : String(humidity));
  Serial.print(",\"motionDetected\":");
  Serial.print(pirEnabled && pirMotionDetected ? "true" : "false");
  Serial.print(",\"pirEnabled\":");  // Add PIR enabled status
  Serial.print(pirEnabled ? "true" : "false");
  Serial.print(",\"smokeDetected\":");
  Serial.print(smokeDetected ? "true" : "false");
  Serial.println("}");

  delay(1000); // Reduce loop frequency
}

void addSmokeSample(int value) {
  smokeTotal -= smokeSamples[smokeIndex];
  smokeSamples[smokeIndex] = value;
  smokeTotal += value;
  smokeIndex = (smokeIndex + 1) % SAMPLE_SIZE;
}

int getSmokeAverage() {
  return smokeTotal / SAMPLE_SIZE;
}

void printSensorData(float temperature, float humidity, const char* motionStatus, const char* smokeStatus) {
  // Create JSON format string
  Serial.print("{");
  Serial.print("\"temperature\":");
  Serial.print(isnan(temperature) ? "null" : String(temperature));
  Serial.print(",\"humidity\":");
  Serial.print(isnan(humidity) ? "null" : String(humidity));
  Serial.print(",\"motionDetected\":");
  Serial.print(strcmp(motionStatus, "Motion is Detected!") == 0 ? "true" : "false");
  Serial.print(",\"smokeDetected\":");
  Serial.print(strcmp(smokeStatus, "Smoke is Detected!") == 0 ? "true" : "false");
  Serial.println("}");
}