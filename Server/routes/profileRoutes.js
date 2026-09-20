const express = require("express");
const router = express.Router();
const Profile = require("../models/Profile");
const {
  analyzeSkillGaps,
  generateLearningPlan,
  analyzeProgress,
  adaptLearningPlan,
  recommendLearningResources,
  answerLearningQuestion,
} = require("../services/geminiService");
const { retrieveResources } = require("../services/resourceRetriever");

// POST /api/profiles/analyze — AI skill gap analysis
router.post("/analyze", async (req, res) => {
  try {
    const profile = req.body;

    const analysis = await analyzeSkillGaps(profile);

    res.json({
      message: "Skill gap analysis completed successfully",
      analysis,
    });
  } catch (error) {
    console.error("AI analysis failed:", error);

    res.status(500).json({
      message: "Failed to analyze skill gaps",
      error: error.message,
    });
  }
});

// POST /api/profiles/plan — Generate a personalized learning roadmap
router.post("/plan", async (req, res) => {
  try {
    const { profile, analysis } = req.body;
    const plan = await generateLearningPlan(profile, analysis);

    res.json({
      message: "Learning plan generated successfully",
      plan,
    });
  } catch (error) {
    console.error("Learning plan generation failed:", error);

    res.status(500).json({
      message: "Failed to generate learning plan",
      error: error.message,
    });
  }
});

// POST /api/profiles/progress — Analyze actual roadmap progress
router.post("/progress", async (req, res) => {
  try {
    const {
      profile,
      analysis,
      plan,
      completedTasks,
      progressPercentage,
    } = req.body;

    const progress = await analyzeProgress(
      profile,
      analysis,
      plan,
      completedTasks,
      progressPercentage
    );

    res.json({
      message: "Progress analysis completed successfully",
      progress,
    });
  } catch (error) {
    console.error("Progress analysis failed:", error);

    res.status(500).json({
      message: "Failed to analyze progress",
      error: error.message,
    });
  }
});

// POST /api/profiles/adapt — Adapt future roadmap work from progress
router.post("/adapt", async (req, res) => {
  try {
    const { profile, plan, progressReport } = req.body;
    const adaptation = await adaptLearningPlan(
      profile,
      plan,
      progressReport
    );

    res.json({
      message: "Learning plan adaptation completed successfully",
      adaptation,
    });
  } catch (error) {
    console.error("Learning plan adaptation failed:", error);

    res.status(500).json({
      message: "Failed to adapt learning plan",
      error: error.message,
    });
  }
});

// POST /api/profiles/resources — Retrieve and personalize learning resources
router.post("/resources", async (req, res) => {
  try {
    const { profile, analysis } = req.body;
    const skillGaps = Array.isArray(analysis?.gaps) ? analysis.gaps : [];
    const retrievedResources = retrieveResources(skillGaps);

    if (skillGaps.length === 0 || retrievedResources.length === 0) {
      return res.json({
        message: "No matching learning resources found",
        recommendations: [],
      });
    }

    try {
      const result = await recommendLearningResources(
        profile,
        analysis,
        retrievedResources
      );

      return res.json({
        message: "Learning resources recommended successfully",
        recommendations: result.recommendations,
      });
    } catch (error) {
      console.error("Resource personalization failed:", error.message);

      return res.json({
        message: "Retrieved learning resources; AI personalization is temporarily unavailable",
        recommendations: retrievedResources.map((group) => ({
          skill: group.skill,
          priority: group.priority,
          resources: group.resources.map((resource) => ({
            title: resource.title,
            type: resource.type,
            url: resource.url,
            reason: "Retrieved from the EduPath resource library for this skill gap.",
          })),
        })),
      });
    }
  } catch (error) {
    console.error("Learning resource recommendation failed:", error);

    res.status(500).json({
      message: "Failed to recommend learning resources",
      error: "The learning resources could not be generated right now.",
    });
  }
});

// POST /api/profiles/assistant — Answer a context-aware learning question
router.post("/assistant", async (req, res) => {
  try {
    const {
      profile,
      analysis,
      plan,
      completedTasks,
      progressReport,
      adaptation,
      resources,
      question,
    } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        message: "A learning question is required",
        error: "Please enter a question about your EduPath journey.",
      });
    }

    const result = await answerLearningQuestion(
      profile,
      analysis,
      plan,
      completedTasks,
      progressReport,
      adaptation,
      resources,
      question
    );

    res.json({
      message: "Learning assistant response generated successfully",
      answer: result.answer,
    });
  } catch (error) {
    console.error("Learning assistant failed:", error);

    res.status(500).json({
      message: "Failed to answer learning question",
      error: "The learning assistant could not answer right now.",
    });
  }
});

// POST /api/profiles — Create a new profile
router.post("/", async (req, res) => {
  try {
    const profile = await Profile.create(req.body);

    res.status(201).json({
      message: "Profile created successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create profile",
      error: error.message,
    });
  }
});

// GET /api/profiles — Fetch all profiles
router.get("/", async (req, res) => {
  try {
    const profiles = await Profile.find();

    res.json(profiles);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch profiles",
      error: error.message,
    });
  }
});

module.exports = router;