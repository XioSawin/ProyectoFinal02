const mongoose = require('mongoose');

const usersCollection = 'users';

/* -------------- SCHEMA -------------- */
const UserSchema = new mongoose.Schema({
    username: {type: String, require: true, max: 100},
    password: {type: String, require: true, max: 30},
    name: {type: String, require: true, max: 50},
    address: {type: String, require: true, max: 50},
    phoneNumber: {type: Number, require: true},
    age: {type: Number, require: true},
    avatar: {type: String}
});

module.exports = mongoose.model(usersCollection, UserSchema);