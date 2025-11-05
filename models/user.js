// Load required packages
var mongoose = require('mongoose');

// Define our user schema
// Here is the User Schema:

var UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true,"Name is required"],
        validate:{
            validator: isNonEmpty,
            message: props => `${props.value} must be non-empty`
        }
    },
    email: {
        type: String,
        required: [true,"Email is required"],
        validate:{
            validator: isNonEmpty,
            message: props => `${props.value} must be non-empty`
        },
        unique: [true, 'Email must be unique']
    },
    pendingTasks: [String],
    dateCreated: {
        type: Date,
        default: Date.now,
        immutable: true
    }
});

function isNonEmpty(v){
    return v.trim().length > 0;
}

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);
