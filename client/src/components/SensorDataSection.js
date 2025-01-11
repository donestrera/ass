import React, { useState, useEffect } from 'react';
import './SensorDataSection.css';

function SensorDataSection({ socket }) {
  const [sensorData, setSensorData] = useState({
    temperature: null,
    humidity: null,
    motionDetected: false,
    smokeDetected: false
  });
  
  const [motionHistory, setMotionHistory] = useState([]);
  const maxHistoryItems = 10;
  const [pirEnabled, setPirEnabled] = useState(true);

  useEffect(() => {
    socket.on('arduinoData', (data) => {
      setSensorData(prevData => {
        if (!prevData.motionDetected && data.motionDetected) {
          const timestamp = new Date().toLocaleTimeString();
          setMotionHistory(prev => [
            { time: timestamp, date: new Date().toLocaleDateString() },
            ...prev.slice(0, maxHistoryItems - 1)
          ]);
        }
        return data;
      });
    });

    // Listen for PIR status updates
    socket.on('pirStatus', (data) => {
      setPirEnabled(data.enabled);
    });

    return () => {
      socket.off('arduinoData');
      socket.off('pirStatus');
    };
  }, [socket]);

  const clearHistory = () => {
    setMotionHistory([]);
  };

  const togglePir = () => {
    const newState = !pirEnabled;
    socket.emit('togglePir', { enabled: newState });
    setPirEnabled(newState);
  };

  return (
    <div className="sensor-data-grid">
      {/* Motion Detection Container */}
      <div className="sensor-card">
        <div className="card-header">
          <h2>Motion Detection</h2>
          <div className="motion-controls">
            <button 
              onClick={togglePir} 
              className={`pir-toggle-btn ${pirEnabled ? 'enabled' : 'disabled'}`}
              title={pirEnabled ? 'Click to disable motion detection' : 'Click to enable motion detection'}
            >
              <span className="toggle-icon">{pirEnabled ? '🔔' : '🔕'}</span>
              <span className="toggle-text">{pirEnabled ? 'Enabled' : 'Disabled'}</span>
              <div className={`status-indicator ${pirEnabled ? 'active' : ''}`}></div>
            </button>
          </div>
        </div>
        <div className={`sensor-status ${sensorData.motionDetected ? 'alert' : 'normal'}`}>
          <div className="sensor-icon">
            {sensorData.motionDetected ? '🚨' : '👁️'}
          </div>
          <div className="sensor-text">
            {sensorData.motionDetected ? 'Motion Detected!' : 'No Motion Detected'}
          </div>
        </div>
        
        {/* Motion History Log */}
        <div className="motion-history">
          <div className="history-header">
            <h3>Motion History</h3>
            <button 
              onClick={clearHistory} 
              className="clear-history-btn"
              disabled={motionHistory.length === 0}
              title={motionHistory.length > 0 ? 'Clear motion history' : 'No history to clear'}
            >
              <span className="clear-icon">🗑️</span>
              <span className="clear-text">Clear History</span>
            </button>
          </div>
          <div className="history-list">
            {motionHistory.length > 0 ? (
              motionHistory.map((event, index) => (
                <div key={index} className="history-item">
                  <div className="history-icon">📍</div>
                  <div className="history-details">
                    <div className="history-time">{event.time}</div>
                    <div className="history-date">{event.date}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-history">No motion events recorded</div>
            )}
          </div>
        </div>
      </div>

      {/* Smoke Detection Container */}
      <div className="sensor-card">
        <h2>Smoke & Gas Detection</h2>
        <div className={`sensor-status ${sensorData.smokeDetected ? 'alert' : 'normal'}`}>
          <div className="sensor-icon">
            {sensorData.smokeDetected ? '🔥' : '💨'}
          </div>
          <div className="sensor-text">
            {sensorData.smokeDetected ? 'Smoke Detected!' : 'No Smoke Detected'}
          </div>
        </div>
      </div>

      {/* Temperature & Humidity Container */}
      <div className="sensor-card">
        <h2>Environmental Data</h2>
        <div className="env-data-grid">
          <div className="env-data-item">
            <div className="env-icon">🌡️</div>
            <div className="env-label">Temperature</div>
            <div className="env-value">
              {sensorData.temperature !== null 
                ? `${sensorData.temperature.toFixed(1)}°C` 
                : 'N/A'}
            </div>
          </div>
          <div className="env-data-item">
            <div className="env-icon">💧</div>
            <div className="env-label">Humidity</div>
            <div className="env-value">
              {sensorData.humidity !== null 
                ? `${sensorData.humidity.toFixed(1)}%` 
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SensorDataSection; 