const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server);

const message = require("./models/message");
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./models/user');

const PORT = process.env.PORT || 80;

app.use(express.static(path.join(__dirname, 'public')));

const bot = "ChatBot";
// Socket io
io.on('connection', socket => {
    // detect room join
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);

        // welcome message to connected user
        socket.emit('message', message(null, bot, `Welcome to the ${user.room}`));

        // user joined message to other users
        socket.broadcast.to(user.room).emit('message', message(null, bot, `${user.username} has joined the room!`));

        // send users
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });
    
    // listens for user's chat message
    socket.on('chatMessage', msg => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit('message', message(user.id, user.username, msg));
    });

    // user disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);
        if (user) {
            io.to(user.room).emit('message', message(null, bot, `${user.username} has left the room.`));
            // send users
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });
})

server.listen(PORT, () => console.log(`Server running on ${PORT}`));