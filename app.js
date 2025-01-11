const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const path = require('path');
const cors = require('cors');
const NodeWebcam = require('node-webcam');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Express setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    // Implement retry logic
    setTimeout(() => {
        console.log('Retrying MongoDB connection...');
        mongoose.connect(process.env.MONGODB_URI).catch(err => {
            console.error('Retry failed:', err);
            process.exit(1);
        });
    }, 5000);
});

// Enhanced error handlers for MongoDB connection
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
    if (err.name === 'MongoNetworkError') {
        console.log('Network error detected, attempting to reconnect...');
    }
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected, attempting to reconnect...');
    setTimeout(() => {
        mongoose.connect(process.env.MONGODB_URI).catch(err => {
            console.error('Reconnection failed:', err);
        });
    }, 5000);
});

mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully');
});

// Middleware
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add this before your routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Add viewer route
app.get('/viewer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

// Arduino Serial Port Configuration
const portPath = '/dev/ttyACM0'; // Default Arduino port on Ubuntu
// Alternative ports to try: '/dev/ttyUSB0', '/dev/ttyACM1'
const baudRate = 9600;

// Create Serial Port instance with error handling
const serialPort = new SerialPort({
    path: portPath,
    baudRate: baudRate
}).on('error', (err) => {
    console.error('Error opening serial port:', err.message);
    // Continue running even if Arduino is not connected
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

// Add PIR sensor state
let pirEnabled = false;

// WebSocket Communication
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Identify if this is the main computer
    socket.on('registerAsMain', () => {
        console.log('Main computer registered:', socket.id);
        socket.isMainComputer = true;
        socket.broadcast.emit('mainComputerStatus', { connected: true });
    });

    // Handle webcam frames with better error handling
    socket.on('webcamFrame', (data) => {
        if (socket.isMainComputer) {
            console.log('Broadcasting frame from:', socket.id);
            // Broadcast frame to all other clients
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

    // Send initial PIR status
    socket.emit('pirStatus', { enabled: pirEnabled });

    // Handle PIR toggle
    socket.on('togglePir', (data) => {
        if (socket.isMainComputer) {
            pirEnabled = data.enabled;
            console.log('PIR Sensor status changed:', pirEnabled);

            // Send command to Arduino
            if (serialPort.isOpen) {
                const command = pirEnabled ? 'PIR_ON' : 'PIR_OFF';
                serialPort.write(`${command}\n`, (err) => {
                    if (err) {
                        console.error('Error sending PIR command:', err);
                        socket.emit('error', { message: 'Failed to send PIR command' });
                    } else {
                        // Broadcast new status to all clients
                        io.emit('pirStatus', { enabled: pirEnabled });
                    }
                });
            } else {
                console.error('Serial port is not open');
                socket.emit('error', { message: 'Device not connected' });
            }
        }
    });

    socket.on('disconnect', () => {
        if (socket.isMainComputer) {
            console.log('Main computer disconnected:', socket.id);
            io.emit('mainComputerStatus', { connected: false });
        }
        console.log('Client disconnected:', socket.id);
    });

    // Error handling
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Handle data from Arduino with improved error handling
parser.on('data', (data) => {
    try {
        const parsedData = JSON.parse(data.trim());
        console.log('Received from Arduino:', parsedData);
        
        // Handle PIR sensor data if included
        if (parsedData.hasOwnProperty('pirTriggered')) {
            io.emit('pirEvent', {
                triggered: parsedData.pirTriggered,
                timestamp: new Date().toISOString()
            });
        }
        
        io.emit('arduinoData', parsedData);
    } catch (error) {
        console.error('Error parsing Arduino data:', error);
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
server.listen(process.env.PORT || 5001, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${process.env.PORT || 5001}`);
});