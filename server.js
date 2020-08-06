const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server);

const message = require("./models/message");
const { getAllUsers, userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./models/user');
const { getAllRooms, startGame, endGame, getReadyToVote, addReadyToVote, resetVotes, getSurvived, killSurvivor, addVote, getMostVoted, getTotalVotes } = require('./models/room');
const { getAllWords, getRandomWord, getRandomSpy } = require('./models/game');
const { kill } = require('process');

const PORT = process.env.PORT || 80;

app.use(express.static(path.join(__dirname, 'public')));

const bot = "ChatBot";
// Socket io
io.on('connection', socket => {
    // log in a user
    socket.on('checkUserExists', username => {
        const users = getAllUsers();
        if (users.find(user => user.username == username)) {
            socket.emit('userExists', true);
        } else {
            socket.emit('userExists', false);
        }
    })

    // detect room join
    socket.on('joinRoom', ({ username, room }) => {
        // if room does not exist
        if (!getAllRooms().find(r => r.name == room)) {
            socket.emit('roomExists', false);
        }
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);

        // welcome message to connected user
        socket.emit('message', message(null, bot, `Welcome to the ${user.room} !`));

        // user joined message to other users
        socket.broadcast.to(user.room).emit('message', message(null, bot, `${user.username} has joined the ${user.room} !`));

        // send current room name and users in the room
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
        // send existing rooms to public area
        io.to('Public Area').emit('roomsChange', getAllRooms());

        // listens for topic change
        socket.on('topicChange', topic => {
            socket.broadcast.to(user.room).emit('topicChange', topic);
        });

        // listens for game start
        socket.on('gameStart', topic => {
            const allUsers = getRoomUsers(user.room);
            const spy = getRandomSpy(allUsers);
            const agents = allUsers.filter(user => user.id != spy.id);
            const answer = getRandomWord(topic);
            startGame(user.room, allUsers, 0);
            // set this room to be invisible to public area
            io.to('Public Area').emit('roomsChange', getAllRooms());
            io.to(spy.id).emit('gameStart', {role: 'spy', list: getAllWords(topic)});
            // io.to(user.room).emit('message', message(null, bot, 'The Game has started!'));
            agents.forEach(agent => {
                io.to(agent.id).emit('gameStart', {role: 'agent', list: getAllWords(topic), word: answer});
            });
        });

        // listens for vote ready
        socket.on('readyToVote', () => {
            addReadyToVote(user.room, user.id);
            const survived = getSurvived(user.room);
            const ready = getReadyToVote(user.room);
            io.to(user.room).emit('message', message(null, bot, `${user.username} is ready to vote (${ready.length}/${survived.length})`));
            if (ready.length/survived.length > 0.5) {
                io.to(user.room).emit('message', message(null, bot, 'Voting is in progess'));
                survived.forEach(surv => {
                    io.to(surv.id).emit('vote', survived);
                });
            }
        });

        // listens for in-coming votes
        socket.on('vote', userId => {
            const survived = getSurvived(user.room);
            addVote(user.room, userId);
            // if everyone that are alive vote, then emit back the vote result
            if (getTotalVotes(user.room) == survived.length) {
                // most voted picks randomly if equal
                const mostVotedUserId = getMostVoted(user.room);
                // if skip is most voted
                if (mostVotedUserId == "skip") {
                    io.to(user.room).emit('message', message(null, bot, 'The vote has been skipped'));
                    io.to(user.room).emit('voteDone', null);
                } else {
                    const votedUser = getCurrentUser(mostVotedUserId);
                    io.to(user.room).emit('message', message(null, bot, `${votedUser.username} has been sentenced to death`));
                    killSurvivor(user.room, votedUser.id);
                    io.to(user.room).emit('voteDone', votedUser.id);
                    // if num survivor == 2 that means it's 1v1, then spy wins
                    if (getSurvived(user.room).length == 2) {
                        io.to(user.room).emit('spyWins');
                    }
                }
                resetVotes(user.room);
            }
        });

        // listens for agents win
        socket.on('agentsWin', username => {
            // reset in-server game stat
            endGame(user.room);
            // tell client game is over
            io.to(user.room).emit('message', message(null, bot, `Agents Won!\n${username} is the spy`));
            io.to(user.room).emit('endGame');
        });

        // listens for spy win
        socket.on('spyWins', username => {
            // reset in-server game stat
            endGame(user.room);
            // tell client game is over
            io.to(user.room).emit('message', message(null, bot, `Spy Won!\n${username} is the spy`));
            io.to(user.room).emit('endGame');
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
            io.to(user.room).emit('message', message(null, bot, `${user.username} has left the ${user.room}`));
            // send current room name and users in the room
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
        if (user.room != 'Public Area') {
            const room = getAllRooms().find(room => room.name == user.room);
            if (room.isPlaying) {
                // reset in-server game stat
                endGame(user.room);
                io.to(user.room).emit('endGame');
            }
        }
    });
})

server.listen(PORT, () => console.log(`Server running on ${PORT}`));