import { useEffect, useState } from "react";

interface ProfileData {
  [key: string]: string | number | boolean | undefined;
}

interface ProfileProps {
  onBack: () => void;
}

interface Field {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "toggle";
  placeholder?: string;
  options?: string[];
  hint?: string;
  group: string;
}

const FIELDS: Field[] = [
  // Location
  { key: "region_description", label: "Location", type: "text", placeholder: "e.g. Lincoln, Nebraska — suburban, Zone 5b", hint: "City, state, or general description. We'll infer climate and growing zone.", group: "Location" },
  { key: "dwelling", label: "Home type", type: "select", options: ["house", "apartment", "mobile home", "cabin", "homestead", "RV"], group: "Location" },
  { key: "setting", label: "Setting", type: "select", options: ["rural", "suburban", "urban"], group: "Location" },
  { key: "property_size", label: "Property / land", type: "text", placeholder: "e.g. 1/4 acre lot, 5 acres, balcony only", group: "Location" },

  // Household
  { key: "household_size", label: "People in household", type: "number", placeholder: "4", group: "Household" },
  { key: "children", label: "Children", type: "text", placeholder: "e.g. 2 kids (ages 5 and 8)", group: "Household" },
  { key: "pets", label: "Pets", type: "text", placeholder: "e.g. 2 dogs, 1 cat", group: "Household" },
  { key: "medical_needs", label: "Medical considerations", type: "textarea", placeholder: "Any allergies, medications, chronic conditions, or mobility issues that affect preparedness planning", group: "Household" },

  // Infrastructure
  { key: "water_source", label: "Water source", type: "select", options: ["municipal", "well", "spring", "rainwater", "unknown"], group: "Infrastructure" },
  { key: "heating", label: "Heating", type: "select", options: ["electric", "natural gas", "propane", "wood stove", "oil", "heat pump"], group: "Infrastructure" },
  { key: "power", label: "Power", type: "select", options: ["grid only", "grid + solar", "grid + generator", "off-grid solar", "off-grid generator"], group: "Infrastructure" },

  // Food Production
  { key: "has_garden", label: "Garden", type: "toggle", group: "Food & Growing" },
  { key: "garden_details", label: "Garden details", type: "textarea", placeholder: "What do you grow? How much space? Raised beds, in-ground, containers? Any plans to expand?", hint: "The more detail here, the more specific our gardening advice will be.", group: "Food & Growing" },
  { key: "livestock", label: "Livestock / animals", type: "textarea", placeholder: "e.g. 6 chickens, planning to add goats next year. No livestock currently.", group: "Food & Growing" },
  { key: "food_storage", label: "Food storage level", type: "select", options: ["minimal (few days)", "basic pantry (1-2 weeks)", "1 month supply", "3+ months", "6+ months"], group: "Food & Growing" },

  // Experience & Goals
  { key: "experience_level", label: "Experience level", type: "select", options: ["complete beginner", "some experience", "intermediate", "experienced", "expert"], group: "About You" },
  { key: "skills", label: "Skills & experience", type: "textarea", placeholder: "e.g. I can basic repairs, some canning experience, comfortable with power tools. Took a wilderness first aid course.", group: "About You" },
  { key: "priorities", label: "What are you focused on?", type: "textarea", placeholder: "e.g. Building food self-sufficiency, emergency preparedness for winter storms, transitioning to off-grid solar", hint: "This shapes what kind of advice gets prioritized.", group: "About You" },
  { key: "notes", label: "Anything else", type: "textarea", placeholder: "Any other context that would help personalize advice — future plans, specific concerns, resources you already have", group: "About You" },
];

