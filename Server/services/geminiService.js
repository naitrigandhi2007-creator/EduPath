const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ── Fallback Heuristic Generators (Used when Gemini quota/rate limits are reached) ──

function getFallbackSkillGaps(profile) {
  const role = profile?.targetRole || "Software Developer";
  const userSkillsList = profile?.currentSkills || profile?.skills || [];
  const existingSkills = userSkillsList.map((s) =>
    typeof s === "string" ? s.toLowerCase() : (s.skill || s.name || "").toLowerCase()
  );

  const roleSkillMap = {
    mern: [
      { skill: "Node.js & Express Architecture", req: 4, priority: "high", reason: "Essential for building backend REST APIs in MERN." },
      { skill: "MongoDB Schema Design & Mongoose", req: 4, priority: "high", reason: "Required for data modeling and query optimization." },
      { skill: "React State Management & Hooks", req: 4, priority: "medium", reason: "Crucial for frontend state synchronization." },
      { skill: "JWT Authentication & Security", req: 3, priority: "medium", reason: "Necessary for user authorization and route protection." },
    ],
    "full stack": [
      { skill: "Backend API Integration", req: 4, priority: "high", reason: "Core requirement for connecting frontend and backend systems." },
      { skill: "Database Optimization", req: 4, priority: "high", reason: "Key for persistent storage performance." },
      { skill: "System Architecture", req: 3, priority: "medium", reason: "Helpful for scalable full-stack application design." },
    ],
    "ai engineer": [
      { skill: "LLM Fine-Tuning & Prompt Engineering", req: 5, priority: "high", reason: "Core skill for building AI agentic workflows." },
      { skill: "Vector Databases & RAG Pipelines", req: 4, priority: "high", reason: "Essential for contextual retrieval systems." },
      { skill: "Python & LangChain Frameworks", req: 4, priority: "medium", reason: "Industry standard tools for AI agent orchestration." },
    ],
  };

  const matchedKey = Object.keys(roleSkillMap).find((k) => role.toLowerCase().includes(k)) || "mern";
  const targetTemplate = roleSkillMap[matchedKey];

  const gaps = targetTemplate
    .filter((item) => !existingSkills.some((sk) => sk.includes(item.skill.toLowerCase().split(" ")[0])))
    .map((item) => ({
      skill: item.skill,
      currentLevel: 1,
      requiredLevel: item.req,
      gap: item.req - 1,
      priority: item.priority,
      reason: item.reason,
    }));

  return {
    targetRole: role,
    summary: `Skill gap evaluation generated via EduPath offline learning matrix for target role: ${role}.`,
    gaps: gaps.length > 0 ? gaps : targetTemplate.map((item) => ({
      skill: item.skill,
      currentLevel: 2,
      requiredLevel: item.req,
      gap: item.req - 2,
      priority: item.priority,
      reason: item.reason,
    })),
  };
}

function getFallbackLearningPlan(profile, analysis) {
  const role = profile?.targetRole || "Software Developer";
  const gaps = analysis?.gaps || [];
  const time = profile?.availableTime || "1 hour/day";
  const style = profile?.learningStyle || "Hands-on projects";

  const primarySkill = gaps[0]?.skill || "Core Software Development";
  const secondarySkill = gaps[1]?.skill || "Backend & Database Integration";

  return {
    targetRole: role,
    duration: "4 Weeks",
    weeklyHours: time,
    weeks: [
      {
        week: 1,
        focus: `Fundamentals of ${primarySkill}`,
        objectives: [`Understand core concepts of ${primarySkill}`, "Set up development environment"],
        tasks: [
          {
            title: `${primarySkill} — Environment & Concepts`,
            description: `Learn the fundamentals using a ${style.toLowerCase()} approach.`,
            type: "learning",
            estimatedTime: time,
          },
          {
            title: `Practical Exercises in ${primarySkill}`,
            description: `Build basic modules and test foundational logic.`,
            type: "practice",
            estimatedTime: time,
          },
        ],
        project: {
          title: `Mini Project: ${primarySkill} Core Module`,
          description: `Create a functional prototype demonstrating ${primarySkill}.`,
        },
      },
      {
        week: 2,
        focus: `Deep Dive into ${secondarySkill}`,
        objectives: [`Master data flow and integration for ${secondarySkill}`],
        tasks: [
          {
            title: `${secondarySkill} Architecture & Patterns`,
            description: `Study industry best practices and implementation patterns.`,
            type: "learning",
            estimatedTime: time,
          },
          {
            title: `Hands-on Integration with ${primarySkill}`,
            description: `Connect ${primarySkill} and ${secondarySkill} seamlessly.`,
            type: "practice",
            estimatedTime: time,
          },
        ],
        project: {
          title: `Integrated Module Prototype`,
          description: `Combine ${primarySkill} and ${secondarySkill} into a working service.`,
        },
      },
    ],
  };
}

