const mongoose = require('mongoose');

// mongoose.connect('mongodb://localhost:27017/minisocial');

const postSchema = mongoose.Schema({
    user: { type:mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    content: String,
    likes : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        }
    ] //user's ids who is liking the psot

},{timestamps:true})

module.exports = mongoose.model('post', postSchema);