import { useEffect, useRef, useState } from "react";

interface ContextBuilderProps {
  onDone: () => void;
}

interface Step {
  id: string;
  question: string;
  options?: string[];
  field: string;
  detailField?: string; // optional field for elaboration text
  detailPrompt?: string; // prompt shown after choosing
  followUps?: { trigger: string; question: string; field: string }[];
}

const STEPS: Step[] = [
  {
    id: "location",
    question: "Let's start with where you are. Tell me your city/state or describe your area.",
    field: "region_description",
  },
  {
    id: "dwelling",
    question: "What kind of home do you live in?",
    options: ["House with land", "House (small lot)", "Apartment / condo", "Mobile home", "Cabin / rural property", "RV / van"],
    field: "dwelling",
    detailField: "property_size",
    detailPrompt: "How much land do you have? (e.g. 1/4 acre, 5 acres, just a balcony)",
  },
  {
    id: "setting",
    question: "How would you describe your area?",
    options: ["Rural", "Suburban", "Urban"],
    field: "setting",
  },
  {
    id: "household",
    question: "How many people are in your household?",
    options: ["Just me", "2 people", "3-4 people", "5+ people"],
    field: "household_size",
    detailField: "children",
    detailPrompt: "Any kids, pets, or anyone with medical needs? (helps tailor advice)",
  },
  {
    id: "water",
    question: "Where does your water come from?",
    options: ["City / municipal water", "Well", "Spring", "Rainwater collection", "Not sure"],
    field: "water_source",
  },
  {
    id: "power",
    question: "What's your power situation?",
    options: ["Grid power only", "Grid + solar panels", "Grid + generator backup", "Off-grid solar", "Off-grid generator"],
    field: "power",
  },
  {
    id: "garden",
    question: "Do you grow any of your own food?",
    options: ["Yes, I have a large garden", "Yes, a small/medium garden", "Container garden / raised beds", "Not yet, but I want to", "No"],
    field: "has_garden",
    detailField: "garden_details",
    detailPrompt: "Tell me about your garden — what do you grow, how much space, future plans?",
    followUps: [
      { trigger: "Yes", question: "What do you currently grow?", field: "garden_details" },
      { trigger: "Container", question: "What are you growing in containers, and what would you like to expand to?", field: "garden_details" },
      { trigger: "Not yet", question: "What's holding you back, and what would you like to grow?", field: "garden_details" },
    ],
  },
  {
    id: "livestock",
    question: "Do you keep any animals or livestock?",
    options: ["Chickens / poultry", "Goats", "Cattle", "Bees", "Rabbits", "Multiple types", "No livestock"],
    field: "livestock",
    detailField: "livestock_details",
    detailPrompt: "Tell me more — how many, what breeds, any plans to expand?",
  },
  {
    id: "food_storage",
    question: "How much food do you typically keep on hand?",
    options: ["A few days worth", "1-2 weeks (basic pantry)", "About a month", "3+ months", "6+ months"],
    field: "food_storage",
  },
  {
    id: "experience",
    question: "How would you rate your preparedness experience?",
    options: ["Complete beginner", "Some experience", "Intermediate", "Experienced"],
    field: "experience_level",
    detailField: "skills",
    detailPrompt: "Any specific skills worth mentioning? (e.g. canning, woodworking, medical training)",
  },
  {
    id: "priorities",
    question: "What's your main focus right now?",
    options: ["General emergency preparedness", "Growing and preserving food", "Energy independence", "Building self-sufficiency", "Preparing for specific threats", "Just learning"],
    field: "priorities",
    detailField: "notes",
    detailPrompt: "Anything else that would help me give you better answers?",
  },
];

interface ChatMsg {
  role: "system" | "user";
  content: string;
  options?: string[];
  showDetail?: boolean;
  detailPrompt?: string;
}

