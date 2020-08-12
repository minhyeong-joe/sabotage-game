document.addEventListener('DOMContentLoaded', () => {
    const hash = new Hashes.SHA256;
    const chatForm = document.getElementById('message-form');
    const chatWindow = document.querySelector('.chat-area');
    const createRoomBtn = document.getElementById('create-room-btn');
    const createRoomForm = document.getElementById('create-room-form');
    const messageInput = document.getElementById('messageInput');
    const messageSendBtn = document.getElementById('message-send-btn');
    const charCount = document.getElementById('current-character-count');
    const spamPrevention = document.getElementById('spam-prevention');
    const autoscrollSwitch = document.getElementById('autoscroll-switch');

    const username = sessionStorage.getItem('username');
    const color = sessionStorage.getItem('color');
    
    const challenge = hash.hex(username);

    let sendCooldown = 0;
    let cdInterval;
    let isAutoscroll = true;

    if (!username || challenge != sessionStorage.getItem('token')) {
        // TODO: make error feedback look better
        alert("Invalid access!");
        window.location.replace('/');
        return;
    }

    const socket = io();

    socket.on('connect', () => {
        const sessionId = socket.id;

        // join public room
        socket.emit('joinRoom', { username, room: 'Public Area', color });

        // listens for current room and users info
        socket.on('roomUsers', ({room, users}) => {
            renderRoomName(room);
            renderUserList(users);
        });

        // listens for room creation/deletion
        socket.on('roomsChange', rooms => {
            renderRooms(rooms);
        });

        // listens for room exists
        socket.on('duplicateRoomName', () => {
            document.getElementById('error-feedback').classList.remove('d-none');
            document.getElementById('create-btn').setAttribute('disabled', true);
        });

        // listens for my room successfully created
        socket.on('roomCreated', newRoom => {
            $('#create-room-modal').modal('hide');
            window.location.href = `/chatroom?room=${newRoom.name}`;
        });

        // listens for a message
        socket.on('message', data => {
            renderChatMessage(sessionId, data);
            if (isAutoscroll) {
                chatWindow.scrollTop = chatWindow.scrollHeight;
            } else {
                // TODO: scroll to bottom button activation
                // show something to indicate there's new message and allow user to click to scroll down
            }
        });

    });

    
    // sending message
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        messageInput.style.height = "2.3125rem";
        const msg = e.target.elements.messageInput.value;
        if (msg == "") {
            return;
        }
        if (sendCooldown > 0) {
            spamPrevention.innerText = `You have to wait ${sendCooldown} seconds for next message.`;
            spamPrevention.classList.remove('hide');
            setTimeout(() => {
                spamPrevention.classList.add('hide');
            }, 1000);
            return;
        }
        // sent message to server
        socket.emit('chatMessage', msg);
        e.target.elements.messageInput.value = '';
        charCount.innerText = 0;
        e.target.elements.messageInput.focus();
        messageSendBtn.setAttribute('disabled', true);
        sendCooldown = 2;
        cdInterval = setInterval(() => {
            sendCooldown--;
        }, 1000);
        setTimeout(() => {
            clearInterval(cdInterval);
        }, 2000);
    });

    // character count and enable send button when there's input
    messageInput.addEventListener('input', e => {
        if (e.target.value == "") {
            messageSendBtn.setAttribute('disabled', true);
        } else {
            messageSendBtn.removeAttribute('disabled');
        }
        // e.target.value = e.target.value.substr(0,100);
        charCount.innerText = e.target.value.length;
    });

    // press enter to submit form (instead of new line in textarea)
    messageInput.addEventListener('keypress', e => {
        // press enter sends message
        if (e.which == 13) {
            e.preventDefault();
            messageSendBtn.click();
            messageInput.style.height = "2.3125rem";
        }
    });

    // turn on/off autoscroll
    autoscrollSwitch.addEventListener('change', () => {
        isAutoscroll = autoscrollSwitch.checked;
        if (autoscrollSwitch.checked) {
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    });

    // create room modal
    createRoomBtn.addEventListener('click', e => {
        e.preventDefault();
        $('#create-room-modal').modal();
    });

    // create room
    createRoomForm.addEventListener('submit', e => {
        e.preventDefault();
        const roomName = e.target.elements['room-name-input'].value;
        const password = e.target.elements['password-input'].value;
        // send create room request to server (server will check if room name already in use)
        if (roomName != "" && roomName.length <= 10) {
            socket.emit('createRoom', {roomName, password});
        } 
    });

    // when room name modified
    document.getElementById('room-name-input').addEventListener('input', () => {
        document.getElementById('error-feedback').classList.add('d-none');
        document.getElementById('create-btn').removeAttribute('disabled');
    });

    // autogrow textarea
    autosize(document.querySelector('textarea'));

    // generate chat messages
    const renderChatMessage = (sessionId, data) => {
        const div = document.createElement('div');
        div.classList.add('message');
        div.innerHTML = "";
        if (data.userId == null) {
            div.classList.add('system-message');
        } else if (data.userId == sessionId) {
            div.classList.add('my-message');
            div.style.backgroundColor = data.color;
            div.innerHTML += `<div class="username">
                                ${data.username}
                            </div>`;
        } else {
            div.classList.add('other-message');
            div.style.backgroundColor = data.color;
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
        document.getElementById('user-list').innerHTML = `
            ${users.map(user => `<li>${user.username}</li>`).join('')}
        `;
    }

    // add existing rooms to room list
    const renderRooms = rooms => {
        document.getElementById('room-list').innerHTML = `
            ${rooms.filter(room => !room.isPlaying).map(room => `<a href="/chatroom?room=${room.name}"><li>${room.name}</li></a>`).join('')}
        `;
    }

});
