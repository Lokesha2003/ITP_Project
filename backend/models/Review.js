const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    userName: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: [true, "Review title is required"],
        minlength: [3, "Title must be at least 3 characters long"],
        maxlength: [100, "Title cannot exceed 100 characters"]
    },
    comment: {
        type: String,
        required: true,
        minlength: [10, "Comment must be at least 10 characters long"],
        maxlength: [500, "Comment cannot exceed 500 characters"]
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    images: [String],
    eventDate: {
        type: Date,
        required: [true, "Event date is required"]
    },
}, { timestamps: true });

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;