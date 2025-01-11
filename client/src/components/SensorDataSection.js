import React, { useState, useEffect } from 'react';

function SensorDataSection({ socket }) {
  const [sensorData, setSensorData] = useState({
    temperature: null,
    humidity: null,
    motionDetected: false,
    smokeDetected: false
  });
  
  const [motionHistory, setMotionHistory] = useState([]);
  const maxHistoryItems = 10; // Maximum number of history items to show

  useEffect(() => {
    socket.on('arduinoData', (data) => {
      setSensorData(prevData => {
        // If motion was just detected (changed from false to true)
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

    return () => {
      socket.off('arduinoData');
    };
  }, [socket]);

  return (
    <div className="sensor-data-grid">
      {/* Motion Detection Container */}
      <div className="sensor-card">
        <h2>Motion Detection</h2>
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
          <h3>Motion History</h3>
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