const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());

// Подключение к MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/pro_whiteboard')
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

const userSchema = new mongoose.Schema({
    username: String,
    sessionsJoined: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    socket.on('join_room', async (data) => {
        socket.join(data.room);
        
        // Логика сохранения в БД
        try {
            await User.findOneAndUpdate(
                { username: data.username },
                { $inc: { sessionsJoined: 1 }, lastActive: Date.now() },
                { upsert: true }
            );
        } catch (e) { console.log("DB Error"); }
    });

    socket.on('draw', (data) => {
        socket.to(data.room).emit('draw', data.drawingData);
    });

    socket.on('clear_canvas', (room) => {
        socket.to(room).emit('clear_canvas');
    });

    socket.on('disconnect', () => console.log('Disconnected'));
});

server.listen(5000, () => console.log("🚀 Server on port 5000"));