function getFallbackProgress(profile, analysis, plan, completedTasks, progressPercentage) {
  const pct = typeof progressPercentage === "number" ? progressPercentage : 0;
  const count = Array.isArray(completedTasks) ? completedTasks.length : (completedTasks && typeof completedTasks === "object" ? Object.keys(completedTasks).length : 0);
  const status = pct >= 50 ? "on-track" : pct > 0 ? "needs-attention" : "on-track";

  return {
    overallStatus: status,
    progressPercentage: pct,
    summary: `Progress analysis completed: ${count} task(s) completed (${pct}% overall progress).`,
    completedAreas: count > 0 ? ["Foundational setup", "Initial roadmap milestones"] : [],
    strugglingAreas: pct === 0 ? [{ skill: "Time Management", reason: "No tasks marked complete yet." }] : [],
    recommendations: [
      {
        title: "Daily Micro-Learning",
        description: "Dedicate 20-30 minutes daily to complete the next upcoming task.",
        type: "practice",
        estimatedTime: "30 mins/day",
      },
    ],
    adaptation: {
      shouldAdapt: pct > 0,
      reason: pct > 0 ? "Completed tasks detected. Roadmap can be optimized for fast pace." : "No adjustments needed yet.",
      suggestedAction: pct > 0 ? "Accelerate upcoming practical projects." : "Focus on Task 1.",
    },
  };
}

function getFallbackAdaptation(profile, plan, progressReport) {
  const reason = progressReport?.adaptation?.reason || "Progress tracked; updating upcoming milestones.";
  return {
    adapted: true,
    reason: `[EduPath Adaptive Engine] ${reason}`,
    changes: [
      {
        type: "add",
        skill: "Advanced Project Implementation",
        description: "Added dedicated hands-on project phase based on your active completion pace.",
      },
    ],
    updatedUpcomingTasks: [
      {
        title: "Hands-on Capstone Integration Task",
        description: "Apply your completed milestones to build a real-world feature.",
        type: "project",
        estimatedTime: profile?.availableTime || "1 hour/day",
      },
    ],
  };
}

function getFallbackAssistantAnswer(profile, question) {
  const q = (question || "").toLowerCase();
  const role = profile?.targetRole || "your target career role";

  if (q.includes("express") || q.includes("node")) {
    return "In Express/Node.js, middleware components execute sequentially. For asynchronous error handling, always use try/catch blocks inside async routes and forward errors via `next(err)` or use Express 5 native async error propagation.";
  }
  if (q.includes("react") || q.includes("frontend")) {
    return "For React development, focus on component breakdown, state management (using custom hooks or Context API), and clean side-effect handling with `useEffect`.";
  }
  if (q.includes("mongo") || q.includes("database")) {
    return "In MongoDB and Mongoose, design your schemas to match your application query patterns. Use indexing on frequently queried fields like `_id` or `email` for fast lookups.";
  }
  if (q.includes("time") || q.includes("schedule") || q.includes("busy")) {
    return `With your current schedule of ${profile?.availableTime || "1 hour/day"}, consistency is key. Break down each roadmap task into small 20-minute daily coding sessions.`;
  }

  return `Based on your profile aiming for ${role}, the best next step is to focus on your current roadmap milestone, practice hands-on coding, and complete the upcoming project tasks!`;
}

