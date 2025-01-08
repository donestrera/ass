import React, { useState, useEffect } from 'react';

function ArduinoSection({ socket }) {
  const [arduinoData, setArduinoData] = useState('Waiting for data...');
  const [command, setCommand] = useState('');

  useEffect(() => {
    socket.on('arduinoData', (data) => {
      setArduinoData(JSON.stringify(data, null, 2));
    });

    return () => {
      socket.off('arduinoData');
    };
  }, [socket]);

  const handleSendCommand = () => {
    if (command.trim()) {
      socket.emit('sendToArduino', command.trim());
      setCommand('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendCommand();
    }
  };

  return (
    <div className="arduino-section">
      <h2>Arduino Control</h2>
      <div className="arduino-data">
        <h3>Received Data</h3>
        <pre>{arduinoData}</pre>
      </div>
      <div className="arduino-control">
        <h3>Send Command</h3>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter command"
        />
        <button onClick={handleSendCommand}>Send</button>
      </div>
    </div>
  );
}

export default ArduinoSection; 