export function Profile({ onBack }: ProfileProps) {
  const [profile, setProfile] = useState<ProfileData>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    fetch("/api/context/profile")
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(() => {});
  }, []);

  const handleChange = (key: string, value: string | number | boolean) => {
    setProfile((p) => ({ ...p, [key]: value || undefined }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/context/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setSaved(true);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const filledCount = Object.values(profile).filter(Boolean).length;
  const groups = [...new Set(FIELDS.map((f) => f.group))];

  return (
    <div className="ctx-page">
      <div className="ctx-inner">
        {/* Header */}
        <div className="ctx-header">
          <button onClick={onBack} className="ctx-back" aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="ctx-header-text">
            <h1 className="ctx-title">YOUR CONTEXT</h1>
            <p className="ctx-sub">{filledCount} field{filledCount !== 1 ? "s" : ""} set — personalizes every response</p>
          </div>
          <button
            className={`ctx-save-btn ${saved ? "saved" : ""}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : saved ? "Saved" : "Save"}
          </button>
        </div>

        {/* Privacy note */}
        <div className="ctx-privacy">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          Stored locally on your device. Never sent anywhere.
        </div>

        {/* Fields */}
        {groups.map((group) => (
          <div key={group} className="ctx-group">
            <div className="ctx-group-label">{group}</div>
            {FIELDS.filter((f) => f.group === group).map((field) => (
              <div key={field.key} className="ctx-field">
                <label className="ctx-label">
                  {field.label}
                  {field.hint && <span className="ctx-hint">{field.hint}</span>}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    className="ctx-input ctx-textarea"
                    value={(profile[field.key] as string) || ""}
                    placeholder={field.placeholder}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    rows={3}
                  />
                ) : field.type === "select" ? (
                  <select
                    className="ctx-input ctx-select"
                    value={(profile[field.key] as string) || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  >
                    <option value="">—</option>
                    {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === "toggle" ? (
                  <div className="ctx-toggle">
                    <button className={`ctx-toggle-btn ${profile[field.key] === true ? "active" : ""}`} onClick={() => handleChange(field.key, true)}>Yes</button>
                    <button className={`ctx-toggle-btn ${profile[field.key] === false ? "active" : ""}`} onClick={() => handleChange(field.key, false)}>No</button>
                  </div>
                ) : field.type === "number" ? (
                  <input type="number" className="ctx-input" value={(profile[field.key] as number) || ""} placeholder={field.placeholder} onChange={(e) => handleChange(field.key, parseInt(e.target.value) || 0)} min={0} />
                ) : (
                  <input type="text" className="ctx-input" value={(profile[field.key] as string) || ""} placeholder={field.placeholder} onChange={(e) => handleChange(field.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Bottom save */}
        <div className="ctx-bottom">
          <button className="ctx-save-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : saved ? "Saved — context active" : "Save Context"}
          </button>
          {saved && <p className="ctx-confirm">All future responses will be personalized to your situation.</p>}
        </div>
      </div>

      <style>{`
        .ctx-page { min-height:100vh; padding:24px; animation:fadeInUp 0.3s ease; }
        .ctx-inner { max-width:560px; margin:0 auto; }
        .ctx-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
        .ctx-back { width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:var(--bg-elevated); color:var(--text-muted); border:1px solid var(--border); border-radius:6px; cursor:pointer; flex-shrink:0; transition:all 0.15s; }
        .ctx-back:hover { color:var(--text); border-color:var(--border-light); }
        .ctx-header-text { flex:1; }
        .ctx-title { font-family:var(--font-mono); font-size:13px; font-weight:500; letter-spacing:0.12em; color:var(--text); }
        .ctx-sub { font-size:11px; color:var(--text-muted); margin-top:1px; }
        .ctx-save-btn { padding:6px 14px; background:var(--accent); color:var(--bg); border:none; border-radius:6px; font-family:var(--font-mono); font-size:11px; font-weight:500; cursor:pointer; transition:all 0.15s; letter-spacing:0.04em; }
        .ctx-save-btn:hover { filter:brightness(1.1); }
        .ctx-save-btn:disabled { opacity:0.5; }
        .ctx-save-btn.saved { background:var(--sage); }

        .ctx-privacy { display:flex; align-items:center; gap:7px; font-family:var(--font-mono); font-size:10.5px; color:var(--text-dim); padding:8px 12px; background:var(--bg-elevated); border:1px solid var(--border); border-radius:6px; margin-bottom:20px; }

        .ctx-group { margin-bottom:20px; }
        .ctx-group-label { font-family:var(--font-mono); font-size:9.5px; font-weight:500; color:var(--text-dim); letter-spacing:0.14em; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid var(--border); text-transform:uppercase; }

        .ctx-field { margin-bottom:14px; }
        .ctx-label { display:block; font-size:13px; color:var(--text); margin-bottom:4px; font-weight:500; }
        .ctx-hint { display:block; font-size:11px; color:var(--text-dim); font-weight:400; margin-top:2px; line-height:1.4; }

        .ctx-input { width:100%; padding:8px 12px; background:var(--bg-input); border:1px solid var(--border); border-radius:6px; color:var(--text-bright); font-family:var(--font-body); font-size:14px; outline:none; transition:border-color 0.15s; }
        .ctx-input:focus { border-color:var(--accent); }
        .ctx-input::placeholder { color:var(--text-dim); }

        .ctx-textarea { resize:vertical; min-height:72px; line-height:1.5; font-size:13.5px; }

        .ctx-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a756a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; }

        .ctx-toggle { display:flex; gap:4px; }
        .ctx-toggle-btn { padding:6px 18px; background:var(--bg-input); border:1px solid var(--border); border-radius:6px; color:var(--text-muted); font-size:13px; cursor:pointer; transition:all 0.15s; font-family:var(--font-body); }
        .ctx-toggle-btn.active { background:var(--accent-dim); border-color:var(--accent); color:var(--accent); }

        .ctx-bottom { margin-top:8px; padding-top:16px; border-top:1px solid var(--border); }
        .ctx-save-full { width:100%; padding:11px; background:var(--accent); color:var(--bg); border:none; border-radius:8px; font-family:var(--font-body); font-size:14px; font-weight:600; cursor:pointer; transition:filter 0.15s; }
        .ctx-save-full:hover { filter:brightness(1.1); }
        .ctx-save-full:disabled { opacity:0.6; }
        .ctx-confirm { font-size:12px; color:var(--sage-bright); text-align:center; margin-top:8px; }
      `}</style>
    </div>
  );
}
