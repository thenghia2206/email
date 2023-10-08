const mongoose = require('mongoose');

const gmailSchema = new mongoose.Schema({
    from: {
        type: String,
        required: false,
        trim: true
    },
    to: {
        type: String,
        required: false,
        trim: true
    },
    subject: {
        type: String,
        required: false,
        trim: true
    },
    text: {
        type: String,
        required: false,
        trim: true
    },
    fileLinks: {
        type: Array,
        required: false,
        trim: true
    },
    createdAt : {
        type: Date,
        required: false,
        trim: true
    },
    updatedAt : {
        type: Date,
        required: false,
        trim: true
    }
});

const Gmail = mongoose.model('Gmail', gmailSchema);

module.exports = Gmail;
