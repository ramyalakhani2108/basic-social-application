const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/minisocial');

const userSchema = mongoose.Schema({
    username: String,
    name: String,
    email: String,
    password: String,
    age: Number,
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post'
    }],
    profile: {
        type: String,
        default: 'default.png'
    }
})

module.exports = mongoose.model('user', userSchema);