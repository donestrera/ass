import React, { useState, useEffect } from 'react';

function StatusSection({ socket }) {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    socket.on('connect', () => {
      setConnectionStatus('Connected');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('Disconnected');
    });

    socket.on('error', (error) => {
      const newError = {
        id: Date.now(),
        message: error.message
      };
      
      setErrors(prev => [...prev, newError]);
      
      // Remove error after 5 seconds
      setTimeout(() => {
        setErrors(prev => prev.filter(err => err.id !== newError.id));
      }, 5000);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
    };
  }, [socket]);

  return (
    <div className="status-section">
      <div 
        id="connectionStatus"
        className={connectionStatus === 'Connected' ? 'connected' : 'disconnected'}
      >
        {connectionStatus}
      </div>
      <div className="error-messages">
        {errors.map(error => (
          <div key={error.id}>{error.message}</div>
        ))}
      </div>
    </div>
  );
}

export default StatusSection; 