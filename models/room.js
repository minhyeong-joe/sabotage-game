const rooms = [
    { 
        name: "room1",
        isPlaying: false,
        password: null,
        survived: [],
        readyToVote: [],
        votes: {}
    }
];

// get all rooms
const getAllRooms = () => {
    return rooms;
}

// start the game for the room
const startGame = (roomName, survived) => {
    let room = rooms.find(room=>room.name == roomName);
    room.isPlaying = true;
    room.survived = survived;
}

// end the game for the room
const endGame = roomName => {
    let room = rooms.find(room=>room.name == roomName);
    room.isPlaying = false;
    room.survived = [];
    room.readyToVote = [];
    room.votes = {};
}

// get the users that are readyToVote
const getReadyToVote = roomName => {
    return rooms.find(room => room.name == roomName).readyToVote;
}

// increase readyToVote
const addReadyToVote = (roomName, userId) => {
    let room = rooms.find(room => room.name == roomName);
    if (!room.readyToVote.includes(userId)) {
        room.readyToVote.push(userId);
    }
}

// reset readyToVote, votes
const resetVotes = roomName => {
    let room = rooms.find(room => room.name == roomName);
    room.readyToVote = [];
    room.votes = {};
}

// get the survived users
const getSurvived = roomName => {
    return rooms.find(room => room.name == roomName).survived;
}

// kill a survivor
const killSurvivor = (roomName, userId) => {
    let room = rooms.find(room => room.name == roomName);
    room.survived = room.survived.filter(user => user.id != userId);
}

// receive votes
const addVote = (roomName, userId) => {
    let room = rooms.find(room => room.name == roomName);
    if (room.votes[userId]) {
        room.votes[userId] += 1;
    } else {
        room.votes[userId] = 1;
    }
}

// get the most voted userId
const getMostVoted = roomName => {
    let room = rooms.find(room => room.name == roomName);
    return Object.keys(room.votes).reduce((a,b)=>room.votes[a]> room.votes[b]? a: b);
}

// get the total vote count
const getTotalVotes = roomName => {
    let room = rooms.find(room => room.name == roomName);
    console.log(room.votes);
    console.log(Object.keys(room.votes).reduce((a,b) => room.votes[a] + room.votes[b]))
    return Object.keys(room.votes).reduce((sum,key) => sum + room.votes[key], 0);
}
 
module.exports = {
    getAllRooms,
    startGame,
    endGame,
    getReadyToVote,
    addReadyToVote,
    resetVotes,
    getSurvived,
    killSurvivor,
    addVote,
    getMostVoted,
    getTotalVotes
}