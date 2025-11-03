// Load required packages
var mongoose = require('mongoose');

// Define our task schema

var TaskSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        validate:{
            validator: function(v){
                return v.trim().length > 0;
            },
            message: props => `${props.value} must be non-empty`
        }
    },
    description: String,
    deadline: {
        type: Date,
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    assignedUser:{
        type: String,
        default: ""
    },
    assignedUserName:{
        type: String,
        default: "unassigned"
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

// Export the Mongoose model
module.exports = mongoose.model('Task', TaskSchema);
