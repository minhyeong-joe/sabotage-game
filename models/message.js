const moment = require('moment');

function message(userId, username, message, color) {
    return {
        userId,
        username,
        message,
        color,
        time: moment().format('h:mm:ss a')
    }
}

module.exports = message;