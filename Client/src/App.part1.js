import { useRef, useState } from "react";

const readStoredJson = (key, fallback = null) => {
  if (!key) return fallback;
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch (error) {
    console.error(error);
    return fallback;
  }
};

const getProfileKey = (profile) =>
  profile ? profile._id || `${profile.name}-${profile.targetRole}` : null;

const quotaErrorMessage =
  "AI generation is temporarily unavailable because the AI service quota has been reached. Your existing roadmap and progress are still available.";
const assistantQuotaErrorMessage =
  "The AI assistant is temporarily unavailable because the AI service has reached its current usage limit. Please try again later.";

const isQuotaError = (response, data) => {
  const errorText = typeof data.error === "string"
    ? data.error : JSON.stringify(data.error || data);
  return response.status === 429 ||
    errorText.includes("429") ||
    errorText.includes("RESOURCE_EXHAUSTED") ||
    errorText.includes("quota");
};

function agentStatus({ isLoading, result, error }) {
  if (isLoading) return { label: "🔄 Analyzing...", cls: "agent-running" };
  if (error)     return { label: "⚠ Unavailable",  cls: "agent-error" };
  if (result)    return { label: "✓ Completed",     cls: "agent-complete" };
  return           { label: "○ Waiting",             cls: "agent-waiting" };
}