function isFatalQuotaError(err) {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate-limits") ||
    msg.includes("exceeded") ||
    msg.includes("429") ||
    msg.includes("credentials") ||
    msg.includes("api key")
  );
}

// ── Main Service Exports ──

async function analyzeSkillGaps(profile) {
  try {
    const prompt = `
You are EduPath, an AI career learning agent.

Analyze this learner's current skills against their target career role.

Learner profile:
${JSON.stringify(profile, null, 2)}

Identify the most important skill gaps.

For each gap:
- identify the skill
- estimate current level from the learner profile (1–5 scale)
- estimate required level for the target role (1–5 scale)
- calculate the gap (requiredLevel - currentLevel)
- assign priority: high, medium, or low
- explain why the skill matters

Return ONLY valid JSON (no markdown, no code fences) in this exact structure:

{
  "targetRole": "string",
  "summary": "string",
  "gaps": [
    {
      "skill": "string",
      "currentLevel": 1,
      "requiredLevel": 5,
      "gap": 4,
      "priority": "high",
      "reason": "string"
    }
  ]
}
`;

    const models = [
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.5-flash-lite",
    ];

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        const text = response.text;
        return JSON.parse(text);
      } catch (err) {
        console.warn(`Model ${model} unavailable: ${err.message}`);
        if (isFatalQuotaError(err)) {
          console.warn("Quota/auth error detected. Failing over immediately to Fallback Engine.");
          break;
        }
      }
    }
  } catch (outerErr) {
    console.warn("Top-level Gemini error in analyzeSkillGaps:", outerErr.message);
  }

  return getFallbackSkillGaps(profile);
}

async function generateLearningPlan(profile, analysis) {
  try {
    const prompt = `
You are EduPath, an AI career learning agent.

Create a realistic, personalized learning roadmap for this learner using BOTH
the learner profile and the existing skill-gap analysis.

Learner profile:
${JSON.stringify(profile, null, 2)}

Existing skill-gap analysis:
${JSON.stringify(analysis, null, 2)}

Prioritize high-priority gaps first instead of trying to teach every gap at
once. Respect the learner's availableTime exactly: for 1 hour/day, schedule
approximately 7 hours/week maximum, with tasks whose estimated times fit that
limit. Progress logically from fundamentals to practice to a project. Adapt to
the learner's learningStyle, and prefer practical hands-on tasks when it is
hands-on. Keep the roadmap realistic for the learner's current skill levels.

Return ONLY valid JSON (no markdown, no code fences) in this exact structure:

{
  "targetRole": "string",
  "duration": "string",
  "weeklyHours": "string",
  "weeks": [
    {
      "week": 1,
      "focus": "string",
      "objectives": ["string"],
      "tasks": [
        {
          "title": "string",
          "description": "string",
          "type": "learning | practice | project",
          "estimatedTime": "string"
        }
      ],
      "project": {
        "title": "string",
        "description": "string"
      }
    }
  ]
}
`;

    const models = [
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.5-flash-lite",
    ];

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        const text = response.text;
        return JSON.parse(text);
      } catch (err) {
        console.warn(`Model ${model} unavailable: ${err.message}`);
        if (isFatalQuotaError(err)) {
          console.warn("Quota/auth error detected. Failing over immediately to Fallback Engine.");
          break;
        }
      }
    }
  } catch (outerErr) {
    console.warn("Top-level Gemini error in generateLearningPlan:", outerErr.message);
  }

  return getFallbackLearningPlan(profile, analysis);
}

