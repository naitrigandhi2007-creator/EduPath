import { useRef, useState } from "react";
import VoiceAssistant from "./VoiceAssistant";
import { API_BASE_URL } from "./api";

const readStoredJson = (key, fallback = null) => {
  if (!key) {
    return fallback;
  }

  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch (error) {
    console.error(error);
    return fallback;
  }
};

const getProfileKey = (profile) =>
  profile
    ? profile._id || `${profile.name}-${profile.targetRole}`
    : null;

const quotaErrorMessage =
  "AI generation is temporarily unavailable because the AI service quota has been reached. Your existing roadmap and progress are still available.";
const assistantQuotaErrorMessage =
  "The AI assistant is temporarily unavailable because the AI service has reached its current usage limit. Please try again later.";

const isQuotaError = (response, data) => {
  const errorText = typeof data.error === "string"
    ? data.error
    : JSON.stringify(data.error || data);

  return response.status === 429 ||
    errorText.includes("429") ||
    errorText.includes("RESOURCE_EXHAUSTED") ||
    errorText.includes("quota");
};

// Returns the visual status class + label for each AI agent card
function agentStatus({ isLoading, result, error }) {
  if (isLoading) return { label: "🔄 Analyzing...", cls: "agent-running" };
  if (error)     return { label: "⚠ Unavailable",  cls: "agent-error" };
  if (result)    return { label: "✓ Completed",     cls: "agent-complete" };
  return           { label: "○ Waiting",             cls: "agent-waiting" };
}

