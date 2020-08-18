let rooms = [];

// create room
const createRoom = (roomName, password) => {
    const room = {
        name: roomName,
        isPlaying: false,
        password: password == ""? null: password,
        survived: [],
        readyToVote: [],
        votes: {},
        answer: null,
        spy: null,
        numUsers: 0
    }
    rooms.push(room);
    return room;
}

// remove room
const removeRoom = roomName => {
    rooms =  rooms.filter(room => room.name != roomName);
}

// get all rooms
const getAllRooms = () => {
    return rooms;
}

// start the game for the room
const startGame = (roomName, survived, answer, spy) => {
    let room = rooms.find(room=>room.name == roomName);
    room.isPlaying = true;
    room.survived = survived;
    room.answer = answer;
    room.spy = spy;
}

// end the game for the room
const endGame = roomName => {
    let room = rooms.find(room=>room.name == roomName);
    room.isPlaying = false;
    room.survived = [];
    room.readyToVote = [];
    room.votes = {};
    room.spy = null;
    room.answer = null;
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
const addVote = (roomName, voterId, votedId) => {
    let room = rooms.find(room => room.name == roomName);
    room.votes[voterId] = votedId;
}

// get the most voted userId
const getMostVoted = roomName => {
    let room = rooms.find(room => room.name == roomName);
    let voteCount = {};
    for (const [_, votedId] of Object.entries(room.votes)) {
        if (voteCount[votedId]) {
            voteCount[votedId] += 1;
        } else {
            voteCount[votedId] = 1;
        }
    }
    return Object.keys(voteCount).reduce((a,b)=>voteCount[a]> voteCount[b]? a: b);
}

// get the total vote count
const getTotalVotes = roomName => {
    let room = rooms.find(room => room.name == roomName);
    return Object.keys(room.votes).length;
}

// get votes
const getVotes = roomName => {
    let room = rooms.find(room => room.name == roomName);
    return room.votes;
}

// get answer
const getAnswer = roomName => {
    return rooms.find(room => room.name == roomName).answer;
}

// get spy
const getSpy = roomName => {
    return rooms.find(room => room.name == roomName).spy;
}
 
module.exports = {
    createRoom,
    removeRoom,
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
    getTotalVotes,
    getVotes,
    getAnswer,
    getSpy
}