async function analyzeProgress(
  profile,
  analysis,
  plan,
  completedTasks,
  progressPercentage
) {
  try {
    const prompt = `
You are EduPath, an AI Progress Agent.

Evaluate the learner's actual progress against their personalized roadmap.
Use only evidence present in the supplied data. Do not invent learner behavior,
reasons for incomplete tasks, or completed work that is not listed.

Learner profile:
${JSON.stringify(profile, null, 2)}

Original skill-gap analysis:
${JSON.stringify(analysis, null, 2)}

Personalized learning roadmap:
${JSON.stringify(plan, null, 2)}

Completed task information:
${JSON.stringify(completedTasks, null, 2)}

Overall progress percentage supplied by the application:
${JSON.stringify(progressPercentage)}

Reason about the relationship between completed and incomplete roadmap tasks,
the roadmap sequence, the learner's skill gaps, target role, and available time.
Identify struggling areas only when the supplied completion pattern or skill-gap
data supports them. If progress is normal, report on-track and avoid unnecessary
roadmap changes. Recommend realistic recovery actions when the learner is behind.
Do not simply repeat the percentage as the summary.

Return ONLY valid JSON (no markdown, no code fences) in this exact structure:

{
  "overallStatus": "on-track | needs-attention | significantly-behind",
  "progressPercentage": 0,
  "summary": "string",
  "completedAreas": ["string"],
  "strugglingAreas": [
    {
      "skill": "string",
      "reason": "string"
    }
  ],
  "recommendations": [
    {
      "title": "string",
      "description": "string",
      "type": "review | practice | learning | project",
      "estimatedTime": "string"
    }
  ],
  "adaptation": {
    "shouldAdapt": true,
    "reason": "string",
    "suggestedAction": "string"
  }
}
`;

    const models = [
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.5-flash-lite",
    ];

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        return JSON.parse(response.text);
      } catch (err) {
        console.warn(`Model ${model} unavailable: ${err.message}`);
        if (isFatalQuotaError(err)) {
          console.warn("Quota/auth error detected. Failing over immediately to Fallback Engine.");
          break;
        }
      }
    }
  } catch (outerErr) {
    console.warn("Top-level Gemini error in analyzeProgress:", outerErr.message);
  }

  return getFallbackProgress(profile, analysis, plan, completedTasks, progressPercentage);
}

async function adaptLearningPlan(profile, plan, progressReport) {
  try {
    const prompt = `
You are EduPath, an adaptive learning roadmap agent.

Use the learner profile, original roadmap, and Progress Agent report to adapt
ONLY future, uncompleted learning work. The original roadmap must remain
available. Preserve all completed work and do not mark anything completed.

Learner profile:
${JSON.stringify(profile, null, 2)}

Original learning roadmap:
${JSON.stringify(plan, null, 2)}

Progress Agent report:
${JSON.stringify(progressReport, null, 2)}

Follow these rules:
- Adapt only when progressReport.adaptation.shouldAdapt is true.
- If it is false, return adapted false with empty changes and updatedUpcomingTasks.
- Never delete or repeat completed tasks unless the report explicitly supports review.
- Do not invent learner behavior or claim unsupported struggle.
- Preserve completed work and do not replace the entire roadmap.
- Add, modify, reorder, or review only upcoming activities supported by the report.
- Keep tasks realistic for the learner's available time and target role.
- Explain why any adaptation is needed.

Return ONLY valid JSON (no markdown, no code fences) in this exact structure:

{
  "adapted": true,
  "reason": "string",
  "changes": [
    {
      "type": "add | modify | reorder | review",
      "skill": "string",
      "description": "string"
    }
  ],
  "updatedUpcomingTasks": [
    {
      "title": "string",
      "description": "string",
      "type": "learning | practice | project",
      "estimatedTime": "string"
    }
  ]
}
`;

    const models = [
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.5-flash-lite",
    ];

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        return JSON.parse(response.text);
      } catch (err) {
        console.warn(`Model ${model} unavailable: ${err.message}`);
        if (isFatalQuotaError(err)) {
          console.warn("Quota/auth error detected. Failing over immediately to Fallback Engine.");
          break;
        }
      }
    }
  } catch (outerErr) {
    console.warn("Top-level Gemini error in adaptLearningPlan:", outerErr.message);
  }

  return getFallbackAdaptation(profile, plan, progressReport);
}

