import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io.connect("http://localhost:5000");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showBoard, setShowBoard] = useState(false);

  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(5);
  const [isEraser, setIsEraser] = useState(false);

  const joinRoom = () => {
    if (username && room) {
      socket.emit("join_room", { username, room });
      setShowBoard(true);
    }
  };

  useEffect(() => {
    if (!showBoard) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.lineCap = "round";
    contextRef.current = context;

    socket.on("draw", (data) => {
      const { x, y, type, color, width } = data;
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = width;
      if (type === "start") {
        contextRef.current.beginPath();
        contextRef.current.moveTo(x, y);
      } else {
        contextRef.current.lineTo(x, y);
        contextRef.current.stroke();
      }
    });

    socket.on("clear_canvas", () => {
      contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      socket.off("draw");
      socket.off("clear_canvas");
    };
  }, [showBoard]);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    const currentColor = isEraser ? "#ffffff" : color; // Если ластик, берем белый
    
    contextRef.current.strokeStyle = currentColor;
    contextRef.current.lineWidth = width;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    
    socket.emit("draw", { 
      room, 
      drawingData: { x: offsetX, y: offsetY, type: "start", color: currentColor, width } 
    });
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const currentColor = isEraser ? "#ffffff" : color;

    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
    
    socket.emit("draw", { 
      room, 
      drawingData: { x: offsetX, y: offsetY, type: "move", color: currentColor, width } 
    });
  };

  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if(window.confirm("Are you sure you want to clear the board?")) {
        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        socket.emit("clear_canvas", room);
    }
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.download = `whiteboard-export-${room}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  if (!showBoard) {
    return (
      <div className="join-container">
        <div className="join-card">
          <h1>Whiteboard Pro</h1>
          <p style={{color: '#94a3b8', marginBottom: '20px'}}>Collaborative real-time design tool</p>
          <input 
            placeholder="Enter your name" 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <input 
            placeholder="Room ID" 
            onChange={(e) => setRoom(e.target.value)} 
          />
          <button onClick={joinRoom}>Join Session</button>
        </div>
      </div>
    );
  }

  return (
    <div className="board-container">
      <div className="toolbar">
        <div className="tool-group">
          <div className="status-dot"></div>
          <span style={{fontSize: '14px', fontWeight: '600'}}>
            {username} @ Room: {room}
          </span>
        </div>

        <div className="tool-group" style={{borderLeft: '1px solid #334155', paddingLeft: '20px'}}>
          <input 
            type="color" 
            value={color} 
            onChange={(e) => { setColor(e.target.value); setIsEraser(false); }} 
            disabled={isEraser}
          />
          <span style={{fontSize: '12px'}}>Size:</span>
          <input 
            type="range" 
            min="1" 
            max="40" 
            value={width} 
            onChange={(e) => setWidth(e.target.value)} 
          />
        </div>

        <div className="tool-group">
          <button 
            onClick={() => setIsEraser(!isEraser)} 
            style={{background: isEraser ? '#3b82f6' : '#475569'}}
          >
            {isEraser ? "🖌️ Drawing Mode" : "🧽 Eraser Mode"}
          </button>
          
          <button className="clear-btn" onClick={clearCanvas}>Clear All</button>
          
          <button onClick={downloadImage} style={{background: '#10b981'}}>Export PNG</button>
          
          <button onClick={() => window.location.reload()} style={{background: '#ef4444'}}>Exit</button>
        </div>
      </div>

      <canvas
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        ref={canvasRef}
      />
    </div>
  );
}

export default App;