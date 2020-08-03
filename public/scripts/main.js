document.addEventListener('DOMContentLoaded', () => {
    const hash = new Hashes.SHA256;
    const chatForm = document.getElementById('message-form');
    const chatWindow = document.querySelector('.chat-area');
    const createRoomBtn = document.getElementById('create-room-btn');

    const username = sessionStorage.getItem('username');
    
    const challenge = hash.hex(username);

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
        socket.emit('joinRoom', { username, room: 'Public Area' });

        // listens for current room and users info
        socket.on('roomUsers', ({room, users}) => {
            renderRoomName(room);
            renderUserList(users);
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


    // create room
    createRoomBtn.addEventListener('click', e => {
        e.preventDefault();
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
        document.getElementById('user-list').innerHTML = `
            ${users.map(user => `<li>${user.username}</li>`).join('')}
        `;
    }

});
