const int PIR_PIN = 2;  // Change to your actual PIN
bool pirEnabled = false;

void setup() {
  Serial.begin(9600);
  pinMode(PIR_PIN, INPUT);
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
      Serial.println("{\"status\":\"PIR disabled\"}");
    }
  }

  // Only check PIR if enabled
  if (pirEnabled) {
    int pirValue = digitalRead(PIR_PIN);
    if (pirValue == HIGH) {
      Serial.println("{\"pirTriggered\":true}");
      delay(1000);  // Debounce
    }
  }

  delay(100);  // Small delay to prevent serial buffer overflow
} 