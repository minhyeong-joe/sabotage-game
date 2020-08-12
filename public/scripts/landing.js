document.addEventListener('DOMContentLoaded', () => {
    const hash = new Hashes.SHA256;

    // on landing page, clear stored username if exists
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('color');

    const usernameForm = document.getElementById('username-form');
    const usernameInput = document.getElementById('username-input');
    
    // on submit, check if user exists, then redirect to public area
    usernameForm.addEventListener('submit', e => {
        e.preventDefault();
        let username = e.target.elements['username-input'].value;
        const socket = io();
        socket.on('connect', () => {
            // check if username exists
            socket.emit('checkUserExists', username);
            socket.on('userExists', userExists => {
                if (userExists) {
                    validateForm("Username already exists");
                } else {
                    // redirect user to public with username
                    const color = document.querySelector('.selected').style.backgroundColor;
                    username = username.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
                    if (username.length > 10) {
                        validateForm("Username too long (has to be less than 10 characters)");
                        return;
                    }
                    sessionStorage.setItem('username', username);
                    sessionStorage.setItem('token', hash.hex(username));
                    sessionStorage.setItem('color', color)
                    window.location.href = '/public';
                }
            })
        });
    });
    
    // on input change, remove invalid properties
    usernameInput.addEventListener('input', e => {
        validateForm();
    });

    // on color select
    $('.color').on('click', e => {
        $('.selected').removeClass('selected');
        e.target.classList.add('selected');
    });
    
    // helper to add/remove invalid properties
    const validateForm = err => {
        const joinBtn = document.getElementById('join-btn');
        const errorFeedback = document.getElementById('error-feedback');
        if (err == null) {
            usernameInput.classList.remove('invalid');
            joinBtn.classList.remove('invalid');
            errorFeedback.classList.remove('show');
        } else {
            usernameInput.classList.add('invalid');
            joinBtn.classList.add('invalid');
            errorFeedback.innerHTML = err;
            errorFeedback.classList.add('show');
        }
    };

});
