const moment = require('moment');

function message(userId, username, message, color) {
    message = message.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
    return {
        userId,
        username,
        message,
        color,
        time: moment().format('h:mm:ss a')
    }
}

module.exports = message;