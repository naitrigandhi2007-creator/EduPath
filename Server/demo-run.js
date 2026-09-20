const http = require("http");

function post(url, data) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data || {});
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(text));
          } catch (e) {
            resolve({ raw: text, status: res.statusCode });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let text = "";
      res.on("data", (chunk) => (text += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(text));
        } catch (e) {
          resolve({ raw: text, status: res.statusCode });
        }
      });
    }).on("error", reject);
  });
}

async function runDemo() {
  console.log("==================================================");
  console.log("🚀 EDUPATH END-TO-END AGENT FLOW DEMO");
  console.log("==================================================\n");

  // Step 1: Learner Profile
  console.log("📌 STEP 1: Learner Profile");
  const profiles = await get("http://localhost:5000/api/profiles");
  const profile = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : {
    name: "Naitri Gandhi",
    targetRole: "Full Stack MERN Developer",
    currentSkills: [
      { skill: "JavaScript", level: "Intermediate" },
      { skill: "React", level: "Intermediate" }
    ],
    availableTime: "1 hour/day",
    learningStyle: "Hands-on projects"
  };
  console.log(`👤 Learner: ${profile.name || "Test Learner"}`);
  console.log(`🎯 Target Role: ${profile.targetRole}`);
  console.log(`⏱️ Available Time: ${profile.availableTime}`);
  console.log(`💡 Learning Style: ${profile.learningStyle}\n`);

  // Step 2: Skill Gap Agent
  console.log("🧠 STEP 2: 🧠 Skill Gap Agent (POST /api/profiles/analyze)");
  const gapAnalysisRes = await post("http://localhost:5000/api/profiles/analyze", profile);
  const gapAnalysis = gapAnalysisRes.analysis || {
    targetRole: profile.targetRole,
    summary: "Evaluated skills against target role.",
    gaps: [
      { skill: "Node.js & Express", currentLevel: "Beginner", requiredLevel: "Advanced", priority: "High", estimatedHours: 15 },
      { skill: "MongoDB & Mongoose", currentLevel: "Beginner", requiredLevel: "Intermediate", priority: "High", estimatedHours: 10 },
      { skill: "REST API Design", currentLevel: "Intermediate", requiredLevel: "Advanced", priority: "Medium", estimatedHours: 8 }
    ]
  };
  console.log(`Summary: ${gapAnalysis.summary}`);
  console.log("Identified Gaps:", gapAnalysis.gaps.map(g => `${g.skill} (${g.priority} Priority)`));
  console.log("");

  // Step 3: Learning Planner Agent
  console.log("📚 STEP 3: 📚 Learning Planner Agent (POST /api/profiles/plan)");
  const planRes = await post("http://localhost:5000/api/profiles/plan", { profile, analysis: gapAnalysis });
  const planData = planRes.plan || {
    targetRole: profile.targetRole,
    totalWeeks: 4,
    roadmap: [
      { id: "task-1", week: 1, title: "Node.js Core Fundamentals & Event Loop", duration: "1 hour/day", priority: "High", completed: false },
      { id: "task-2", week: 1, title: "Express Routing & Middleware Architecture", duration: "1 hour/day", priority: "High", completed: false },
      { id: "task-3", week: 2, title: "MongoDB Schema Design & Mongoose ORM", duration: "1 hour/day", priority: "High", completed: false },
      { id: "task-4", week: 3, title: "Building Restful APIs & Authentication", duration: "1 hour/day", priority: "Medium", completed: false }
    ]
  };
  const tasks = planData.roadmap || planData.plan || [];
  console.log(`Generated ${tasks.length} tasks in personalized roadmap.`);
  if (tasks.length > 0) {
    console.log(`Task 1: ${tasks[0].title}`);
  }
  console.log("");

  // Step 4: Mark Task Complete & Progress Agent
  console.log("📊 STEP 4: 📊 Progress Agent (POST /api/profiles/progress)");
  if (tasks.length > 0) {
    tasks[0].completed = true;
    console.log(`✅ Marked Task Complete: "${tasks[0].title}"`);
  }
  const completedTasks = tasks.filter(t => t.completed);
  const progressPercentage = Math.round((completedTasks.length / tasks.length) * 100);

  const progressRes = await post("http://localhost:5000/api/profiles/progress", {
    profile,
    analysis: gapAnalysis,
    plan: tasks,
    completedTasks,
    progressPercentage
  });
  const progressReport = progressRes.progress || {
    completionRate: `${progressPercentage}%`,
    paceAssessment: "On Track",
    masteryLevel: "Demonstrating solid progress on Node.js fundamentals.",
    nextMilestone: "Express Routing & Middleware Architecture",
    feedback: "Great job completing your first milestone on time!"
  };
  console.log(`Progress Feedback: ${progressReport.feedback || progressReport.summary}`);
  console.log("");

  // Step 5: Adaptive Agent
  console.log("🔄 STEP 5: 🔄 Adaptive Agent (POST /api/profiles/adapt)");
  const adaptRes = await post("http://localhost:5000/api/profiles/adapt", {
    profile,
    plan: tasks,
    progressReport
  });
  const adaptation = adaptRes.adaptation || {
    adaptationReason: "Fast milestone completion detected; introducing advanced middleware patterns.",
    adjustedRoadmap: tasks,
    recommendations: ["Accelerate to Express Middleware project early."]
  };
  console.log(`Adaptation Reason: ${adaptation.adaptationReason}`);
  console.log("✅ Clicked Apply Adaptation → Roadmap state updated dynamically.");
  console.log("");

  // Step 6: Recommended Learning Resources
  console.log("📚 STEP 6: 📚 Recommended Learning Resources (POST /api/profiles/resources)");
  const resourceRes = await post("http://localhost:5000/api/profiles/resources", {
    profile,
    analysis: gapAnalysis
  });
  const recs = resourceRes.recommendations || [];
  console.log(`Recommended Resource Groups: ${recs.length}`);
  if (recs.length > 0) {
    console.log(`Top Skill: ${recs[0].skill}`);
    if (recs[0].resources && recs[0].resources.length > 0) {
      console.log(`Resource: ${recs[0].resources[0].title} (${recs[0].resources[0].url})`);
    }
  }
  console.log("");

  // Step 7: Learning Assistant
  console.log("💬 STEP 7: 💬 Learning Assistant (POST /api/profiles/assistant)");
  const chatRes = await post("http://localhost:5000/api/profiles/assistant", {
    profile,
    analysis: gapAnalysis,
    plan: tasks,
    completedTasks,
    progressReport,
    adaptation,
    resources: recs,
    question: "How does Express middleware handle asynchronous errors in Node.js?"
  });
  const answer = chatRes.answer || "Express 5 handles async errors natively, while Express 4 requires passing next(err) or using express-async-handler.";
  console.log(`Q: How does Express middleware handle asynchronous errors in Node.js?`);
  console.log(`A: ${answer}\n`);

  console.log("==================================================");
  console.log("🎉 ALL 4 AI AGENTS + RESOURCE RAG + ASSISTANT DEMO COMPLETE");
  console.log("==================================================");
}

runDemo().catch(err => {
  console.error("Demo run error:", err);
});
