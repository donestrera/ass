import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import io from 'socket.io-client';

const WebcamContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '800px',
  margin: '0 auto',
  '& img': {
    width: '100%',
    borderRadius: theme.spacing(1),
  },
}));

function WebcamViewer() {
  const imageRef = useRef(null);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasMainComputer, setHasMainComputer] = useState(false);

  useEffect(() => {
    console.log('Connecting to:', process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001');

    socketRef.current = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('Viewer connected, socket ID:', socketRef.current.id);
      setIsConnected(true);
    });

    // Main computer status
    socketRef.current.on('mainComputerStatus', ({ connected }) => {
      console.log('Main computer status:', connected);
      setHasMainComputer(connected);
    });

    // Receive frames
    socketRef.current.on('receiveWebcamFrame', (imageData) => {
      console.log('Received frame, size:', imageData.length);
      if (imageRef.current) {
        imageRef.current.src = imageData;
      }
    });

    // Error handling
    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Viewer disconnected');
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        console.log('Cleaning up viewer connection');
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <WebcamContainer>
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h6">
          Connection Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Typography>
        <Typography variant="body1">
          Main Computer: {hasMainComputer ? '🟢 Online' : '🔴 Offline'}
        </Typography>
      </Box>
      {!isConnected && (
        <Typography color="error" sx={{ textAlign: 'center', mb: 2 }}>
          Not connected to server. Please check your connection.
        </Typography>
      )}
      {isConnected && !hasMainComputer && (
        <Typography color="warning" sx={{ textAlign: 'center', mb: 2 }}>
          Waiting for camera feed...
        </Typography>
      )}
      <img
        ref={imageRef}
        alt="Live Camera Feed"
        style={{ 
          display: 'block',
          width: '100%',
          height: 'auto',
          margin: '0 auto'
        }}
      />
    </WebcamContainer>
  );
}

export default WebcamViewer; 