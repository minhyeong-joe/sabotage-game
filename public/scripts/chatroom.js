document.addEventListener('DOMContentLoaded', () => {
    const hash = new Hashes.SHA256;
    const chatForm = document.getElementById('message-form');
    const chatWindow = document.querySelector('.chat-area');
    const topicSelect = document.getElementById('topic-select');
    const startGameBtn = document.getElementById('start-game-btn');
    const readyToVoteBtn = document.getElementById('ready-to-vote-btn');
    const sabotageBtn = document.getElementById('sabotage-btn');
    const voteBtn = document.getElementById('vote-btn');
    const challengeBtn = document.getElementById('challenge-btn');

    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room');

    const username = sessionStorage.getItem('username');
    const color = sessionStorage.getItem('color');
    
    const challenge = hash.hex(username);

    // game stats
    let isHost = false;
    let isSpy = false;
    let isAlive = false;

    if (!username || challenge != sessionStorage.getItem('token')) {
        // TODO: make error feedback look better
        alert("Invalid access!");
        window.location.replace('/');
        return;
    }

    const socket = io();

    socket.on('connect', () => {

        // check if room is valid
        socket.on('roomExists', roomExists => {
            if (!roomExists) {  
                window.location.replace('/public.html');
                return;
            }
        });

        // join specific room
        socket.emit('joinRoom', { username, room: roomName, color });

        // listens for current room and users info
        socket.on('roomUsers', ({room, users}) => {
            renderRoomName(room);
            renderUserList(users);
            if (users[0].id == socket.id) {
                isHost = true;
            }
        });

        // listens for topic change
        socket.on('topicChange', topic => {
            topicSelect.value = topic;
        });

        // listens for game start
        socket.on('gameStart', game => {
            chatWindow.innerHTML = "";
            renderChatMessage(socket.id, {id: null, username: "ChatBot", message: "The Game has started!", time: new Date().toLocaleTimeString()});
            document.querySelector('.game-start-container').classList.add("d-none");
            document.querySelector('.list-of-words-toggle').classList.remove('d-none');
            document.getElementById('ready-to-vote-btn').removeAttribute('disabled');
            document.querySelector('.list-group').innerHTML = `
            ${game.list.map(option => `<li class="list-group-item">${option}</li>`).join('')}
            `;
            document.getElementById('sabotage-select').innerHTML = `
            ${game.list.map(option => `<option value="${option}">${option}</option>`).join('')}
            `;
            // if spy
            if (game.role == 'spy') {
                document.querySelector('.spy-view').classList.remove('d-none');
                document.getElementById('sabotage-btn').removeAttribute('disabled');
                isSpy = true;
            } 
            // else agent
            else {
                document.getElementById('answer-word').innerText = game.word;
                document.querySelector('.agent-view').classList.remove('d-none');
            }
            // all players
            isAlive = true;
        });

        // listens for vote time
        socket.on('vote', survived => {
            // disable sabotage btn
            sabotageBtn.setAttribute('disabled', true);
            const voteSelect = document.getElementById('vote-select');
            voteSelect.innerHTML = '<option value="skip">Skip Vote</option>';
            voteSelect.innerHTML += `
                ${survived.map(surv => `<option value="${surv.id}">${surv.username}</option>`).join('')}
            `;
            $('#vote-modal').modal({
                backdrop: 'static',
                keyboard: false
            });
        });

        // listens for the vote done
        socket.on('voteDone', deadId => {

            if (deadId == socket.id) {
                isAlive = false;
                document.querySelector('.agent-view').classList.add('d-none');
                document.querySelector('.dead-view').classList.remove('d-none');
                readyToVoteBtn.setAttribute('disabled', true);
                sabotageBtn.setAttribute('disabled', true);
            } else {
                readyToVoteBtn.removeAttribute('disabled');
                if (isSpy) {
                    sabotageBtn.removeAttribute('disabled');
                }
            }
        });

        // listens for sabotage attempt
        socket.on('sabotage', () => {
            readyToVoteBtn.setAttribute('disabled', true);
            sabotageBtn.setAttribute('disabled', true);
            if (isSpy) {
                $('#sabotage-modal').modal({
                    backdrop: 'static',
                    keyboard: false
                });
            }
        });

        // listens for game end
        socket.on('endGame', () => {
            // un-initialize the game and disable game buttons
            document.querySelector('.game-start-container').classList.remove("d-none");
            document.querySelector('.list-of-words-toggle').classList.add('d-none');
            document.getElementById('sabotage-btn').setAttribute('disabled',true);
            document.getElementById('ready-to-vote-btn').setAttribute('disabled', true);
            document.querySelector('.spy-view').classList.add('d-none');
            document.getElementById('answer-word').innerText = "";
            document.querySelector('.agent-view').classList.add('d-none');
            document.querySelector('.dead-view').classList.add('d-none');
            isSpy = false;
            isAlive = false;
        });

        // listens for a message
        socket.on('message', data => {
            // if at the bottom, then automatically scroll to new message
            // let autoScroll = false;
            // if (chatWindow.scrollTop == chatWindow.scrollHeight-480) {
            //     autoScroll = true;
            // }
            renderChatMessage(socket.id, data);
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
        if (!isHost) {
            e.preventDefault();
            return;
        }
        const selectedTopic = e.target.value;
        socket.emit('topicChange', selectedTopic);
    });

    // start game
    startGameBtn.addEventListener('click', () => {
        if (!isHost) {
            return;
        }
        socket.emit('gameStart', topicSelect.value);
    });

    // ready to vote btn
    readyToVoteBtn.addEventListener('click', () => {
        if (!isAlive) {
            return;
        }
        socket.emit('readyToVote');
        readyToVoteBtn.setAttribute('disabled', true);
    });

    // vote btn
    voteBtn.addEventListener('click', () => {
        if (!isAlive) {
            return;
        }
        const voted = document.getElementById('vote-select').value;
        socket.emit('vote', voted);
        $('#vote-modal').modal('hide');
    });


    // sabotage btn
    sabotageBtn.addEventListener('click', () => {
        if (!isAlive) {
            return;
        }
        if (isSpy) {
            socket.emit('sabotage');
        }
    });

    // confirm sabotage btn
    challengeBtn.addEventListener('click', () => {
        if (isSpy) {
            const guess = document.getElementById('sabotage-select').value;
            socket.emit('guess', guess);
            $('#sabotage-modal').modal('hide');
        }
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
