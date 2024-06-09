const { mongoose } = require('../services/imports');

module.exports = mongoose.model(
    'income',
    new mongoose.Schema(
        {
            incomeType: { type: String, uppercase: true },
            description: String,
            createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
            giver: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
            date: Date,
            atatchMent: String,
            amount: Number,
            isDeleted: { type: Boolean, default: false },
        },
        { timestamps: true, versionKey: false }
    ),
    'income'
);