import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import io from 'socket.io-client';

const DashboardHeader = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  },
}));

const WebcamFeed = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '800px',
  margin: '0 auto',
  '& video': {
    width: '100%',
    borderRadius: theme.spacing(1),
  },
}));

const ControlButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(2),
  padding: theme.spacing(1, 3),
  borderRadius: theme.spacing(1),
}));

function Dashboard() {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isPirEnabled, setIsPirEnabled] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    // Connection status
    socketRef.current.on('connect', () => {
      console.log('Broadcaster connected, socket ID:', socketRef.current.id);
      setIsConnected(true);
      // Register as main computer after connection
      socketRef.current.emit('registerAsMain');
    });

    // Start webcam
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    })
    .then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Broadcast video stream
        const track = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track);

        // Send frames every 200ms
        const interval = setInterval(() => {
          if (socketRef.current?.connected) {
            imageCapture.grabFrame()
              .then(imageBitmap => {
                const canvas = document.createElement('canvas');
                canvas.width = imageBitmap.width;
                canvas.height = imageBitmap.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(imageBitmap, 0, 0);
                
                // Send frame as base64 image with more compression
                const imageData = canvas.toDataURL('image/jpeg', 0.3);
                console.log('Sending frame, size:', imageData.length);
                socketRef.current.emit('webcamFrame', imageData);
                setIsBroadcasting(true);
              })
              .catch(error => {
                console.error('Error capturing frame:', error);
                setIsBroadcasting(false);
              });
          } else {
            console.log('Socket not connected, skipping frame');
          }
        }, 200);

        return () => {
          clearInterval(interval);
          stream.getTracks().forEach(track => track.stop());
        };
      }
    })
    .catch(err => {
      console.error('Error accessing webcam:', err);
      setIsBroadcasting(false);
    });

    // Error handling
    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Broadcaster disconnected');
      setIsConnected(false);
    });

    // Add PIR status listener
    socketRef.current.on('pirStatus', (status) => {
      console.log('PIR status:', status);
      setIsPirEnabled(status.enabled);
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        console.log('Cleaning up broadcaster connection');
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handlePirToggle = () => {
    if (socketRef.current?.connected) {
      const newStatus = !isPirEnabled;
      socketRef.current.emit('togglePir', { enabled: newStatus });
      setIsPirEnabled(newStatus);
      console.log('PIR Sensor:', newStatus ? 'Enabled' : 'Disabled');
    }
  };

  return (
    <Box className="dashboard">
      <DashboardHeader>
        <Typography variant="h4" component="h1">
          ASS 🍑 Group 5
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Security Monitoring System
        </Typography>
      </DashboardHeader>
      
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h6">
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Typography>
        <Typography variant="body1">
          Broadcasting: {isBroadcasting ? '🟢 Active' : '🔴 Inactive'}
        </Typography>
      </Box>

      <WebcamFeed>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
        />
      </WebcamFeed>

      <Box sx={{ 
        textAlign: 'center', 
        mt: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <Typography variant="h6" gutterBottom>
          PIR Motion Sensor Control
        </Typography>
        <ControlButton
          variant="contained"
          color={isPirEnabled ? "error" : "success"}
          onClick={handlePirToggle}
        >
          {isPirEnabled ? 'Turn OFF PIR Sensor' : 'Turn ON PIR Sensor'}
        </ControlButton>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Current Status: {isPirEnabled ? '🟢 Active' : '🔴 Inactive'}
        </Typography>
      </Box>
    </Box>
  );
}

export default Dashboard; 