async function recommendLearningResources(profile, analysis, retrievedResources) {
  if (!Array.isArray(retrievedResources) || retrievedResources.length === 0) {
    return { recommendations: [] };
  }

  try {
    const prompt = `
You are EduPath's learning resource recommendation agent.

Personalize the retrieved resources for this learner. Use only the supplied
resources and do not invent URLs or resources. Include recommendations only for
the identified skill gaps.

Learner profile:
${JSON.stringify(profile, null, 2)}

Skill-gap analysis:
${JSON.stringify(analysis, null, 2)}

Retrieved resources:
${JSON.stringify(retrievedResources, null, 2)}

Consider target role, current skill levels, gap priority, available time, and
learning style. Select the most relevant resources and explain why each one is
appropriate for this learner.

Return ONLY valid JSON (no markdown, no code fences) in this exact structure:

{
  "recommendations": [
    {
      "skill": "string",
      "priority": "high | medium | low",
      "resources": [
        {
          "title": "string",
          "type": "documentation | tutorial | course | practice",
          "url": "string",
          "reason": "string"
        }
      ]
    }
  ]
}
`;

    const models = [
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.5-flash-lite",
    ];

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const result = JSON.parse(response.text);
        return {
          recommendations: Array.isArray(result.recommendations)
            ? result.recommendations
            : [],
        };
      } catch (err) {
        console.warn(`Model ${model} unavailable: ${err.message}`);
        if (isFatalQuotaError(err)) {
          console.warn("Quota/auth error detected. Failing over immediately to Fallback Engine.");
          break;
        }
      }
    }
  } catch (outerErr) {
    console.warn("Top-level Gemini error in recommendLearningResources:", outerErr.message);
  }

  return {
    recommendations: retrievedResources.map((group) => ({
      skill: group.skill,
      priority: group.priority || "high",
      resources: (group.resources || []).map((res) => ({
        title: res.title,
        type: res.type || "tutorial",
        url: res.url,
        reason: "Retrieved directly from EduPath curated learning repository for your skill gap.",
      })),
    })),
  };
}

async function answerLearningQuestion(
  profile,
  analysis,
  plan,
  completedTasks,
  progressReport,
  adaptation,
  resources,
  question
) {
  if (!question || !question.trim()) {
    throw new Error("A learning question is required.");
  }

  try {
    const prompt = `
You are EduPath's Learning Assistant.

Answer the learner's question using only the learner context provided below.
Do not invent learner progress, skills, completed tasks, roadmap changes, or
resources. If the required information is not available, clearly say it is not
available in the learner's current EduPath data.

Stay focused on the learner's learning and career-development journey. Answer
directly and concisely. Recommend actions only when supported by the roadmap,
skill gaps, progress, adaptation, or retrieved resources.

Learner profile:
${JSON.stringify(profile || {}, null, 2)}

Skill-gap analysis:
${JSON.stringify(analysis || {}, null, 2)}

Learning roadmap:
${JSON.stringify(plan || {}, null, 2)}

Completed tasks:
${JSON.stringify(completedTasks || [], null, 2)}

Progress report:
${JSON.stringify(progressReport || {}, null, 2)}

Latest adaptation:
${JSON.stringify(adaptation || {}, null, 2)}

Recommended resources:
${JSON.stringify(resources || {}, null, 2)}

Learner question:
${question.trim()}

Return ONLY valid JSON in this exact structure:
{
  "answer": "string"
}
`;

    const models = [
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.5-flash-lite",
    ];

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        const result = JSON.parse(response.text);

        if (!result || typeof result.answer !== "string" || !result.answer.trim()) {
          throw new Error("Gemini returned an invalid assistant response.");
        }

        return { answer: result.answer.trim() };
      } catch (err) {
        console.warn(`Model ${model} unavailable: ${err.message}`);
        if (isFatalQuotaError(err)) {
          console.warn("Quota/auth error detected. Failing over immediately to Fallback Engine.");
          break;
        }
      }
    }
  } catch (outerErr) {
    console.warn("Top-level Gemini error in answerLearningQuestion:", outerErr.message);
  }

  return { answer: getFallbackAssistantAnswer(profile, question) };
}

module.exports = {
  analyzeSkillGaps,
  generateLearningPlan,
  analyzeProgress,
  adaptLearningPlan,
  recommendLearningResources,
  answerLearningQuestion,
};
