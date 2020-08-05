document.addEventListener('DOMContentLoaded', () => {
    const hash = new Hashes.SHA256;
    const chatForm = document.getElementById('message-form');
    const chatWindow = document.querySelector('.chat-area');
    const topicSelect = document.getElementById('topic-select');
    const startGameBtn = document.getElementById('start-game-btn');

    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room');

    const username = sessionStorage.getItem('username');
    
    const challenge = hash.hex(username);

    let isSpy = false;
    let gameRunning = false;

    if (!username || challenge != sessionStorage.getItem('token')) {
        // TODO: make error feedback look better
        alert("Invalid access!");
        window.location.replace('/');
        return;
    }

    const socket = io();

    socket.on('connect', () => {
        const sessionId = socket.id;

        // check if room is valid
        socket.on('roomExists', roomExists => {
            if (!roomExists) {  
                window.location.replace('/public.html');
                return;
            }
        });

        // join specific room
        socket.emit('joinRoom', { username, room: roomName });

        // listens for current room and users info
        socket.on('roomUsers', ({room, users}) => {
            renderRoomName(room);
            renderUserList(users);
        });

        // listens for topic change
        socket.on('topicChange', topic => {
            topicSelect.value = topic;
        });

        // listens for game start
        socket.on('gameStart', game => {
            document.querySelector('.game-start-container').classList.add("d-none");
            document.querySelector('.list-of-words-toggle').classList.remove('d-none');
            document.getElementById('ready-to-vote-btn').removeAttribute('disabled');
            const options = game.list.map(option => `<li class="list-group-item">${option}</li>`).join('');
            document.querySelector('.list-group').innerHTML = `
            ${game.list.map(option => `<li class="list-group-item">${option}</li>`).join('')}
            `
            // if spy
            if (game.role == 'spy') {
                document.querySelector('.spy-view').classList.remove('d-none');
                document.getElementById('sabotage-btn').removeAttribute('disabled');
            } 
            // else agent
            else {
                document.getElementById('answer-word').innerText = game.word;
                document.querySelector('.agent-view').classList.remove('d-none');
            }
        });

        // listens for a message
        socket.on('message', data => {
            // if at the bottom, then automatically scroll to new message
            // let autoScroll = false;
            // if (chatWindow.scrollTop == chatWindow.scrollHeight-480) {
            //     autoScroll = true;
            // }
            renderChatMessage(sessionId, data);
            // if (autoScroll) {
                chatWindow.scrollTop = chatWindow.scrollHeight;
            // } else {
                // TODO: scroll to bottom button activation
                // show something to indicate there's new message and allow user to click to scroll down
            // }
        });

    });

    // sending message
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = e.target.elements.messageInput.value;
        // sent message to server
        socket.emit('chatMessage', msg);
        e.target.elements.messageInput.value = '';
        e.target.elements.messageInput.focus();
    });

    // send selected topic to everyone to see
    topicSelect.addEventListener('change', e => {
        const selectedTopic = e.target.value;
        socket.emit('topicChange', selectedTopic);
    });

    // start game
    startGameBtn.addEventListener('click', () => {
        socket.emit('gameStart', topicSelect.value);
    });

    // generate chat messages
    const renderChatMessage = (sessionId, data) => {
        const div = document.createElement('div');
        div.classList.add('message');
        div.innerHTML = "";
        if (data.userId == null) {
            div.classList.add('system-message');
        } else if (data.userId == sessionId) {
            div.classList.add('my-message');
            div.innerHTML += `<div class="username">
                                ${data.username}
                            </div>`;
        } else {
            div.classList.add('other-message');
            div.innerHTML += `<div class="username">
                                ${data.username}
                            </div>`;
        }
        div.innerHTML += `<div class="content">
                            ${data.message}
                        </div>
                        <div class="timestamp">
                            ${data.time}
                        </div>`;
        chatWindow.append(div);
    }

    // add room name to header
    const renderRoomName = room => {
        document.getElementById('room-name').innerText = room;
    }

    // add users to user list
    const renderUserList = users => {
        // the first user in user list is always the host
        if (users[0].username == username) {
            topicSelect.removeAttribute('disabled');
            startGameBtn.removeAttribute('disabled');
        }
        document.getElementById('user-list').innerHTML = `
            ${users.map(user => `<li>${user.username}</li>`).join('')}
        `;
    }

});
