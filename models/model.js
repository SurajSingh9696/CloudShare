const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    url: { type: String, required: true },
    id: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
},{
    timestamps: true,
    collection: 'CloudShare'
});

const Model = mongoose.model('Model', modelSchema);
module.exports = Model;