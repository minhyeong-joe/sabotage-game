const topics = {
    "animal": ["Cat", "Dog", "Elephant", "Fox", "Zebra"],
    "place": ["Aquarium", "Restaurant", "Market", "Zoo"]
};

// get entire list under topic
const getAllWords = topic => {
    return topics[topic];
}

// get a random word
const getRandomWord = topic => {
    const words = topics[topic];
    const rand = Math.floor(Math.random() * (words.length));
    return words[rand];
}

// pick a spy
const getRandomSpy = users => {
    const rand = Math.floor(Math.random() * (users.length));
    return users[rand];
}

module.exports = {
    getAllWords,
    getRandomWord,
    getRandomSpy
}