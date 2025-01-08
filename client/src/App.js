import React from 'react';
import { io } from 'socket.io-client';
import './App.css';
import WebcamSection from './components/WebcamSection';
import ArduinoSection from './components/ArduinoSection';
import StatusSection from './components/StatusSection';
import SensorDataSection from './components/SensorDataSection';

const socket = io('http://localhost:5001');

function App() {
  return (
    <div className="container">
      <div className="header">
        <h1>ASS 🍑 Group 5</h1>
      </div>
      <div className="grid-container">
        <div className="section-card">
          <WebcamSection socket={socket} />
          <SensorDataSection socket={socket} />
        </div>
        <div className="section-card">
          <ArduinoSection socket={socket} />
        </div>
      </div>
      <StatusSection socket={socket} />
    </div>
  );
}

export default App;
