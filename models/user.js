const mongoose = require('mongoose');
const { type } = require('os');
const { ref } = require('process');

const userSchema = new mongoose.Schema({
    username: String,
    name: String,
    age: Number,
    email: String,
    password: String,
    profilepic: {
        type: String,
        default: 'default.png'
    },
    posts: [
        {type: mongoose.Schema.Types.ObjectId, ref: "post"}],
    
});

module.exports = mongoose.model("user", userSchema);