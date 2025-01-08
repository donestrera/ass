const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const path = require('path');
const cors = require('cors');
const NodeWebcam = require('node-webcam');

// Express setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
const port = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// Arduino Serial Port Configuration
const portPath = '/dev/cu.usbserial-110'; // Update this to match your Arduino port
const baudRate = 9600;

// Create Serial Port instance
const serialPort = new SerialPort({
    path: portPath,
    baudRate: baudRate
});

// Create parser
const parser = new ReadlineParser();
serialPort.pipe(parser);

// Webcam configuration
const webcamOptions = {
    width: 1280,
    height: 720,
    quality: 100,
    delay: 0,
    saveShots: false,
    output: "jpeg",
    device: false,
    callbackReturn: "buffer"
};

const Webcam = NodeWebcam.create(webcamOptions);

// WebSocket Communication
io.on('connection', (socket) => {
    console.log('Client connected');
    
    socket.emit('connectionStatus', { status: 'connected' });
    
    // Identify if this is the main computer
    socket.on('registerAsMain', () => {
        console.log('Main computer registered');
        socket.isMainComputer = true;
        socket.broadcast.emit('mainComputerStatus', { connected: true });
    });

    // Handle webcam frames from main computer
    socket.on('webcamFrame', (data) => {
        if (socket.isMainComputer) {
            // Broadcast frame to all clients except sender
            socket.broadcast.emit('receiveWebcamFrame', data);
        }
    });

    // Handle Arduino commands with validation
    socket.on('sendToArduino', (command) => {
        if (!command || typeof command !== 'string') {
            console.error('Invalid command format');
            socket.emit('error', { message: 'Invalid command format' });
            return;
        }

        console.log(`Sending to Arduino: ${command}`);
        if (serialPort.isOpen) {
            serialPort.write(`${command}\n`, (err) => {
                if (err) {
                    console.error('Error writing to serial port:', err);
                    socket.emit('error', { message: 'Failed to send command' });
                }
            });
        } else {
            console.error('Serial port is not open');
            socket.emit('error', { message: 'Device not connected' });
        }
    });

    socket.on('disconnect', () => {
        if (socket.isMainComputer) {
            io.emit('mainComputerStatus', { connected: false });
        }
        console.log('Client disconnected');
    });
});

// Handle data from Arduino with improved error handling
parser.on('data', (data) => {
    try {
        const parsedData = JSON.parse(data.trim());
        console.log('Received from Arduino:', parsedData);
        
        // Validate data structure
        if (!parsedData || typeof parsedData !== 'object') {
            throw new Error('Invalid data format');
        }
        
        io.emit('arduinoData', parsedData);
    } catch (error) {
        console.error('Error parsing Arduino data:', error.message);
        console.log('Raw data received:', data);
        io.emit('error', { message: 'Error processing device data' });
    }
});

// Error handling for serial port
serialPort.on('error', (err) => {
    console.error(`Serial port error: ${err.message}`);
    // Attempt to reconnect
    setTimeout(() => {
        if (!serialPort.isOpen) {
            serialPort.open((err) => {
                if (err) {
                    console.error('Failed to reconnect:', err.message);
                } else {
                    console.log('Successfully reconnected to serial port');
                }
            });
        }
    }, 5000);
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add after all routes in app.js
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});