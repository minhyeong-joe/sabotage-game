document.addEventListener('DOMContentLoaded', () => {
    const hash = new Hashes.SHA256;
    const loader = document.getElementById('loader');
    const chatForm = document.getElementById('message-form');
    const chatWindow = document.querySelector('.chat-area');
    const topicSelect = document.getElementById('topic-select');
    const startGameBtn = document.getElementById('start-game-btn');
    const readyToVoteBtn = document.getElementById('ready-to-vote-btn');
    const sabotageBtn = document.getElementById('sabotage-btn');
    const voteBtn = document.getElementById('vote-btn');
    const challengeBtn = document.getElementById('challenge-btn');
    const messageInput = document.getElementById('messageInput');
    const messageSendBtn = document.getElementById('message-send-btn');
    const charCount = document.getElementById('current-character-count');
    const spamPrevention = document.getElementById('spam-prevention');
    const voteTimer = document.getElementById('vote-timer');
    const sabotageTimer = document.getElementById('sabotage-timer');
    const volumeControl = document.getElementById('volume');

    const messageInputHeight = messageInput.style.height;

    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room');

    const username = sessionStorage.getItem('username');
    const color = sessionStorage.getItem('color');
    const font = sessionStorage.getItem('font');
    const roomToken = sessionStorage.getItem('room-token');

    messageInput.style.fontFamily = font;

    let sendCooldown = 0;
    let cdInterval;

    // game stats
    const VOTE_TIME_LIMIT = 10;
    const SABOTAGE_TIME_LIMIT = 20;
    let isHost = false;
    let isSpy = false;
    let isAlive = false;
    let numUsers;
    let voteTime = 0;
    let sabotageTime = 0;
    let voteInterval;
    let voteTimeout;
    let sabotageInterval
    let sabotageTimeout;

    // game sounds
    let volume = 1;
    const notification = new Audio("../assets/notification.wav");
    const startSound = new Audio('../assets/start.wav');
    const timerSound = new Audio('../assets/clock.wav');
    const gunshotSound = new Audio('../assets/gunshot.wav');
    const spyWinSound = new Audio('../assets/spy_wins.wav');
    const agentWinSound = new Audio('../assets/agents_win.wav');

    // modifying username in session storage: kick out to landing
    if (!username || hash.hex(username) != sessionStorage.getItem('token')) {
        window.location.replace('/');
        return;
    }

    // hacky access to a room by typing in the room name in url
    if (!roomToken || hash.hex(roomName) != roomToken) {
        window.location.replace('/public');
        return;
    }

    const socket = io();

    socket.on('connect', () => {

        // join specific room
        socket.emit('joinRoom', { username, room: roomName, color });

        
        // listens for current room and users info
        socket.on('roomUsers', ({room, users}) => {
            renderRoomName(room);
            renderUserList(users);
            numUsers = users.length;
            if (users[0].id == socket.id) {
                isHost = true;
            }
        });

        // remove loader
        $('body').removeClass('loading');
        loader.classList.remove('loading');

        // listens for topic change
        socket.on('topicChange', topic => {
            topicSelect.value = topic;
        });

        // listens for game start
        socket.on('gameStart', game => {
            spyWinSound.pause();
            agentWinSound.pause();
            startSound.currentTime = 0;
            startSound.volume = volume;
            startSound.play();
            chatWindow.innerHTML = "";
            renderChatMessage(socket.id, {id: null, username: "ChatBot", message: "The Game has started!", time: new Date().toLocaleTimeString()});
            $('#game-rule-modal').modal('hide');
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
            $('#game-rule-modal').modal('hide');
            $('#vote-modal').modal({
                backdrop: 'static',
                keyboard: false
            });
            // start vote timer
            timerSound.currentTime = 0;
            timerSound.volume = volume;
            timerSound.play();
            voteTime = VOTE_TIME_LIMIT;
            voteTimer.innerText = voteTime;
            voteInterval = setInterval(() => {
                voteTime--;
                voteTimer.innerText = voteTime;
            }, 1000);
            voteTimeout = setTimeout(() => {
                clearInterval(voteInterval);
                // if time exceeds, skip vote by default
                socket.emit('vote', 'skip');
                $('#vote-modal').modal('hide');
            }, VOTE_TIME_LIMIT*1000);
        });

        // listens for the vote done
        socket.on('voteDone', deadId => {
            timerSound.pause();
            if (deadId) {
                gunshotSound.currentTime = 0;
                gunshotSound.volume = volume;
                gunshotSound.play();
            }

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
                $('#game-rule-modal').modal('hide');
                $('#sabotage-modal').modal({
                    backdrop: 'static',
                    keyboard: false
                });
                // start the sabotage timer
                timerSound.currentTime = 0;
                timerSound.volume = volume;
                timerSound.play();
                sabotageTime = SABOTAGE_TIME_LIMIT;
                sabotageTimer.innerText = sabotageTime;
                sabotageInterval = setInterval(() => {
                    sabotageTime--;
                    sabotageTimer.innerText = sabotageTime;
                }, 1000);
                sabotageTimeout = setTimeout(() => {
                    clearInterval(sabotageInterval);
                    // if time exceeds, sabotage with whatever word is currently selected
                    const guess = document.getElementById('sabotage-select').value;
                    socket.emit('guess', guess);
                    $('#sabotage-modal').modal('hide');
                }, SABOTAGE_TIME_LIMIT*1000);
            }
        });

        // listens for game end
        socket.on('endGame', winner => {
            timerSound.pause();
            // un-initialize the game and disable game buttons
            // game end clean up
            document.querySelector('.game-start-container').classList.remove("d-none");
            document.querySelector('.list-of-words-toggle').classList.add('d-none');
            $('#list-of-words').collapse('hide');
            document.getElementById('sabotage-btn').setAttribute('disabled',true);
            document.getElementById('ready-to-vote-btn').setAttribute('disabled', true);
            document.querySelector('.spy-view').classList.add('d-none');
            document.getElementById('answer-word').innerText = "";
            document.querySelector('.agent-view').classList.add('d-none');
            document.querySelector('.dead-view').classList.add('d-none');
            $('#vote-modal').modal('hide');
            $('#sabotage-modal').modal('hide');
            $('#game-rule-modal').modal('hide');
            clearInterval(voteInterval);
            clearInterval(sabotageInterval);
            clearTimeout(voteTimeout);
            clearTimeout(sabotageTimeout);
            timerSound.pause();
            voteTime = 0;
            sabotageTime = 0;
            isSpy = false;
            isAlive = false;
            if (winner == 'agents') {
                agentWinSound.currentTime = 0;
                agentWinSound.volume = volume;
                agentWinSound.play();
            } else {
                spyWinSound.currentTime = 0;
                spyWinSound.volume = volume;
                spyWinSound.play();
            }
        });

        // listens for a message
        socket.on('message', data => {
            renderChatMessage(socket.id, data);
            chatWindow.scrollTop = chatWindow.scrollHeight;
        });


    });

    // sending message
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        messageInput.style.height = messageInputHeight;
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
        } else {
            clearInterval(cdInterval);
            sendCoolDown = 0;
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
    });

    // character count and enable send button when there's input
    messageInput.addEventListener('input', e => {
        if (e.target.value == "") {
            messageSendBtn.setAttribute('disabled', true);
        } else {
            messageSendBtn.removeAttribute('disabled');
        }
        charCount.innerText = e.target.value.length;
    });

    // press enter to submit form (instead of new line in textarea)
    messageInput.addEventListener('keypress', e => {
        // press enter sends message
        if (e.which == 13) {
            e.preventDefault();
            messageSendBtn.click();
            messageInput.style.height = messageInputHeight;
        }
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
        if (numUsers < 3) {
            $('.not-enough').slideDown();
            setTimeout(() => {
               $('.not-enough').slideUp(); 
            }, 1500);
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
        clearTimeout(voteTimeout);
        clearInterval(voteInterval);
        voteTime = 0;
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
            clearTimeout(sabotageTimeout);
            clearInterval(sabotageInterval);
            sabotageTime = 0;
            const guess = document.getElementById('sabotage-select').value;
            socket.emit('guess', guess);
            $('#sabotage-modal').modal('hide');
        }
    });

    // autogrow textarea
    autosize(document.querySelector('textarea'));

    // volume controller
    volumeControl.addEventListener('change', e => {
        volume = e.target.value;
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
            div.innerHTML += `<div class="username" style="font-family: ${font}">
                                ${data.username}
                            </div>`;
            // play notification for my message
            notification.currentTime = 0;   
            notification.play();
        } else {
            div.style.backgroundColor = data.color;
            div.innerHTML += `<div class="username" style="font-family: ${font}">
                                ${data.username}
                            </div>`;
            // play notification for someone else's message
            notification.currentTime = 0;   
            notification.play();
        }
        div.innerHTML += `<div class="content" style="font-family: ${font}">
                            ${data.message}
                        </div>
                        <div class="timestamp" style="font-family: ${font}">
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