export function ContextBuilder({ onDone }: ContextBuilderProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [profile, setProfile] = useState<Record<string, string | number | boolean>>({});
  const [waitingForDetail, setWaitingForDetail] = useState(false);
  const [waitingForFollowUp, setWaitingForFollowUp] = useState<{ question: string; field: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: "system",
        content: "I'll ask a few questions to personalize your experience. Everything is stored locally — nothing leaves your device. You can elaborate on any answer or skip anything.",
      },
      {
        role: "system",
        content: STEPS[0].question,
        options: STEPS[0].options,
      },
    ]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveField = (field: string, value: string | number | boolean) => {
    setProfile((p) => ({ ...p, [field]: value }));
  };

  const advanceStep = (nextStep: number, updatedProfile?: Record<string, string | number | boolean>) => {
    if (nextStep >= STEPS.length) {
      handleComplete(updatedProfile || profile);
      return;
    }
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: STEPS[nextStep].question,
          options: STEPS[nextStep].options,
        },
      ]);
      setCurrentStep(nextStep);
      setWaitingForDetail(false);
      setWaitingForFollowUp(null);
    }, 350);
  };

  const handleChoiceAnswer = (answer: string) => {
    const step = STEPS[currentStep];

    // Map and save the answer
    let mappedValue: string | number | boolean = answer;
    if (step.field === "household_size") {
      mappedValue = answer.startsWith("Just") ? 1 : parseInt(answer) || 4;
    } else if (step.field === "has_garden") {
      mappedValue = !answer.startsWith("No");
    }
    saveField(step.field, mappedValue);

    setMessages((prev) => [...prev, { role: "user", content: answer }]);

    // Check for follow-ups
    const followUp = step.followUps?.find((f) => answer.includes(f.trigger));
    if (followUp) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: followUp.question, showDetail: true, detailPrompt: followUp.question },
        ]);
        setWaitingForFollowUp(followUp);
      }, 350);
    } else if (step.detailField && step.detailPrompt) {
      // Offer elaboration
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: step.detailPrompt!, showDetail: true },
        ]);
        setWaitingForDetail(true);
      }, 350);
    } else {
      advanceStep(currentStep + 1);
    }
  };

  const handleTextAnswer = () => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput("");

    setMessages((prev) => [...prev, { role: "user", content: text }]);

    if (waitingForFollowUp) {
      saveField(waitingForFollowUp.field, text);
      setWaitingForFollowUp(null);
      // Check if there's also a detail prompt
      const step = STEPS[currentStep];
      if (step.detailField && step.detailPrompt && step.detailField !== waitingForFollowUp.field) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { role: "system", content: step.detailPrompt!, showDetail: true },
          ]);
          setWaitingForDetail(true);
        }, 350);
      } else {
        advanceStep(currentStep + 1);
      }
    } else if (waitingForDetail) {
      const step = STEPS[currentStep];
      if (step.detailField) saveField(step.detailField, text);
      setWaitingForDetail(false);
      advanceStep(currentStep + 1);
    } else {
      // Text-type question (no options)
      const step = STEPS[currentStep];
      saveField(step.field, text);
      // Offer detail if available
      if (step.detailField && step.detailPrompt) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { role: "system", content: step.detailPrompt!, showDetail: true },
          ]);
          setWaitingForDetail(true);
        }, 350);
      } else {
        advanceStep(currentStep + 1);
      }
    }
  };

  const handleSkip = () => {
    setMessages((prev) => [...prev, { role: "user", content: "Skip" }]);
    setWaitingForDetail(false);
    setWaitingForFollowUp(null);
    advanceStep(currentStep + 1);
  };

  const handleComplete = async (finalProfile: Record<string, string | number | boolean>) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        content: "All set! Your context is saved and will personalize every response. You can review or update it anytime from the profile button.",
      },
    ]);
    try {
      await fetch("/api/context/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalProfile),
      });
    } catch { /* silent */ }
    setTimeout(onDone, 2000);
  };

  const progress = Math.round((currentStep / STEPS.length) * 100);
  const lastMsg = messages[messages.length - 1];
  const showOptions = lastMsg?.role === "system" && lastMsg?.options && !waitingForDetail && !waitingForFollowUp;
  const showTextInput = (lastMsg?.role === "system" && !lastMsg?.options) || waitingForDetail || waitingForFollowUp;

  return (
    <div className="cb-page">
      <div className="cb-container">
        <div className="cb-header">
          <div className="cb-header-left">
            <div className="cb-mark" />
            <div>
              <h1 className="cb-title">PERSONALIZE ALMANAC</h1>
              <p className="cb-sub">Stored locally · never leaves your device</p>
            </div>
          </div>
          <button className="cb-skip-all" onClick={() => handleComplete(profile)}>
            {currentStep > 3 ? "Finish" : "Skip all"}
          </button>
        </div>

        <div className="cb-progress-track">
          <div className="cb-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="cb-messages" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`cb-msg ${msg.role === "user" ? "cb-msg-user" : "cb-msg-system"}`}>
              {msg.role === "system" && <div className="cb-dot" />}
              <div className="cb-msg-body">
                <p>{msg.content}</p>
                {msg.options && i === messages.length - 1 && showOptions && (
                  <div className="cb-options">
                    {msg.options.map((opt) => (
                      <button key={opt} className="cb-option" onClick={() => handleChoiceAnswer(opt)}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {showTextInput && (
          <div className="cb-input-area">
            <form onSubmit={(e) => { e.preventDefault(); handleTextAnswer(); }} className="cb-input-form">
              <input
                className="cb-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your answer..."
                autoFocus
              />
              <button type="submit" className="cb-send" disabled={!textInput.trim()}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
            <button className="cb-skip" onClick={handleSkip}>Skip</button>
          </div>
        )}

        {showOptions && (
          <div className="cb-input-area">
            <button className="cb-skip" onClick={handleSkip}>Skip this question</button>
          </div>
        )}
      </div>

      <style>{`
        .cb-page { display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; animation:fadeInUp .4s ease; }
        .cb-container { max-width:520px; width:100%; max-height:90vh; display:flex; flex-direction:column; background:var(--bg-elevated); border:1px solid var(--border); border-radius:10px; overflow:hidden; }
        .cb-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }
        .cb-header-left { display:flex; align-items:center; gap:12px; }
        .cb-mark { width:4px; height:24px; background:var(--accent); border-radius:2px; flex-shrink:0; }
        .cb-title { font-family:var(--font-mono); font-size:12px; font-weight:500; letter-spacing:.12em; color:var(--text); }
        .cb-sub { font-size:11px; color:var(--text-muted); margin-top:1px; }
        .cb-skip-all { font-family:var(--font-mono); font-size:11px; color:var(--text-dim); background:none; border:1px solid var(--border); border-radius:4px; padding:4px 10px; cursor:pointer; transition:all .15s; }
        .cb-skip-all:hover { color:var(--text-muted); border-color:var(--border-light); }
        .cb-progress-track { height:2px; background:var(--border); flex-shrink:0; }
        .cb-progress-fill { height:100%; background:var(--accent); transition:width .4s ease; }
        .cb-messages { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:14px; }
        .cb-msg { display:flex; gap:10px; animation:fadeInUp .25s ease; }
        .cb-msg-user { justify-content:flex-end; padding-left:40px; }
        .cb-dot { width:6px; height:6px; border-radius:50%; background:var(--sage); margin-top:7px; flex-shrink:0; }
        .cb-msg-body { display:flex; flex-direction:column; gap:10px; }
        .cb-msg-body p { font-size:14px; line-height:1.6; color:var(--text); }
        .cb-msg-user .cb-msg-body p { background:var(--bg-card); border:1px solid var(--border); border-radius:8px 2px 8px 8px; padding:8px 14px; color:var(--text-bright); font-size:13.5px; }
        .cb-options { display:flex; flex-direction:column; gap:4px; }
        .cb-option { text-align:left; padding:10px 14px; background:var(--bg); border:1px solid var(--border); border-radius:8px; color:var(--text-muted); font-family:var(--font-body); font-size:13.5px; cursor:pointer; transition:all .15s; line-height:1.4; }
        .cb-option:hover { border-color:var(--accent); color:var(--text); background:var(--accent-dim); }
        .cb-input-area { padding:12px 20px 16px; border-top:1px solid var(--border); flex-shrink:0; display:flex; flex-direction:column; gap:6px; }
        .cb-input-form { display:flex; gap:6px; }
        .cb-input { flex:1; padding:9px 14px; background:var(--bg-input); border:1px solid var(--border); border-radius:6px; color:var(--text-bright); font-family:var(--font-body); font-size:14px; outline:none; transition:border-color .15s; }
        .cb-input:focus { border-color:var(--accent); }
        .cb-input::placeholder { color:var(--text-dim); }
        .cb-send { width:36px; height:36px; display:flex; align-items:center; justify-content:center; background:var(--accent); color:var(--bg); border:none; border-radius:6px; cursor:pointer; flex-shrink:0; }
        .cb-send:disabled { background:var(--border); color:var(--text-dim); cursor:default; }
        .cb-skip { background:none; border:none; color:var(--text-dim); font-size:12px; cursor:pointer; text-align:center; padding:2px; font-family:var(--font-mono); }
        .cb-skip:hover { color:var(--text-muted); }
      `}</style>
    </div>
  );
}
