// Initialize Socket.IO connection
const socket = io();

// DOM Elements
const webcamFeed = document.getElementById('webcamFeed');
const arduinoData = document.getElementById('arduinoData');
const commandInput = document.getElementById('commandInput');
const connectionStatus = document.getElementById('connectionStatus');
const errorMessages = document.getElementById('errorMessages');

// Connection status handling
socket.on('connect', () => {
    connectionStatus.textContent = 'Connection Status: Connected';
    connectionStatus.style.color = '#28a745';
});

socket.on('disconnect', () => {
    connectionStatus.textContent = 'Connection Status: Disconnected';
    connectionStatus.style.color = '#dc3545';
});

// Register as main computer (if this is the main computer)
const isMainComputer = false; // Set this to true for the main computer
if (isMainComputer) {
    socket.emit('registerAsMain');
}

// Webcam handling
socket.on('receiveWebcamFrame', (data) => {
    webcamFeed.src = `data:image/jpeg;base64,${data}`;
});

// Arduino data handling
socket.on('arduinoData', (data) => {
    arduinoData.textContent = JSON.stringify(data, null, 2);
});

// Error handling
socket.on('error', (error) => {
    const errorDiv = document.createElement('div');
    errorDiv.textContent = error.message;
    errorMessages.appendChild(errorDiv);
    
    // Remove error message after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
});

// Send command to Arduino
function sendCommand() {
    const command = commandInput.value.trim();
    if (command) {
        socket.emit('sendToArduino', command);
        commandInput.value = ''; // Clear input after sending
    }
}

// Handle Enter key in command input
commandInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendCommand();
    }
}); 