let users = [];

// join user to chat
const userJoin = (id, username, room) => {
    const user = {
        id,
        username,
        room
    };
    users.push(user);
    return user;
}

// get current user
const getCurrentUser = id => {
    return users.find(user => user.id == id);
}

// User leaves room
const userLeave = id => {
    const user = users.find(user => user.id == id);
    users = users.filter(user => user.id != id);

    return user;
}

// users in the room
const getRoomUsers = room => {
    return users.filter(user => user.room == room);
}
 
module.exports = {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers
}