const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    currentRole: {
      type: String,
      default: "",
    },

    targetRole: {
      type: String,
      required: true,
    },

    experience: {
      type: String,
      default: "",
    },

    skills: [
      {
        name: String,
        currentLevel: {
          type: Number,
          min: 1,
          max: 5,
          default: 1,
        },
      },
    ],

    projects: [
      {
        title: String,
        description: String,
        technologies: [String],
      },
    ],

    availableTime: {
      type: String,
      default: "1 hour/day",
    },

    learningStyle: {
      type: String,
      default: "hands-on",
    },
  },
  {
    timestamps: true,
  }
);

const Profile = mongoose.model("Profile", profileSchema);

module.exports = Profile;