function App() {
  const [profile, setProfile] = useState(() =>
    readStoredJson("edupath-profile")
  );

  const [formData, setFormData] = useState(() => {
    const saved = readStoredJson("edupath-profile");
    return {
      name: saved?.name || "",
      currentRole: saved?.currentRole || "",
      targetRole: saved?.targetRole || "",
      experience: saved?.experience || "",
      availableTime: saved?.availableTime || "1 hour/day",
      learningStyle: saved?.learningStyle || "hands-on",
    };
  });

  const [skills, setSkills] = useState(() => {
    const saved = readStoredJson("edupath-profile");
    const currentProfSkills = Array.isArray(saved?.skills) ? saved.skills : [];
    if (currentProfSkills.length > 0) {
      return currentProfSkills.map((s) =>
        typeof s === "string"
          ? { name: s, currentLevel: 1 }
          : { name: s.name || s.skill || "", currentLevel: Number(s.currentLevel) || 1 }
      );
    }
    return [{ name: "", currentLevel: 1 }];
  });

  const [currentView, setCurrentView] = useState("profile");
  const [message, setMessage] = useState("");

  const [analysis, setAnalysis] = useState(() => {
    const savedProfile = readStoredJson("edupath-profile");
    return readStoredJson(
      savedProfile
        ? `edupath-analysis-${getProfileKey(savedProfile)}`
        : null
    );
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [resourceRecommendations, setResourceRecommendations] = useState(null);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resourceError, setResourceError] = useState("");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const [plan, setPlan] = useState(() => {
    const savedProfile = readStoredJson("edupath-profile");
    return readStoredJson(
      savedProfile ? `edupath-plan-${getProfileKey(savedProfile)}` : null
    );
  });
  const [isPlanning, setIsPlanning] = useState(false);
  const [planError, setPlanError] = useState("");
  const [progressReport, setProgressReport] = useState(() => {
    const savedProfile = readStoredJson("edupath-profile");
    return readStoredJson(
      savedProfile
        ? `edupath-progress-${getProfileKey(savedProfile)}`
        : null
    );
  });
  const [isProgressAnalyzing, setIsProgressAnalyzing] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [adaptation, setAdaptation] = useState(() => {
    const savedProfile = readStoredJson("edupath-profile");
    return readStoredJson(
      savedProfile
        ? `edupath-adaptation-${getProfileKey(savedProfile)}`
        : null
    );
  });
  const [isAdapting, setIsAdapting] = useState(false);
  const [adaptationError, setAdaptationError] = useState("");
  const [adaptationApplied, setAdaptationApplied] = useState(() => {
    const savedProfile = readStoredJson("edupath-profile");
    return readStoredJson(
      savedProfile
        ? `edupath-adaptation-applied-${getProfileKey(savedProfile)}`
        : null,
      false
    );
  });
  const [adaptationConfirmation, setAdaptationConfirmation] = useState(() => {
    const savedProfile = readStoredJson("edupath-profile");
    const wasApplied = readStoredJson(
      savedProfile
        ? `edupath-adaptation-applied-${getProfileKey(savedProfile)}`
        : null,
      false
    );
    return wasApplied
      ? "✅ Your roadmap has been adapted based on your progress."
      : "";
  });
  const [completedTasks, setCompletedTasks] = useState(() => {
    const savedProfile = readStoredJson("edupath-profile");
    const profileKey = getProfileKey(savedProfile);
    return readStoredJson(
      profileKey ? `edupath-completed-tasks-${profileKey}` : null,
      {}
    );
  });

  const handleGoToProfile = () => {
    const currentProf = profile || readStoredJson("edupath-profile");
    if (currentProf) {
      const currentProfSkills = Array.isArray(currentProf.skills) ? currentProf.skills : [];
      setFormData({
        name: currentProf.name || "",
        currentRole: currentProf.currentRole || "",
        targetRole: currentProf.targetRole || "",
        experience: currentProf.experience || "",
        availableTime: currentProf.availableTime || "1 hour/day",
        learningStyle: currentProf.learningStyle || "hands-on",
      });
      setSkills(
        currentProfSkills.length > 0
          ? currentProfSkills.map((s) =>
              typeof s === "string"
                ? { name: s, currentLevel: 1 }
                : { name: s.name || s.skill || "", currentLevel: Number(s.currentLevel) || 1 }
            )
          : [{ name: "", currentLevel: 1 }]
      );
    }
    setCurrentView("profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveAndContinue = async (e) => {
    e.preventDefault();
    const cleanSkills = skills
      .filter((s) => s.name && s.name.trim() !== "")
      .map((s) => ({
        name: s.name.trim(),
        currentLevel: Number(s.currentLevel) || 1,
      }));

    const finalSkills =
      cleanSkills.length > 0
        ? cleanSkills
        : [{ name: "General Programming", currentLevel: 1 }];

    const updatedProfile = {
      ...formData,
      skills: finalSkills,
      _id: profile?._id || "profile-" + Date.now(),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedProfile),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.profile) {
        setProfile(data.profile);
        localStorage.setItem("edupath-profile", JSON.stringify(data.profile));
      } else {
        setProfile(updatedProfile);
        localStorage.setItem("edupath-profile", JSON.stringify(updatedProfile));
      }
    } catch (error) {
      console.error("Save profile fallback:", error);
      setProfile(updatedProfile);
      localStorage.setItem("edupath-profile", JSON.stringify(updatedProfile));
    } finally {
      setMessage("Profile saved successfully! 🎉");
      setCurrentView("dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const requestLocks = useRef({
    analyze: false,
    resources: false,
    assistant: false,
    plan: false,
    progress: false,
    adapt: false,
  });

  const profileKey = getProfileKey(profile);
  const completionStorageKey = profileKey
    ? `edupath-completed-tasks-${profileKey}`
    : null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSkillChange = (index, field, value) => {
    const updatedSkills = [...skills];
    updatedSkills[index] = {
      ...updatedSkills[index],
      [field]: field === "currentLevel" ? Number(value) : value,
    };
    setSkills(updatedSkills);
  };

  const addSkill = () => {
    setSkills([...skills, { name: "", currentLevel: 1 }]);
  };

  const removeSkill = (index) => {
    if (skills.length > 1) {
      setSkills(skills.filter((_, i) => i !== index));
    } else {
      setSkills([{ name: "", currentLevel: 1 }]);
    }
  };

  const handleAnalyze = async () => {
    if (requestLocks.current.analyze) {
      return;
    }

    requestLocks.current.analyze = true;
    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/profiles/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(profile),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          isQuotaError(response, data)
            ? quotaErrorMessage
            : "Failed to analyze skill gaps"
        );
      }

      setAnalysis(data.analysis);
      localStorage.setItem(
        `edupath-analysis-${profileKey}`,
        JSON.stringify(data.analysis)
      );
      setPlan(null);
      setResourceRecommendations(null);
      setResourceError("");
      setAssistantAnswer("");
      setAssistantError("");
      localStorage.removeItem(`edupath-plan-${profileKey}`);
      setResourceRecommendations(null);
      setResourceError("");
      setAssistantAnswer("");
      setAssistantError("");
      setPlanError("");
      setProgressReport(null);
      localStorage.removeItem(`edupath-progress-${profileKey}`);
      setProgressError("");
      setAdaptation(null);
      localStorage.removeItem(`edupath-adaptation-${profileKey}`);
      setAdaptationError("");
      setAdaptationApplied(false);
      localStorage.removeItem(`edupath-adaptation-applied-${profileKey}`);
      setAdaptationConfirmation("");
    } catch (error) {
      console.error(error);
      setAnalysisError(error.message === quotaErrorMessage
        ? quotaErrorMessage
        : "Could not analyze your skill gaps. Please try again.");
    } finally {
      requestLocks.current.analyze = false;
      setIsAnalyzing(false);
    }
  };

  const handleGetResources = async () => {
    if (requestLocks.current.resources) {
      return;
    }

    requestLocks.current.resources = true;
    setIsLoadingResources(true);
    setResourceError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/profiles/resources`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profile,
            analysis,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not load learning resources.");
      }

      setResourceRecommendations(
        Array.isArray(data.recommendations) ? data.recommendations : []
      );
    } catch (error) {
      console.error(error);
      setResourceError("Could not load learning resources. Please try again.");
    } finally {
      requestLocks.current.resources = false;
      setIsLoadingResources(false);
    }
  };

  const handleAskAssistant = async (event) => {
    event.preventDefault();
    const question = assistantQuestion.trim();

    if (requestLocks.current.assistant || isAssistantLoading) {
      return;
    }

    if (!question) {
      setAssistantError("Please enter a question about your EduPath journey.");
      return;
    }

    requestLocks.current.assistant = true;
    setIsAssistantLoading(true);
    setAssistantError("");
    setAssistantAnswer("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/profiles/assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profile,
            analysis,
            plan,
            completedTasks: Object.keys(completedTasks).filter(
              (taskId) => completedTasks[taskId]
            ),
            progressReport,
            adaptation,
            resources: resourceRecommendations || [],
            question,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (isQuotaError(response, data)) {
        throw new Error(assistantQuotaErrorMessage);
      }

      if (!response.ok || typeof data.answer !== "string") {
        throw new Error("The learning assistant could not answer right now.");
      }

      setAssistantAnswer(data.answer);
    } catch (error) {
      console.error(error);
      setAssistantError(
        error.message === assistantQuotaErrorMessage
          ? assistantQuotaErrorMessage
          : "The learning assistant could not answer right now. Please try again."
      );
    } finally {
      requestLocks.current.assistant = false;
      setIsAssistantLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (requestLocks.current.plan) {
      return;
    }

    requestLocks.current.plan = true;
    setIsPlanning(true);
    setPlanError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/profiles/plan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profile,
            analysis,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          isQuotaError(response, data)
            ? quotaErrorMessage
            : "Failed to generate learning plan"
        );
      }

      setPlan(data.plan);
      localStorage.setItem(
        `edupath-plan-${profileKey}`,
        JSON.stringify(data.plan)
      );
      setProgressReport(null);
      localStorage.removeItem(`edupath-progress-${profileKey}`);
      setProgressError("");
      setAdaptation(null);
      localStorage.removeItem(`edupath-adaptation-${profileKey}`);
      setAdaptationError("");
      setAdaptationApplied(false);
      localStorage.removeItem(`edupath-adaptation-applied-${profileKey}`);
      setAdaptationConfirmation("");
    } catch (error) {
      console.error(error);
      setPlanError(error.message === quotaErrorMessage
        ? quotaErrorMessage
        : "Could not build your learning roadmap. Please try again.");
    } finally {
      requestLocks.current.plan = false;
      setIsPlanning(false);
    }
  };

  const getTaskId = (weekIndex, taskIndex) =>
    `week-${weekIndex + 1}-task-${taskIndex + 1}`;

  const toggleTaskCompletion = (taskId) => {
    setProgressReport(null);
    localStorage.removeItem(`edupath-progress-${profileKey}`);
    setProgressError("");
    setAdaptation(null);
    localStorage.removeItem(`edupath-adaptation-${profileKey}`);
    setAdaptationApplied(false);
    localStorage.removeItem(`edupath-adaptation-applied-${profileKey}`);
    setAdaptationConfirmation("");
    setCompletedTasks((currentTasks) => {
      const updatedTasks = {
        ...currentTasks,
        [taskId]: !currentTasks[taskId],
      };

      if (completionStorageKey) {
        localStorage.setItem(
          completionStorageKey,
          JSON.stringify(updatedTasks)
        );
      }

      return updatedTasks;
    });
  };

  const handleAnalyzeProgress = async () => {
    if (requestLocks.current.progress) {
      return;
    }

    requestLocks.current.progress = true;
    setIsProgressAnalyzing(true);
    setProgressError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/profiles/progress`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profile,
            analysis,
            plan,
            completedTasks: Object.keys(completedTasks).filter(
              (taskId) => completedTasks[taskId]
            ),
            progressPercentage: completionPercentage,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (isQuotaError(response, data)) {
        throw new Error(quotaErrorMessage);
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze progress");
      }

      setProgressReport(data.progress);
      localStorage.setItem(
        `edupath-progress-${profileKey}`,
        JSON.stringify(data.progress)
      );
      setAdaptation(null);
      localStorage.removeItem(`edupath-adaptation-${profileKey}`);
      setAdaptationError("");
      setAdaptationApplied(false);
      localStorage.removeItem(`edupath-adaptation-applied-${profileKey}`);
      setAdaptationConfirmation("");
    } catch (error) {
      console.error(error);
      setProgressError(
        error.message === quotaErrorMessage
          ? quotaErrorMessage
          : "Could not analyze your progress. Please try again."
      );
    } finally {
      requestLocks.current.progress = false;
      setIsProgressAnalyzing(false);
    }
  };

  const handleAdaptRoadmap = async () => {
    if (requestLocks.current.adapt) {
      return;
    }

    requestLocks.current.adapt = true;
    setIsAdapting(true);
    setAdaptationError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/profiles/adapt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profile,
            plan,
            progressReport,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (isQuotaError(response, data)) {
        throw new Error(quotaErrorMessage);
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to adapt the learning roadmap");
      }

      setAdaptation(data.adaptation);
      localStorage.setItem(
        `edupath-adaptation-${profileKey}`,
        JSON.stringify(data.adaptation)
      );
      setAdaptationApplied(false);
      localStorage.removeItem(`edupath-adaptation-applied-${profileKey}`);
      setAdaptationConfirmation("");
    } catch (error) {
      console.error(error);
      setAdaptationError(error.message);
    } finally {
      requestLocks.current.adapt = false;
      setIsAdapting(false);
    }
  };

  const applyAdaptation = () => {
    if (!adaptation?.adapted || adaptationApplied) {
      return;
    }

    const upcomingTasks = adaptation.updatedUpcomingTasks || [];
    const uncompletedSlots = [];
    const replacements = new Map();
    const usedSlots = new Set();
    const appendedTasks = [];

    plan.weeks.forEach((week, weekIndex) => {
      week.tasks.forEach((task, taskIndex) => {
        const taskId = getTaskId(weekIndex, taskIndex);

        if (!completedTasks[taskId]) {
          uncompletedSlots.push({
            taskId,
            weekIndex,
            taskIndex,
            context: [
              week.focus,
              ...(week.objectives || []),
              week.project?.title,
              week.project?.description,
              task.title,
              task.description,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase(),
          });
        }
      });
    });

    upcomingTasks.forEach((task, taskIndex) => {
      const change = adaptation.changes?.[taskIndex];
      const skill = change?.skill?.toLowerCase().replace(/\.js\b/g, "") || "";
      const matchingSlot = uncompletedSlots.find((slot) =>
        !usedSlots.has(slot.taskId) && skill && slot.context.includes(skill)
      );

      if (matchingSlot) {
        replacements.set(matchingSlot.taskId, task);
        usedSlots.add(matchingSlot.taskId);
      } else {
        appendedTasks.push(task);
      }
    });

    const updatedWeeks = plan.weeks.map((week, weekIndex) => ({
      ...week,
      tasks: week.tasks.map((task, taskIndex) => {
        const taskId = getTaskId(weekIndex, taskIndex);
        return replacements.get(taskId) || task;
      }),
    }));

    if (appendedTasks.length > 0 && updatedWeeks.length > 0) {
      const lastWeekIndex = updatedWeeks.length - 1;
      updatedWeeks[lastWeekIndex].tasks = [
        ...updatedWeeks[lastWeekIndex].tasks,
        ...appendedTasks,
      ];
    }

    setPlan((currentPlan) => ({
      ...currentPlan,
      weeks: updatedWeeks,
    }));
    localStorage.setItem(
      `edupath-plan-${profileKey}`,
      JSON.stringify({ ...plan, weeks: updatedWeeks })
    );
    setAdaptationApplied(true);
    localStorage.setItem(
      `edupath-adaptation-applied-${profileKey}`,
      JSON.stringify(true)
    );
    setAdaptationConfirmation(
      "✅ Your roadmap has been adapted based on your progress."
    );
  };

  const profileSkills = Array.isArray(profile?.skills) ? profile.skills : [];
  const analysisGaps = Array.isArray(analysis?.gaps) ? analysis.gaps : [];
  const planWeeks = Array.isArray(plan?.weeks) ? plan.weeks : [];
  const reportAdaptation = progressReport?.adaptation || {};
  const totalTasks = planWeeks.length
    ? planWeeks.reduce(
        (total, week) => total + (Array.isArray(week.tasks) ? week.tasks.length : 0),
        0
      )
    : 0;
  const completedTaskCount = planWeeks.length
    ? planWeeks.reduce(
        (total, week, weekIndex) =>
          total +
          (Array.isArray(week.tasks) ? week.tasks : []).filter(
            (_, taskIndex) => completedTasks[getTaskId(weekIndex, taskIndex)]
          ).length,
        0
      )
    : 0;
  const completionPercentage = totalTasks
    ? Math.round((completedTaskCount / totalTasks) * 100)
    : 0;
  const remainingTaskCount = Math.max(totalTasks - completedTaskCount, 0);
  const progressStatusLabel = completionPercentage === 100
    ? "All caught up ✨"
    : completionPercentage >= 50
      ? "Keep going 🚀"
      : "Start small, build momentum";

  // Agent status derivations — drive the agent cards in real time
  const skillGapSt  = agentStatus({ isLoading: isAnalyzing,        result: analysis,       error: analysisError });
  const plannerSt   = agentStatus({ isLoading: isPlanning,          result: plan,           error: planError });
  const progressSt  = agentStatus({ isLoading: isProgressAnalyzing, result: progressReport, error: progressError });
  const adaptiveSt  = agentStatus({ isLoading: isAdapting,          result: adaptation,     error: adaptationError });

  // ---------------- VIEW 1: DEDICATED LEARNER PROFILE PAGE ----------------
  if (currentView === "profile") {
    return (
      <main className="profile-page-shell">
        <header className="profile-page-header">
          <div className="profile-header-content">
            <p className="eyebrow">EDUPATH / LEARNER SETUP</p>
            <h1>👤 Your Learner Profile</h1>
            <p className="hero-tagline">
              Tell EduPath about your current skills, goals, and learning preferences.
            </p>
          </div>
          {profile && profile.name && (
            <button
              type="button"
              className="voice-stop-btn"
              onClick={() => setCurrentView("dashboard")}
              style={{ fontSize: "14px", padding: "10px 18px", fontWeight: "600" }}
            >
              Go to Dashboard →
            </button>
          )}
        </header>

        <article className="surface-card profile-card-full">
          <form className="setup-form" onSubmit={handleSaveAndContinue}>
            <div className="profile-edit-grid">
              <div>
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Alex Johnson"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>Current Role</label>
                <input
                  type="text"
                  name="currentRole"
                  placeholder="e.g. Junior Web Developer"
                  value={formData.currentRole}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Target Role *</label>
                <input
                  type="text"
                  name="targetRole"
                  placeholder="e.g. Full-Stack Engineer"
                  value={formData.targetRole}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>Experience</label>
                <input
                  type="text"
                  name="experience"
                  placeholder="e.g. 1 year building React apps"
                  value={formData.experience}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Available Time</label>
                <select
                  name="availableTime"
                  value={formData.availableTime}
                  onChange={handleChange}
                >
                  <option>30 minutes/day</option>
                  <option>1 hour/day</option>
                  <option>2 hours/day</option>
                  <option>3+ hours/day</option>
                </select>
              </div>
              <div>
                <label>Learning Style</label>
                <select
                  name="learningStyle"
                  value={formData.learningStyle}
                  onChange={handleChange}
                >
                  <option value="hands-on">Hands-on (Projects & Code)</option>
                  <option value="visual">Visual (Videos & Diagrams)</option>
                  <option value="reading">Reading (Docs & Articles)</option>
                  <option value="mixed">Mixed (Balanced)</option>
                </select>
              </div>
            </div>

            <div className="profile-skills-section">
              <div className="section-heading" style={{ marginTop: "16px", marginBottom: "16px" }}>
                <span className="section-icon">◈</span>
                <div>
                  <h3 style={{ margin: 0, color: "var(--edupath-ink)", fontFamily: "var(--font-heading)" }}>Your Current Skills & Levels</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--edupath-subtext)" }}>
                    List the technologies or concepts you know and rate your level from 1 (Beginner) to 5 (Advanced).
                  </p>
                </div>
              </div>

              {skills.map((skill, index) => (
                <div key={index} className="skill-edit-row">
                  <input
                    type="text"
                    placeholder="Skill name (e.g. React, JavaScript, Node.js)"
                    value={skill.name}
                    onChange={(e) => handleSkillChange(index, "name", e.target.value)}
                  />
                  <select
                    value={skill.currentLevel}
                    onChange={(e) => handleSkillChange(index, "currentLevel", e.target.value)}
                  >
                    <option value="1">1 - Beginner</option>
                    <option value="2">2 - Basic</option>
                    <option value="3">3 - Intermediate</option>
                    <option value="4">4 - Proficient</option>
                    <option value="5">5 - Advanced</option>
                  </select>
                  {skills.length > 1 && (
                    <button
                      type="button"
                      className="voice-stop-btn"
                      style={{ padding: "6px 10px", fontSize: "12px" }}
                      onClick={() => removeSkill(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <div style={{ marginTop: "12px" }}>
                <button type="button" onClick={addSkill} className="voice-stop-btn" style={{ fontSize: "13px", padding: "8px 16px" }}>
                  + Add Skill
                </button>
              </div>
            </div>

            <div className="profile-form-footer" style={{ marginTop: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--edupath-line)", paddingTop: "24px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--edupath-subtext)" }}>
                {message ? message : "Click Save & Continue when ready to view your personalized dashboard."}
              </p>
              <button type="submit" className="primary-button" style={{ fontSize: "16px", padding: "12px 28px" }}>
                Save & Continue →
              </button>
            </div>
          </form>
        </article>
      </main>
    );
  }

  // ---------------- VIEW 2: EDUPATH DASHBOARD ----------------

  return (
    <main className="dashboard-shell">
      {/* ── HERO ── */}
      <header className="hero-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div>
            <p className="eyebrow">EDUPATH / PERSONAL LEARNING OS</p>
            <h1>EduPath</h1>
            <p className="hero-tagline">Your AI-powered personalized learning journey</p>
            <p className="hero-welcome">Welcome back, {profile?.name || "learner"}. Your next chapter is ready.</p>
          </div>
          <button
            type="button"
            className="voice-stop-btn"
            onClick={handleGoToProfile}
            style={{ fontSize: "14px", padding: "10px 18px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}
          >
            👤 Profile
          </button>
        </div>
        <div className="hero-goal" style={{ marginTop: "16px" }}>
          <span>🎯 Target role</span>
          <strong>{profile?.targetRole || "Your target role"}</strong>
          <small>Your roadmap adapts as you learn.</small>
        </div>
      </header>

      <section className="dashboard-grid">
        <article className="surface-card profile-card">
          <div className="section-heading" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="section-icon">👤</span>
              <div>
                <p className="eyebrow">YOUR CONTEXT</p>
                <h2>Learner profile</h2>
              </div>
            </div>
            <button
              type="button"
              className="voice-stop-btn"
              onClick={handleGoToProfile}
              style={{ fontSize: "13px", padding: "6px 14px" }}
            >
              👤 Profile
            </button>
          </div>
          <div className="profile-facts">
            <div><span>Current role</span><strong>{profile?.currentRole || "Not specified"}</strong></div>
            <div><span>Experience</span><strong>{profile?.experience || "Not specified"}</strong></div>
            <div><span>Available time</span><strong>{profile?.availableTime || "1 hour/day"}</strong></div>
            <div><span>Learning style</span><strong>{profile?.learningStyle || "hands-on"}</strong></div>
          </div>
        </article>

        <article className="surface-card skills-card">
          <div className="section-heading">
            <span className="section-icon">◈</span>
            <div>
              <p className="eyebrow">CURRENT SNAPSHOT</p>
              <h2>Your skills</h2>
            </div>
          </div>
          <div className="skills-list">
            {profileSkills.map((skill, index) => (
              <div className="skill-row" key={index}>
                <div className="skill-row-heading">
                  <strong>{typeof skill === "string" ? skill : skill.name}</strong>
                  <span>Level {typeof skill === "string" ? 1 : skill.currentLevel || 1}/5</span>
                </div>
                <div className="skill-progress-track">
                  <span style={{ width: `${((typeof skill === "string" ? 1 : skill.currentLevel || 1) / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="agents-section">
        <div className="agents-section-header">
          <div>
            <p className="eyebrow">THE EDUPATH SYSTEM</p>
            <h2>🤖 EduPath AI Agents</h2>
            <p>Four AI agents work in a closed loop — analyzing your profile, building a roadmap, evaluating progress, and adapting tasks.</p>
          </div>
          <button className={`primary-button ${isAnalyzing ? "loading-button" : ""}`} onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? "🧠 Analyzing your skills..." : "✨ Analyze My Skill Gaps"}
          </button>
        </div>

        {/* Agentic loop banner */}
        <div className="agent-loop" aria-label="EduPath agentic loop">
          {["OBSERVE", "REASON", "PLAN", "ACT", "EVALUATE", "ADAPT"].map((step, i, arr) => (
            <span key={step} className="agent-loop-item">
              <span className="agent-loop-step">{step}</span>
              {i < arr.length - 1 && <span className="agent-loop-arrow">→</span>}
            </span>
          ))}
        </div>

        {/* Agent flow cards */}
        <div className="agent-flow" aria-label="EduPath learning agent workflow">
          <article className={`agent-card ${profile ? "agent-complete" : "agent-waiting"}`}>
            <span className="agent-card-icon">👤</span>
            <div>
              <p className="agent-step">01 / INPUT</p>
              <h3>Learner Profile</h3>
              <p>Your context, skills, goals, and available time per day.</p>
            </div>
            <span className="agent-status">{profile ? "✓ Completed" : "○ Waiting"}</span>
          </article>
          <span className="agent-connector">→</span>

          <article className={`agent-card ${skillGapSt.cls}`}>
            <span className="agent-card-icon">🧠</span>
            <div>
              <p className="agent-step">02 / ANALYZE</p>
              <h3>Skill Gap Agent</h3>
              <p>Identifies your highest-priority skill gaps for your target role.</p>
            </div>
            <span className="agent-status">{skillGapSt.label}</span>
          </article>
          <span className="agent-connector">→</span>

          <article className={`agent-card ${plannerSt.cls}`}>
            <span className="agent-card-icon">📚</span>
            <div>
              <p className="agent-step">03 / PLAN</p>
              <h3>Learning Planner Agent</h3>
              <p>Turns skill gaps into a personalized weekly learning roadmap.</p>
            </div>
            <span className="agent-status">{plannerSt.label}</span>
          </article>
          <span className="agent-connector">→</span>

          <article className={`agent-card ${plan ? "agent-complete" : "agent-waiting"}`}>
            <span className="agent-card-icon">☑️</span>
            <div>
              <p className="agent-step">04 / PRACTICE</p>
              <h3>Task Tracking</h3>
              <p>Mark tasks complete to drive the Progress and Adaptive agents.</p>
            </div>
            <span className="agent-status">{plan ? "✓ Active" : "○ Waiting"}</span>
          </article>
          <span className="agent-connector">→</span>

          <article className={`agent-card ${progressSt.cls}`}>
            <span className="agent-card-icon">📊</span>
            <div>
              <p className="agent-step">05 / EVALUATE</p>
              <h3>Progress Agent</h3>
              <p>Evaluates completed work and identifies areas needing attention.</p>
            </div>
            <span className="agent-status">{progressSt.label}</span>
          </article>
          <span className="agent-connector">→</span>

          <article className={`agent-card ${adaptiveSt.cls}`}>
            <span className="agent-card-icon">🔄</span>
            <div>
              <p className="agent-step">06 / ADAPT</p>
              <h3>Adaptive Agent</h3>
              <p>Adjusts upcoming tasks based on progress to keep your roadmap relevant.</p>
            </div>
            <span className="agent-status">{adaptiveSt.label}</span>
          </article>
        </div>
      </section>

      {analysisError && (
        <div className="error-card">
          <strong>⚠️ Skill Gap Agent</strong>
          <p>{analysisError}</p>
        </div>
      )}

      <section className={`analysis-results ${analysis ? "" : "empty-state"}`}>
        {analysis ? (
          <>
          <div className="section-heading">
            <span className="section-icon">↗</span>
            <div>
              <p className="eyebrow">🧠 SKILL GAP AGENT — AI DIAGNOSTIC</p>
              <h2>Skill gap analysis</h2>
            </div>
              <span className="status-pill">{analysis.targetRole || "Target role"}</span>
          </div>
            <p className="section-summary">{analysis.summary || "Your skill gaps are ready to review."}</p>

          <div className="gap-list">
            {analysisGaps.length > 0 ? analysisGaps.map((gap) => (
              <article className="gap-card" key={gap.skill}>
                <div className="gap-card-top">
                  <h3>{gap.skill || "Skill gap"}</h3>
                  <span className={`priority-pill priority-${gap.priority || "unknown"}`}>{gap.priority || "Priority unavailable"}</span>
                </div>
                <div className="gap-metrics">
                  <span>Current <strong>{gap.currentLevel ?? "—"}/5</strong></span>
                  <span>Target <strong>{gap.requiredLevel ?? "—"}/5</strong></span>
                  <span>Gap <strong>{gap.gap ?? "—"}</strong></span>
                </div>
                <p className="gap-reason">{gap.reason || "No additional context was provided."}</p>
              </article>
            )) : <p className="empty-state-copy">No skill gaps were returned yet.</p>}
          </div>

          <button className={`primary-button ${isPlanning ? "loading-button" : ""}`} onClick={handleGeneratePlan} disabled={isPlanning}>
            {isPlanning
              ? "📚 Building your roadmap..."
              : "📚 Generate My Learning Roadmap"}
          </button>

          {planError && <div className="error-card"><strong>⚠️ Learning Planner Agent</strong><p>{planError}</p></div>}
          </>
        ) : (
          <>
            <div className="section-heading">
              <span className="section-icon">↗</span>
              <div><p className="eyebrow">🧠 SKILL GAP AGENT</p><h2>Skill Gap Analysis</h2></div>
            </div>
            <p>Click <strong>✨ Analyze My Skill Gaps</strong> above to discover which skills you need to strengthen for your target role.</p>
          </>
        )}
      </section>

      {/* RAG resources and assistant moved to AFTER the roadmap section — see below */}

      <section className={`roadmap-results ${plan ? "" : "empty-state"}`}>
        {plan ? (
          <>
          <div className="section-heading roadmap-heading">
            <span className="section-icon">▦</span>
            <div>
              <p className="eyebrow">📚 LEARNING PLANNER AGENT — YOUR PERSONALIZED PLAN</p>
              <h2>Learning roadmap</h2>
            </div>
          </div>
          <div className="roadmap-overview">
            <div><span>Target role</span><strong>{plan.targetRole || "Target role unavailable"}</strong></div>
            <div><span>Duration</span><strong>{plan.duration || "Not specified"}</strong></div>
            <div><span>Weekly commitment</span><strong>{plan.weeklyHours || "Not specified"}</strong></div>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <div>
                <p className="eyebrow">ROADMAP MOMENTUM</p>
                <h3>📈 Overall Progress</h3>
                <p className="progress-status">{progressStatusLabel}</p>
              </div>
              <strong className="progress-percentage">{completionPercentage}%</strong>
            </div>
            <p className="progress-count">
              {completedTaskCount} / {totalTasks} tasks completed
            </p>
            <progress value={completionPercentage} max="100">
              {completionPercentage}%
            </progress>
            <div className="progress-statistics">
              <div><span>Completed</span><strong>{completedTaskCount}</strong></div>
              <div><span>Remaining</span><strong>{remainingTaskCount}</strong></div>
              <div><span>Completion</span><strong>{completionPercentage}%</strong></div>
            </div>
            <button
              type="button"
              className={isProgressAnalyzing ? "loading-button" : ""}
              onClick={handleAnalyzeProgress}
              disabled={isProgressAnalyzing}
            >
              {isProgressAnalyzing
                ? "📊 Evaluating your progress..."
                : "📊 Analyze My Progress"}
            </button>
            {progressError && <div className="error-card"><strong>⚠️ Progress Agent</strong><p>{progressError}</p></div>}
          </div>

          {progressReport ? (
            <section className="progress-report">
              <div className="progress-report-nav">
                <button
                  type="button"
                  className="back-nav-button"
                  onClick={handleGoToProfile}
                  aria-label="Back to Profile"
                >
                  ← Back to Profile
                </button>
              </div>

              <h2>📊 Progress Agent Report</h2>

              <div className="progress-report-overview">
                <p><strong>Overall status:</strong> {progressReport.overallStatus || "Status unavailable"}</p>
                <p><strong>Progress:</strong> {progressReport.progressPercentage ?? completionPercentage}%</p>
              </div>

              <h3>📝 Summary</h3>
              <p>{progressReport.summary || "No progress summary was returned."}</p>

              <h3>✅ Completed Areas</h3>
              {(Array.isArray(progressReport.completedAreas) ? progressReport.completedAreas : []).length > 0 ? (
                <ul>
                  {(Array.isArray(progressReport.completedAreas) ? progressReport.completedAreas : []).map((area, index) => (
                    <li key={index}>{area}</li>
                  ))}
                </ul>
              ) : (
                <p>No completed areas reported yet.</p>
              )}

              <h3>⚠️ Areas Needing Attention</h3>
              {(Array.isArray(progressReport.strugglingAreas) ? progressReport.strugglingAreas : []).length > 0 ? (
                <div className="progress-report-list">
                  {(Array.isArray(progressReport.strugglingAreas) ? progressReport.strugglingAreas : []).map((area, index) => (
                    <article className="progress-report-card" key={index}>
                      <h4>{area.skill || "Area needing attention"}</h4>
                      <p>{area.reason || "No reason was provided."}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No areas needing attention reported.</p>
              )}

              <h3>💡 Recommendations</h3>
              {(Array.isArray(progressReport.recommendations) ? progressReport.recommendations : []).length > 0 ? (
                <div className="progress-report-list">
                  {(Array.isArray(progressReport.recommendations) ? progressReport.recommendations : []).map((recommendation, index) => (
                    <article className="progress-report-card" key={index}>
                      <h4>{recommendation.title || "Recommendation"}</h4>
                      <p>{recommendation.description || "No description was provided."}</p>
                      <p><strong>Type:</strong> {recommendation.type || "Not specified"}</p>
                      <p><strong>Estimated time:</strong> {recommendation.estimatedTime || "Not specified"}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No additional recommendations reported.</p>
              )}

              <h3>🔄 Roadmap Adaptation</h3>
              <p>
                <strong>Should adapt:</strong>{" "}
                {reportAdaptation.shouldAdapt ? "Yes" : "No"}
              </p>
              <p><strong>Reason:</strong> {reportAdaptation.reason || "No adaptation reason provided."}</p>
              <p>
                <strong>Suggested action:</strong>{" "}
                {reportAdaptation.suggestedAction || "No suggested action provided."}
              </p>

              <button
                type="button"
                className={isAdapting ? "loading-button" : ""}
                onClick={handleAdaptRoadmap}
                disabled={isAdapting}
              >
                {isAdapting
                  ? "🔄 Adapting your roadmap..."
                  : "🔄 Adapt My Roadmap"}
              </button>
              {adaptationError && <div className="error-card"><strong>⚠️ Adaptive Agent</strong><p>{adaptationError}</p></div>}

            </section>
          ) : (
            <section className="progress-report empty-state">
              <h2>📊 AI Progress Report</h2>
              <p>Complete some learning tasks and analyze your progress to receive AI feedback.</p>
            </section>
          )}

          {adaptationConfirmation && (
            <p className="adaptation-confirmation">
              {adaptationConfirmation}
            </p>
          )}

          {adaptation ? (
            <section className="adaptation-results">
              <h2>🔄 Adaptive Agent — Roadmap Adaptation</h2>
              <p>
                <strong>Roadmap adapted:</strong>{" "}
                {adaptation.adapted ? "Yes" : "No"}
              </p>
              <p><strong>Reason:</strong> {adaptation.reason || "No adaptation reason was provided."}</p>

              {adaptation.adapted && (Array.isArray(adaptation.changes) ? adaptation.changes : []).length > 0 && (
                <>
                  <h3>Changes</h3>
                  <div className="adaptation-list">
                    {(Array.isArray(adaptation.changes) ? adaptation.changes : []).map((change, index) => (
                      <article className="adaptation-card" key={index}>
                        <h4>{change.type || "Change"}</h4>
                        <p><strong>Skill:</strong> {change.skill || "Skill not specified"}</p>
                        <p>{change.description || "No change description was provided."}</p>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {adaptation.adapted && (Array.isArray(adaptation.updatedUpcomingTasks) ? adaptation.updatedUpcomingTasks : []).length > 0 && (
                <>
                  <h3>Updated Upcoming Tasks</h3>
                  <div className="adaptation-list">
                    {(Array.isArray(adaptation.updatedUpcomingTasks) ? adaptation.updatedUpcomingTasks : []).map((task, index) => (
                      <article className="adaptation-card" key={index}>
                        <h4>{task.title || "Upcoming task"}</h4>
                        <p>{task.description || "No task description was provided."}</p>
                        <p><strong>Type:</strong> {task.type || "Not specified"}</p>
                        <p><strong>Estimated time:</strong> {task.estimatedTime || "Not specified"}</p>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {adaptation.adapted && (
                <button
                  type="button"
                  onClick={applyAdaptation}
                  disabled={adaptationApplied}
                >
                  {adaptationApplied
                    ? "Adaptation Applied ✓"
                    : "✅ Apply Adaptation"}
                </button>
              )}
            </section>
          ) : (
            <section className="adaptation-results empty-state">
              <h2>🔄 Adaptive Agent</h2>
              <p>After the Progress Agent evaluates your work, the Adaptive Agent can modify upcoming tasks to match your actual learning pace.</p>
            </section>
          )}

          <div className="week-list">
            {planWeeks.map((week, weekIndex) => {
              const weekTasks = Array.isArray(week.tasks) ? week.tasks : [];
              const weekObjectives = Array.isArray(week.objectives) ? week.objectives : [];
              const weekProject = week.project || {};
              const completedWeekTasks = weekTasks.filter(
                (_, taskIndex) => completedTasks[getTaskId(weekIndex, taskIndex)]
              ).length;
              const weekProgressPercentage = weekTasks.length
                ? Math.round((completedWeekTasks / weekTasks.length) * 100)
                : 0;

              return (
              <article className="week-card" key={week.week}>
                <div className="week-card-header">
                  <div>
                    <p className="eyebrow">WEEK {week.week}</p>
                    <h3>{week.focus || "Upcoming focus"}</h3>
                  </div>
                  <strong className="week-progress-label">
                    {completedWeekTasks}/{weekTasks.length}
                  </strong>
                </div>
                <div className="week-progress-summary">
                  <span>Progress</span>
                  <strong>{weekProgressPercentage}%</strong>
                </div>
                <progress className="week-progress-bar" value={weekProgressPercentage} max="100">
                  {weekProgressPercentage}%
                </progress>

                <h4>🎯 Objectives</h4>
                <ul>
                  {weekObjectives.length > 0 ? weekObjectives.map((objective, index) => (
                    <li key={index}>{objective || "Objective not specified"}</li>
                  )) : (
                    <li>No objectives were provided for this week.</li>
                  )}
                </ul>

                <h4>📋 Tasks</h4>
                <div className="task-list">
                  {weekTasks.map((task, taskIndex) => {
                    const taskId = getTaskId(weekIndex, taskIndex);
                    const isCompleted = Boolean(completedTasks[taskId]);

                    return (
                    <div className={`task-card${isCompleted ? " task-completed" : ""}`} key={taskId}>
                      <h5>{task.title || "Learning task"}</h5>
                      <p>{task.description || "No task description was provided."}</p>
                      <p><strong>Type:</strong> {task.type || "Not specified"}</p>
                      <p><strong>Estimated time:</strong> {task.estimatedTime || "Not specified"}</p>
                      <button
                        type="button"
                        className="task-completion-button"
                        onClick={() => toggleTaskCompletion(taskId)}
                      >
                        {isCompleted ? "☑️ Completed" : "☐ Mark Complete"}
                      </button>
                    </div>
                    );
                  })}
                </div>

                <div className="week-project">
                  <h4>🚀 Week Project</h4>
                  <h5>{weekProject.title || "Week project"}</h5>
                  <p>{weekProject.description || "No project description was provided."}</p>
                </div>
              </article>
              );
            })}
          </div>
          </>
        ) : (
          <>
            <div className="section-heading">
              <span className="section-icon">▦</span>
              <div><p className="eyebrow">📚 LEARNING PLANNER AGENT</p><h2>Your Personalized Learning Roadmap</h2></div>
            </div>
            <p>Run the Skill Gap Agent first, then generate your personalized roadmap.</p>
          </>
        )}
      </section>

      {/* ── RAG RESOURCES (after roadmap) ── */}
      {analysis && (
        <section className="resources-results">
          <div className="section-heading">
            <span className="section-icon">▤</span>
            <div>
              <p className="eyebrow">RETRIEVAL-AUGMENTED LEARNING</p>
              <h2>📚 Recommended Learning Resources</h2>
            </div>
          </div>
          <p className="section-summary">
            Curated resources retrieved for each skill gap, personalized by AI for your learning style.{" "}
            <em>If AI personalization is temporarily unavailable, retrieved resources are shown directly.</em>
          </p>
          <button
            className={isLoadingResources ? "loading-button" : ""}
            type="button"
            onClick={handleGetResources}
            disabled={isLoadingResources}
          >
            {isLoadingResources ? "📚 Finding learning resources..." : "📚 Get Learning Resources"}
          </button>
          {resourceError && (
            <div className="error-card">
              <strong>⚠️ Something went wrong</strong>
              <p>{resourceError}</p>
            </div>
          )}
          {resourceRecommendations && resourceRecommendations.length === 0 && (
            <p className="empty-state-copy">No matching learning resources were found for the current skill gaps.</p>
          )}
          {Array.isArray(resourceRecommendations) && resourceRecommendations.length > 0 && (
            <div className="resource-recommendation-list">
              {resourceRecommendations.map((rec, index) => (
                <article className="resource-group" key={`${rec.skill || "skill"}-${index}`}>
                  <div className="resource-group-heading">
                    <h3>{rec.skill || "Skill gap"}</h3>
                    <span className={`priority-pill priority-${rec.priority || "medium"}`}>
                      {rec.priority || "medium"} priority
                    </span>
                  </div>
                  {Array.isArray(rec.resources) && rec.resources.length > 0 ? (
                    <div className="resource-list">
                      {rec.resources.map((resource, ri) => (
                        <article className="resource-card" key={`${resource.title || "resource"}-${ri}`}>
                          <div>
                            <h4>{resource.title || "Learning resource"}</h4>
                            <p>{resource.reason || resource.description || "Recommended for this skill gap."}</p>
                            <span className="resource-type">{resource.type || "resource"}</span>
                          </div>
                          {resource.url && (
                            <a href={resource.url} target="_blank" rel="noreferrer">
                              Open resource ↗
                            </a>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state-copy">No resources were selected for this skill.</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── LEARNING ASSISTANT (last section) ── */}
      {profile && (
        <section className="assistant-results">
          <div className="section-heading">
            <span className="section-icon">💬</span>
            <div>
              <p className="eyebrow">CONTEXT-AWARE COACHING</p>
              <h2>💬 Ask Your Learning Assistant</h2>
            </div>
          </div>
          <p className="section-summary">
            Ask questions about your skills, roadmap, progress, and next steps. The assistant uses your full EduPath context.
          </p>

          <div className="assistant-chips" aria-label="Example assistant questions">
            {["What should I learn next?", "Why is this skill important?", "What am I struggling with?", "Why did my roadmap change?"].map((question) => (
              <button
                type="button"
                className="assistant-chip"
                key={question}
                onClick={() => setAssistantQuestion(question)}
              >
                {question}
              </button>
            ))}
          </div>

          <form className="assistant-form" onSubmit={handleAskAssistant}>
            <textarea
              value={assistantQuestion}
              onChange={(event) => setAssistantQuestion(event.target.value)}
              placeholder="Ask a question about your EduPath journey..."
              rows="3"
              aria-label="Learning Assistant question"
            />
            <button
              type="submit"
              className={isAssistantLoading ? "loading-button" : ""}
              disabled={isAssistantLoading}
            >
              {isAssistantLoading ? "💬 Asking EduPath..." : "Ask EduPath"}
            </button>
          </form>

          {assistantError && (
            <div className="error-card">
              <strong>⚠️ Learning Assistant</strong>
              <p>{assistantError}</p>
            </div>
          )}

          {assistantAnswer && (
            <div className="assistant-answer">
              <p className="eyebrow">EDUPATH ANSWER</p>
              <p>{assistantAnswer}</p>
            </div>
          )}

          {/* 🎙️ Voice Learning Assistant */}
          <VoiceAssistant
            profile={profile}
            analysis={analysis}
            plan={plan}
            completedTasks={completedTasks}
            progressReport={progressReport}
            adaptation={adaptation}
            resourceRecommendations={resourceRecommendations}
          />
        </section>
      )}
    </main>
  );
}

export default App;