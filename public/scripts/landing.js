document.addEventListener('DOMContentLoaded', () => {
    const hash = new Hashes.SHA256;

    // on landing page, clear stored username if exists
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('token');

    const usernameForm = document.getElementById('username-form');
    const usernameInput = document.getElementById('username-input');
    
    // on submit, check if user exists, then redirect to public area
    usernameForm.addEventListener('submit', e => {
        e.preventDefault();
        const username = e.target.elements['username-input'].value;
        const socket = io();
        socket.on('connect', () => {
            // check if username exists
            socket.emit('checkUserExists', username);
            socket.on('userExists', userExists => {
                if (userExists) {
                    validateForm(false)
                } else {
                    // redirect user to public with username
                    const color = document.querySelector('.selected').style.backgroundColor;
                    sessionStorage.setItem('username', username);
                    sessionStorage.setItem('token', hash.hex(username));
                    sessionStorage.setItem('color', color)
                    window.location.href = '/public.html';
                }
            })
        });
    });
    
    // on input change, remove invalid properties
    usernameInput.addEventListener('input', e => {
        validateForm(true);
    });

    // on color select
    $('.color:not(.selected)').on('click', e => {
        console.log(e.target.style.backgroundColor);
        $('.selected').removeClass('selected');
        e.target.classList.add('selected');
    });
    
    // helper to add/remove invalid properties
    const validateForm = valid => {
        const joinBtn = document.getElementById('join-btn');
        const errorFeedback = document.getElementById('error-feedback');
        if (valid) {
            usernameInput.classList.remove('invalid');
            joinBtn.classList.remove('invalid');
            errorFeedback.classList.remove('show');
        } else {
            usernameInput.classList.add('invalid');
            joinBtn.classList.add('invalid');
            errorFeedback.classList.add('show');
        }
    };

});
