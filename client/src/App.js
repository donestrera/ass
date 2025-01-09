import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import WebcamSection from './components/WebcamSection';
import ArduinoSection from './components/ArduinoSection';
import StatusSection from './components/StatusSection';
import SensorDataSection from './components/SensorDataSection';
import AuthPage from './components/auth/AuthPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
const socket = io(BACKEND_URL);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token && username) {
      setIsAuthenticated(true);
      setUser({ username });
    }
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>ASS 🍑 Group 5</h1>
            <span className="header-subtitle">Security Monitoring System</span>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="welcome-text">Welcome,</span>
              <span className="username">{user?.username}</span>
            </div>
            <button onClick={handleLogout} className="logout-button">
              <span className="logout-icon">👋</span>
              Logout
            </button>
          </div>
        </div>
      </header>
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
