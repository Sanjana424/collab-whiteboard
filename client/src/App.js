import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5001');

// Function to create a short random room code
function generateRoomCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function App() {
  const canvasRef = useRef(null);
  const [roomId, setRoomId] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [isEraser, setIsEraser] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!inRoom) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const draw = ({ x0, y0, x1, y1, color, brushSize }) => {
      context.strokeStyle = color;
      context.lineWidth = brushSize;
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.stroke();
      context.closePath();
    };

    socket.on('drawing', draw);

    return () => {
      socket.off('drawing', draw);
    };
  }, [inRoom]);

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    let drawing = true;
    let lastX = e.clientX - rect.left;
    let lastY = e.clientY - rect.top;

    const drawMove = (e) => {
      if (!drawing) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const drawColor = isEraser ? '#ffffff' : color;

      context.strokeStyle = drawColor;
      context.lineWidth = brushSize;
      context.beginPath();
      context.moveTo(lastX, lastY);
      context.lineTo(x, y);
      context.stroke();
      context.closePath();

      socket.emit('drawing', {
        roomId,
        data: { x0: lastX, y0: lastY, x1: x, y1: y, color: drawColor, brushSize },
      });

      lastX = x;
      lastY = y;
    };

    const stopDrawing = () => {
      drawing = false;
      window.removeEventListener('mousemove', drawMove);
      window.removeEventListener('mouseup', stopDrawing);
    };

    window.addEventListener('mousemove', drawMove);
    window.addEventListener('mouseup', stopDrawing);
  };

  const joinRoom = () => {
    if (roomId.trim() === '') return;
    socket.emit('join-room', roomId);
    setInRoom(true);
  };

  const createRoom = () => {
    const newRoomId = generateRoomCode();
    setRoomId(newRoomId);
    socket.emit('join-room', newRoomId);
    setInRoom(true);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `whiteboard-${roomId || 'session'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const toggleEraser = () => {
    setIsEraser(!isEraser);
  };

  const copyRoomId = async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: '#f0f2f5' }}>
      {!inRoom && (
        <div style={{
          display: 'flex',
          height: '100vh',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div style={{
            background: '#fff',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: '300px'
          }}>
            <h2 style={{ marginBottom: '20px' }}>🎨 Collaborative Whiteboard</h2>
            <input
              style={{
                padding: '10px',
                fontSize: '16px',
                width: '100%',
                marginBottom: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <br />
            <button
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                background: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px',
                marginTop: '5px'
              }}
              onClick={joinRoom}
            >
              Join Room
            </button>
            <button
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                background: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '5px'
              }}
              onClick={createRoom}
            >
              Create Room
            </button>
          </div>
        </div>
      )}
      {inRoom && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Collaborative Whiteboard</h2>
          <div style={{ marginBottom: '10px' }}>
            <p><strong>Room ID:</strong> {roomId}</p>
            <button
              onClick={copyRoomId}
              style={{
                padding: '8px 12px',
                background: '#17a2b8',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              📋 Copy Room ID
            </button>
            {copied && <span style={{ color: '#28a745' }}>Copied!</span>}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ marginRight: '10px' }}>
              🎨 Color:
              <input
                type="color"
                value={color}
                disabled={isEraser}
                onChange={(e) => setColor(e.target.value)}
                style={{ marginLeft: '5px' }}
              />
            </label>
            <label style={{ marginRight: '10px' }}>
              🖌️ Brush Size:
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                style={{ marginLeft: '5px' }}
              />
              <span style={{ marginLeft: '5px' }}>{brushSize}</span>
            </label>
            <button
              onClick={toggleEraser}
              style={{
                padding: '8px 12px',
                background: isEraser ? '#ffc107' : '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '5px',
              }}
            >
              {isEraser ? '✏️ Drawing' : '🧹 Eraser'}
            </button>
            <button
              onClick={clearCanvas}
              style={{
                padding: '8px 12px',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '5px',
              }}
            >
              🗑️ Clear
            </button>
            <button
              onClick={saveCanvas}
              style={{
                padding: '8px 12px',
                background: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              💾 Save as PNG
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            style={{ border: '2px solid #333', background: '#fff' }}
            onMouseDown={handleMouseDown}
          />
        </div>
      )}
    </div>
  );
}

export default App;
