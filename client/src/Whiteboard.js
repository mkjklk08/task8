import React, { useRef, useEffect, useState } from 'react';

const Whiteboard = ({ socket, room, username }) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState("#000000");

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth * 2;
        canvas.height = window.innerHeight * 2;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;

        const context = canvas.getContext("2d");
        context.scale(2, 2);
        context.lineCap = "round";
        context.lineWidth = 5;
        contextRef.current = context;

        socket.on("draw", (data) => {
            const { x, y, type, color: incomingColor } = data;
            contextRef.current.strokeStyle = incomingColor;
            if (type === "start") {
                contextRef.current.beginPath();
                contextRef.current.moveTo(x, y);
            } else if (type === "move") {
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
    }, [socket]);

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.strokeStyle = color;
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
        socket.emit("draw", { room, drawingData: { x: offsetX, y: offsetY, type: "start", color } });
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
        socket.emit("draw", { room, drawingData: { x: offsetX, y: offsetY, type: "move", color } });
    };

    const stopDrawing = () => {
        contextRef.current.closePath();
        setIsDrawing(false);
    };

    const handleClear = () => {
        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        socket.emit("clear_canvas", room);
    };

    return (
        <div style={{ background: '#f0f0f0', height: '100vh' }}>
            <div className="toolbar" style={{
                position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                background: '#333', color: '#fff', padding: '10px 20px', borderRadius: '20px',
                display: 'flex', gap: '15px', alignItems: 'center', zIndex: 100
            }}>
                <span>👤 {username}</span>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                <button onClick={handleClear} style={{ cursor: 'pointer' }}>Очистить</button>
                <button onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>Выйти</button>
            </div>
            <canvas
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                ref={canvasRef}
                style={{ display: 'block', background: 'white' }}
            />
        </div>
    );
};

export default Whiteboard;