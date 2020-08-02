const moment = require('moment');

function message(userId, username, message) {
    return {
        userId,
        username,
        message,
        time: moment().format('h:mm:ss a')
    }
}

module.exports = message;