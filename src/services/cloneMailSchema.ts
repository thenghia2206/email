import mongoose from 'mongoose';

const CloneMailSchema = new mongoose.Schema({
    emailId: {
        type: String,
        required: false,
        unique : true,
    },
    status: {
        type: Number,
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

const CloneMail = mongoose.model('CloneMail', CloneMailSchema);

module.exports = CloneMail;
