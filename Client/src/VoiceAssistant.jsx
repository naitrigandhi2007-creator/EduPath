import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "./api";

export default function VoiceAssistant({
  profile,
  analysis,
  plan,
  completedTasks,
  progressReport,
  adaptation,
  resourceRecommendations,
}) {
  const [voiceStatus, setVoiceStatus] = useState("ready"); // 'ready' | 'listening' | 'processing' | 'speaking' | 'error'
  const [userSaid, setUserSaid] = useState("");
  const [voiceAnswer, setVoiceAnswer] = useState("");
  const [voiceError, setVoiceError] = useState("");

  const recognitionRef = useRef(null);

  // Clean up speech recognition & synthesis when component unmounts
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore cleanup errors
        }
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getStatusBadge = () => {
    switch (voiceStatus) {
      case "listening":
        return { label: "🔴 Listening...", cls: "voice-status-listening" };
      case "processing":
        return { label: "⚙️ Processing...", cls: "voice-status-processing" };
      case "speaking":
        return { label: "🔊 Speaking...", cls: "voice-status-speaking" };
      case "error":
        return { label: "⚠️ Error", cls: "voice-status-error" };
      default:
        return { label: "🟢 Ready", cls: "voice-status-ready" };
    }
  };

  const handleStartTalking = () => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setVoiceError(
        "Voice input is not supported in this browser. You can still use the text assistant."
      );
      setVoiceStatus("error");
      return;
    }

    // Stop any active synthesis or previous recognition session
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }

    setVoiceError("");
    setUserSaid("");
    setVoiceAnswer("");

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setVoiceStatus("listening");
      };

      recognition.onresult = (event) => {
        const transcript =
          event.results &&
          event.results[0] &&
          event.results[0][0] &&
          event.results[0][0].transcript;

        if (transcript && transcript.trim()) {
          const cleanedText = transcript.trim();
          setUserSaid(cleanedText);
          sendVoiceQuestion(cleanedText);
        } else {
          setVoiceError("No speech was recognized. Please try clicking 'Start Talking' again.");
          setVoiceStatus("error");
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error event:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setVoiceError(
            "Microphone permission was denied. Please allow microphone access in your browser settings to use the Voice Assistant."
          );
        } else if (event.error === "no-speech") {
          setVoiceError("No speech detected. Please click 'Start Talking' and speak into your microphone.");
        } else {
          setVoiceError("Could not recognize speech. Please try again or use the text assistant.");
        }
        setVoiceStatus("error");
      };

      recognition.onend = () => {
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition startup error:", err);
      setVoiceError("Failed to access voice recognition. Please try again.");
      setVoiceStatus("error");
    }
  };

  const sendVoiceQuestion = async (questionText) => {
    setVoiceStatus("processing");
    try {
      const response = await fetch(`${API_BASE_URL}/api/profiles/assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile,
          analysis,
          plan,
          completedTasks: Object.keys(completedTasks || {}).filter(
            (taskId) => completedTasks[taskId]
          ),
          progressReport,
          adaptation,
          resources: resourceRecommendations || [],
          question: questionText,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.answer) {
        const errorMsg =
          data.error ||
          "AI response is temporarily unavailable. Please try again later or use the text assistant.";
        setVoiceError(errorMsg);
        setVoiceStatus("error");
        return;
      }

      setVoiceAnswer(data.answer);

      // Read answer aloud using Speech Synthesis API
      speakAnswer(data.answer);
    } catch (err) {
      console.error("Voice assistant request error:", err);
      setVoiceError(
        "AI response is temporarily unavailable. Please try again later or use the text assistant."
      );
      setVoiceStatus("error");
    }
  };

  const speakAnswer = (textToSpeak) => {
    if (!window.speechSynthesis) {
      setVoiceStatus("ready");
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setVoiceStatus("speaking");
      };

      utterance.onend = () => {
        setVoiceStatus("ready");
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis utterance error:", e);
        setVoiceStatus("ready");
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis speak error:", err);
      setVoiceStatus("ready");
    }
  };

  const handleStopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }
    setVoiceStatus("ready");
  };

  const statusInfo = getStatusBadge();

  return (
    <div className="voice-assistant-card">
      <div className="voice-assistant-header">
        <div className="section-heading" style={{ marginBottom: 0 }}>
          <span className="section-icon">🎙️</span>
          <div>
            <p className="eyebrow">INTERACTIVE VOICE AI</p>
            <h2 style={{ fontSize: "1.4rem", margin: 0 }}>🎙️ Voice Learning Assistant</h2>
          </div>
        </div>
        <span className={`voice-status-badge ${statusInfo.cls}`}>
          {statusInfo.label}
        </span>
      </div>

      <p className="section-summary" style={{ marginTop: "12px", marginBottom: "16px" }}>
        Talk to EduPath and get guidance based on your current skills, roadmap, and progress.
      </p>

      <div className="voice-actions">
        <button
          type="button"
          className="voice-btn voice-start-btn"
          onClick={handleStartTalking}
          disabled={voiceStatus === "listening" || voiceStatus === "processing"}
        >
          🎙️ Start Talking
        </button>

        <button
          type="button"
          className="voice-btn voice-stop-btn"
          onClick={handleStopSpeaking}
          disabled={voiceStatus !== "speaking" && voiceStatus !== "listening"}
        >
          ⏹ Stop Speaking
        </button>
      </div>

      {voiceError && (
        <div className="error-card voice-error-card" style={{ marginTop: "16px" }}>
          <strong>⚠️ Voice Assistant Notice</strong>
          <p>{voiceError}</p>
        </div>
      )}

      {userSaid && (
        <div className="voice-speech-box user-speech-box" style={{ marginTop: "16px" }}>
          <p className="eyebrow">YOU SAID</p>
          <p style={{ margin: 0, fontWeight: 500 }}>"{userSaid}"</p>
        </div>
      )}

      {voiceAnswer && (
        <div className="assistant-answer voice-answer-box" style={{ marginTop: "16px" }}>
          <p className="eyebrow">EDUPATH ANSWER</p>
          <p style={{ margin: 0, lineHeight: 1.6 }}>{voiceAnswer}</p>
        </div>
      )}
    </div>
  );
}
