import React, { useEffect, useState, useRef } from 'react';

function WebcamSection({ socket }) {
  const [webcamUrl, setWebcamUrl] = useState('');
  const [isMainComputer, setIsMainComputer] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // Handle receiving webcam frames
    socket.on('receiveWebcamFrame', (data) => {
      setWebcamUrl(`data:image/jpeg;base64,${data}`);
    });

    // Check if this is the main computer with webcam
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 1280,
          height: 720,
          facingMode: 'user'
        } 
      })
        .then((stream) => {
          setIsMainComputer(true);
          socket.emit('registerAsMain');
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          startWebcamStream(stream);
        })
        .catch(err => {
          console.log('This is not the main computer:', err);
          setIsMainComputer(false);
        });
    }

    return () => {
      socket.off('receiveWebcamFrame');
      // Cleanup: stop all tracks when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [socket]);

  const startWebcamStream = (stream) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // Send frames every 100ms (10 fps)
    const interval = setInterval(() => {
      if (videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const frame = canvas.toDataURL('image/jpeg', 0.7);
        socket.emit('webcamFrame', frame.split(',')[1]); // Send only the base64 data
      }
    }, 100);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  };

  return (
    <div className="webcam-section">
      <h2>Webcam Feed</h2>
      {isMainComputer ? (
        <div className="webcam-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="webcam-video"
          />
          <div className="webcam-status connected">Broadcasting Webcam</div>
        </div>
      ) : webcamUrl ? (
        <img src={webcamUrl} alt="Webcam Feed" id="webcamFeed" />
      ) : (
        <div className="webcam-status">Waiting for webcam feed...</div>
      )}
    </div>
  );
}

export default WebcamSection; 