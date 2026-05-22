// @ts-nocheck
"use client";
import { useState, useEffect } from "react";

const CQ_LOGO = "/logo.png";
const SUPABASE_URL = "https://ccornucfqjfxhjurpbcu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjb3JudWNmcWpmeGhqdXJwYmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMTgwODQsImV4cCI6MjA5Mjg5NDA4NH0.EuVR4lUVniFAomiv2o9cAysMqmiCmQrMrWmxyaG96PA";
const TEAM = "coach";
const STORAGE_KEY = "cq_coach_reviews";
const SP_PIN = "1810";

const RATINGS = [
  { key: "Preparation", desc: "Game plan, training sessions, pre-performance routine" },
  { key: "Communication", desc: "How clearly roles and responsibilities were communicated" },
  { key: "Tactical Setup", desc: "Decisions before and during the game — structure, adjustments, subs" },
  { key: "Emotional Control", desc: "Your composure on the sideline — especially under pressure" },
];

const RATING_LABELS = { 1:"Poor",2:"Poor",3:"Needs Work",4:"Needs Work",5:"Average",6:"Average",7:"Good",8:"Good",9:"Very Good",10:"Outstanding" };

const WENT_WELL_PROMPTS = [
  "Clear pre-match message", "Good warm-up energy", "Players knew their roles",
  "Effective half-time talk", "Good sideline composure", "Effective substitutions",
  "Positive body language", "Players responded to feedback", "Good preparation", "Supported players post-game",
  "Created a challenge environment"
];

const DEVELOPMENT_PROMPTS = [
  "Emotional reaction to mistakes", "Unclear tactical message", "Poor body language",
  "Overcoaching during play", "Slow to make changes", "Inconsistent communication",
  "Threat environment created", "Poor preparation", "Didn't respond well to setbacks",
  "Lost composure under pressure"
];

const STEP_LABELS = ["", "Ratings", "Went Well", "Development", "Action Plan", ""];
const TOTAL_STEPS = 5;

const loadReviews = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch(e) { return []; } };
const saveReview = (review) => {
  try { const e = loadReviews(); e.unshift(review); localStorage.setItem(STORAGE_KEY, JSON.stringify(e.slice(0, 20))); } catch {}
};

const logCompletion = async (name, opposition, date) => {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ team: TEAM, name, opposition, date, timestamp: Date.now() }),
    });
  } catch {}
};

const loadCompletions = async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/completions?team=eq.${TEAM}&order=timestamp.desc`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
    });
    return await res.json();
  } catch { return []; }
};

const getWeekKey = (timestamp) => {
  const d = new Date(timestamp);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
};

function ProgressBar({ step }) {
  const steps = ["Ratings", "Went Well", "Development", "Action Plan"];
  const current = step - 1;
  return (
    <div style={{ margin: "14px 0 24px" }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i < current ? "#F0A500" : i === current ? "#F0A50066" : "#2E2E2E", transition: "background 0.3s ease" }} />
        ))}
      </div>
      {step > 0 && step < TOTAL_STEPS && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#F0A500", fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: 2 }}>{STEP_LABELS[step].toUpperCase()}</span>
          <span style={{ color: "#666666", fontFamily: "'Courier New', monospace", fontSize: 10 }}>{step} of {TOTAL_STEPS - 1}</span>
        </div>
      )}
    </div>
  );
}

function RatingRow({ label, desc, value, onChange }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#CCCCCC", fontFamily: "'Courier New', monospace", fontSize: 11, letterSpacing: 2 }}>{label.toUpperCase()}</span>
          {value > 0 && <span style={{ color: value >= 8 ? "#F0A500" : value >= 5 ? "#F4C542" : "#E74C3C", fontSize: 11, fontFamily: "'Courier New', monospace" }}>{value} — {RATING_LABELS[value]}</span>}
        </div>
        <div style={{ color: "#666666", fontSize: 11, fontFamily: "Georgia, serif", marginTop: 3, fontStyle: "italic" }}>{desc}</div>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n} onClick={() => onChange(n)} style={{ flex: 1, height: 38, borderRadius: 6, border: "none", background: value === n ? (n >= 8 ? "#F0A500" : n >= 5 ? "#F4C542" : "#E74C3C") : value > 0 && n <= value ? (n >= 8 ? "#F0A50022" : n >= 5 ? "#F4C54222" : "#E74C3C22") : "#2E2E2E", color: value === n ? "#111111" : "#9A9A9A", fontWeight: "bold", fontSize: 12, cursor: "pointer", transition: "all 0.15s ease", fontFamily: "'Courier New', monospace", transform: value === n ? "scale(1.1)" : "scale(1)" }}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function ChipSelector({ items, selected, onToggle, color }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {items.map(d => {
        const isSelected = selected.includes(d);
        return (
          <button key={d} onClick={() => onToggle(d)} style={{ padding: "10px 14px", borderRadius: 40, border: `1.5px solid ${isSelected ? color : "#3D3D3D"}`, background: isSelected ? `${color}22` : "#242424", color: isSelected ? color : "#9A9A9A", fontFamily: "'Courier New', monospace", fontSize: 12, cursor: "pointer", transition: "all 0.15s ease" }}>{d}</button>
        );
      })}
    </div>
  );
}

function SelectedSummary({ items, color, bg }) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 16, padding: "10px 14px", background: bg, borderRadius: 10, border: `1px solid ${color}22` }}>
      <div style={{ color, fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>SELECTED</div>
      <div style={{ color: "#CCCCCC", fontSize: 12, fontFamily: "Georgia, serif" }}>{items.join(" · ")}</div>
    </div>
  );
}

function SPDashboard({ onBack }) {
  const [completions, setCompletions] = useState(null);
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);

  useEffect(() => { if (unlocked) loadCompletions().then(setCompletions); }, [unlocked]);

  const tryPin = () => {
    if (pin === SP_PIN) { setUnlocked(true); setPinError(false); }
    else { setPinError(true); setPin(""); }
  };

  if (!unlocked) return (
    <div style={{ padding: "40px 22px", maxWidth: 500, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#9A9A9A", fontFamily: "'Courier New', monospace", fontSize: 11, cursor: "pointer", marginBottom: 30 }}>← BACK</button>
      <div style={{ color: "#F0F0F0", fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 24, marginBottom: 6 }}>Sport Psychologist Access</div>
      <div style={{ color: "#9A9A9A", fontSize: 14, marginBottom: 30, fontFamily: "Georgia, serif" }}>Enter your PIN to view coach completions.</div>
      <input type="password" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && tryPin()} placeholder="Enter PIN"
        style={{ width: "100%", background: "#242424", border: `1.5px solid ${pinError ? "#E74C3C" : "#2E2E2E"}`, borderRadius: 10, color: "#F0F0F0", padding: "14px 16px", fontSize: 18, fontFamily: "'Courier New', monospace", outline: "none", letterSpacing: 4, marginBottom: 12 }} />
      {pinError && <div style={{ color: "#E74C3C", fontSize: 12, fontFamily: "'Courier New', monospace", marginBottom: 12 }}>Incorrect PIN. Try again.</div>}
      <button onClick={tryPin} style={{ width: "100%", padding: 14, background: "#F0A500", border: "none", borderRadius: 10, color: "#111111", fontFamily: "'Courier New', monospace", fontWeight: "bold", fontSize: 13, cursor: "pointer", letterSpacing: 2 }}>UNLOCK →</button>
    </div>
  );

  if (!completions) return <div style={{ padding: "40px 22px", textAlign: "center" }}><div style={{ color: "#9A9A9A", fontFamily: "'Courier New', monospace", fontSize: 13 }}>Loading...</div></div>;

  const byWeek = {};
  completions.forEach(c => { const wk = getWeekKey(c.timestamp); if (!byWeek[wk]) byWeek[wk] = []; byWeek[wk].push(c); });
  const weeks = Object.keys(byWeek).sort().reverse();
  const thisWeek = weeks[0] ? byWeek[weeks[0]] : [];
  const allCoaches = [...new Set(completions.map(c => c.name))].sort();
  const coachTotals = {};
  completions.forEach(c => { coachTotals[c.name] = (coachTotals[c.name] || 0) + 1; });

  return (
    <div style={{ padding: "20px 22px 60px", maxWidth: 500, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ color: "#F0A500", fontSize: 12, fontFamily: "'Courier New', monospace", letterSpacing: 3, marginBottom: 2 }}>CONOR QUINLAN</div>
          <div style={{ color: "#F0F0F0", fontFamily: "'Courier New', monospace", fontWeight: "bold", fontSize: 15, letterSpacing: 1 }}>SPORT PSYCHOLOGIST DASHBOARD</div>
        </div>
        <img src={CQ_LOGO} alt="CQ" style={{ height: 44, width: "auto", opacity: 0.9 }} />
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#9A9A9A", fontFamily: "'Courier New', monospace", fontSize: 11, cursor: "pointer" }}>← BACK</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, background: "#242424", borderRadius: 12, padding: "16px", border: "1px solid #F0A50044", textAlign: "center" }}>
          <div style={{ color: "#F0A500", fontFamily: "'Courier New', monospace", fontWeight: "bold", fontSize: 36 }}>{thisWeek.length}</div>
          <div style={{ color: "#9A9A9A", fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: 2, marginTop: 4 }}>THIS WEEK</div>
        </div>
        <div style={{ flex: 1, background: "#242424", borderRadius: 12, padding: "16px", border: "1px solid #2E2E2E", textAlign: "center" }}>
          <div style={{ color: "#CCCCCC", fontFamily: "'Courier New', monospace", fontWeight: "bold", fontSize: 36 }}>{completions.length}</div>
          <div style={{ color: "#9A9A9A", fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: 2, marginTop: 4 }}>ALL TIME</div>
        </div>
      </div>

      <div style={{ background: "#242424", borderRadius: 12, padding: "14px 16px", marginBottom: 16, border: "1px solid #2E2E2E" }}>
        <div style={{ color: "#F0A500", fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: 2, marginBottom: 14 }}>✓ COMPLETED THIS WEEK</div>
        {thisWeek.length === 0 ? <div style={{ color: "#666666", fontFamily: "Georgia, serif", fontSize: 14 }}>No completions yet this week.</div> :
          thisWeek.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: i < thisWeek.length-1 ? "1px solid #2E2E2E" : "none" }}>
              <div>
                <div style={{ color: "#F0F0F0", fontFamily: "Georgia, serif", fontSize: 14 }}>{c.name}</div>
                <div style={{ color: "#666666", fontFamily: "'Courier New', monospace", fontSize: 10, marginTop: 2 }}>vs {c.opposition}</div>
              </div>
              <div style={{ color: "#666666", fontFamily: "'Courier New', monospace", fontSize: 10 }}>{c.date}</div>
            </div>
          ))
        }
      </div>

      {allCoaches.length > 0 && (
        <div style={{ background: "#242424", borderRadius: 12, padding: "14px 16px", border: "1px solid #2E2E2E" }}>
          <div style={{ color: "#9A9A9A", fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: 2, marginBottom: 14 }}>ALL COACHES — TOTAL REVIEWS</div>
          {allCoaches.map((p, i) => {
            const total = coachTotals[p] || 0;
            const pct = Math.min((total / Math.max(...Object.values(coachTotals))) * 100, 100);
            return (
              <div key={p} style={{ marginBottom: i < allCoaches.length-1 ? 12 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ color: "#F0F0F0", fontFamily: "Georgia, serif", fontSize: 13 }}>{p}</span>
                  <span style={{ color: total >= 5 ? "#F0A500" : total >= 2 ? "#F4C542" : "#E74C3C", fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: "bold" }}>{total}</span>
                </div>
                <div style={{ height: 4, background: "#2E2E2E", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: total >= 5 ? "#F0A500" : total >= 2 ? "#F4C542" : "#E74C3C", borderRadius: 2, transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryView({ reviews, onBack, onDelete }) {
  const [expanded, setExpanded] = useState(null);
  if (reviews.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
      <div style={{ color: "#9A9A9A", fontFamily: "Georgia, serif", fontSize: 15 }}>No reviews yet.</div>
      <button onClick={onBack} style={{ marginTop: 28, padding: "12px 24px", background: "#F0A500", border: "none", borderRadius: 10, color: "#111111", fontFamily: "'Courier New', monospace", fontWeight: "bold", fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>← BACK</button>
    </div>
  );
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ color: "#F0F0F0", fontFamily: "'Courier New', monospace", fontWeight: "bold", fontSize: 14, letterSpacing: 1 }}>MY REVIEWS</div>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#9A9A9A", fontFamily: "'Courier New', monospace", fontSize: 11, cursor: "pointer" }}>← BACK</button>
      </div>
      {reviews.map((rev, idx) => (
        <div key={idx} style={{ background: "#242424", borderRadius: 12, marginBottom: 10, border: "1px solid #2E2E2E", overflow: "hidden" }}>
          <div onClick={() => setExpanded(expanded===idx?null:idx)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#F0F0F0", fontFamily: "'Courier New', monospace", fontWeight: "bold", fontSize: 13 }}>vs {rev.opposition}</div>
              <div style={{ color: "#666666", fontSize: 12, fontFamily: "'Courier New', monospace", marginTop: 3 }}>{rev.date}</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {RATINGS.slice(0,3).map(r => { const v=rev.ratings[r.key]||0; const col=v>=8?"#F0A500":v>=5?"#F4C542":"#E74C3C"; return <div key={r.key} style={{color:col,fontFamily:"'Courier New',monospace",fontWeight:"bold",fontSize:14}}>{v}</div>; })}
              <span style={{ color:"#666666", marginLeft:4 }}>{expanded===idx?"▴":"▾"}</span>
            </div>
          </div>
          {expanded === idx && (
            <div style={{ padding: "0 16px 16px", borderTop: "1px solid #2E2E2E", paddingTop: 14 }}>
              {RATINGS.map(r => { const v=rev.ratings[r.key]||0; const col=v>=8?"#F0A500":v>=5?"#F4C542":"#E74C3C"; return <div key={r.key} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:"#9A9A9A",fontSize:12,fontFamily:"'Courier New',monospace"}}>{r.key}</span><span style={{color:col,fontFamily:"'Courier New',monospace",fontWeight:"bold",fontSize:12}}>{v}</span></div>; })}
              {rev.went_well?.length > 0 && <div style={{ marginTop:12, borderLeft:"2px solid #F0A500", paddingLeft:12 }}><div style={{ color:"#F0A500", fontFamily:"'Courier New', monospace", fontSize:9, letterSpacing:2, marginBottom:4 }}>✓ WENT WELL</div><div style={{ color:"#CCCCCC", fontSize:12, fontFamily:"Georgia, serif" }}>{rev.went_well.join(" · ")}</div></div>}
              {rev.development?.length > 0 && <div style={{ marginTop:12, borderLeft:"2px solid #3498DB", paddingLeft:12 }}><div style={{ color:"#3498DB", fontFamily:"'Courier New', monospace", fontSize:9, letterSpacing:2, marginBottom:4 }}>△ DEVELOPMENT</div><div style={{ color:"#CCCCCC", fontSize:12, fontFamily:"Georgia, serif" }}>{rev.development.join(" · ")}</div></div>}
              {rev.action?.will_change && <div style={{ marginTop:12, borderLeft:"2px solid #E74C3C", paddingLeft:12 }}><div style={{ color:"#E74C3C", fontFamily:"'Courier New', monospace", fontSize:9, letterSpacing:2, marginBottom:4 }}>→ WILL CHANGE</div><div style={{ color:"#CCCCCC", fontSize:13, fontFamily:"Georgia, serif" }}>{rev.action.will_change}</div></div>}
              <button onClick={() => onDelete(idx)} style={{ marginTop:12, padding:"8px 14px", background:"transparent", border:"1px solid #3D3D3D", borderRadius:8, color:"#9A9A9A", fontFamily:"'Courier New', monospace", fontSize:10, cursor:"pointer", letterSpacing:1 }}>DELETE</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [step, setStep] = useState(0);
  const [info, setInfo] = useState({ name: "", opposition: "" });
  const [ratings, setRatings] = useState({});
  const [wentWell, setWentWell] = useState([]);
  const [development, setDevelopment] = useState([]);
  const [action, setAction] = useState({ keep_doing: "", will_change: "", how_when: "" });
  const [animDir, setAnimDir] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [savedName, setSavedName] = useState("");

  useEffect(() => { const s = loadReviews(); setReviews(s); if (s.length > 0) setSavedName(s[0].name || ""); }, []);

  const goStep = (n) => { setAnimDir(n > step ? 1 : -1); setStep(n); };

  const canProceed = () => {
    if (step === 0) return info.name.trim() && info.opposition.trim();
    if (step === 1) return RATINGS.every(r => (ratings[r.key] || 0) > 0);
    if (step === 2) return wentWell.length > 0;
    if (step === 3) return development.length > 0;
    if (step === 4) return action.keep_doing.trim().length > 0 && action.will_change.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step === 4) {
      const date = new Date().toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
      const review = { name: info.name, opposition: info.opposition, date, ratings, went_well: wentWell, development, action };
      saveReview(review);
      setReviews(loadReviews());
      setSavedName(info.name);
      logCompletion(info.name, info.opposition, date);
    }
    goStep(step + 1);
  };

  const handleBack = () => {
    if (step === 0) { setScreen("home"); return; }
    goStep(step - 1);
  };

  const startNew = () => {
    setStep(0);
    setInfo({ name: savedName, opposition: "" });
    setRatings({}); setWentWell([]); setDevelopment([]);
    setAction({ keep_doing: "", will_change: "", how_when: "" });
    setScreen("review");
  };

  const toggleItem = (list, setList, item) => setList(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);

  const Header = () => (
    <div style={{ background: "#1A1A1A", borderBottom: "2px solid #F0A500", padding: "10px 20px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ color: "#F0A500", fontSize: 12, fontFamily: "'Courier New', monospace", letterSpacing: 3, marginBottom: 2 }}>CONOR QUINLAN</div>
        <div style={{ color: "#F0F0F0", fontFamily: "'Courier New', monospace", fontWeight: "bold", fontSize: 15, letterSpacing: 1 }}>COACH REFLECTION</div>
      </div>
      <img src={CQ_LOGO} alt="CQ" style={{ height: 44, width: "auto", opacity: 0.9 }} />
    </div>
  );

  if (screen === "sp") return <div style={{ minHeight:"100vh", background:"#1A1A1A" }}><style>{`* { box-sizing: border-box; }`}</style><Header /><SPDashboard onBack={() => setScreen("home")} /></div>;

  if (screen === "home") return (
    <div style={{ background:"#1A1A1A" }}>
      <style>{`* { box-sizing: border-box; -webkit-overflow-scrolling: touch; } body { overflow-y: auto !important; background: #1A1A1A; } button:active { opacity: 0.8; }`}</style>
      <div style={{ position:"relative", width:"100%", height:320, overflow:"hidden" }}>
        <img src="/hero.jpg" alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 40%", display:"block" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, #1A1A1A 70%)" }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 22px 20px", zIndex:2 }}>
          <div style={{ marginBottom:14 }}>
            <div style={{ color:"#F0A500", fontSize:12, fontFamily:"'Courier New', monospace", letterSpacing:3, marginBottom:2 }}>CONOR QUINLAN</div>
            <div style={{ color:"#F0F0F0", fontFamily:"'Courier New', monospace", fontWeight:"bold", fontSize:15, letterSpacing:1 }}>COACH REFLECTION</div>
          </div>
          <div style={{ color:"#F0F0F0", fontFamily:"Georgia, serif", fontWeight:"bold", fontSize:26, marginBottom:4 }}>Time to reflect.</div>
          <div style={{ color:"rgba(255,255,255,0.65)", fontSize:14, fontFamily:"Georgia, serif", lineHeight:1.5 }}>Honest reflection. Better coaching.</div>
        </div>
      </div>
      <div style={{ padding:"24px 22px 20px", maxWidth:500, margin:"0 auto", width:"100%" }}>
        <button onClick={startNew} style={{ width:"100%", padding:18, background:"#F0A500", border:"none", borderRadius:12, color:"#111111", fontFamily:"'Courier New', monospace", fontWeight:"bold", fontSize:14, cursor:"pointer", letterSpacing:2, marginBottom:12 }}>START REFLECTION →</button>
        <button onClick={() => setScreen("history")} style={{ width:"100%", padding:16, background:"transparent", border:"1.5px solid #2E2E2E", borderRadius:12, color: reviews.length > 0 ? "#CCCCCC" : "#666666", fontFamily:"'Courier New', monospace", fontSize:14, cursor:"pointer", letterSpacing:1, display:"flex", justifyContent:"center", alignItems:"center", gap:10, marginBottom:12 }}>
          <span>MY REVIEWS</span>
          {reviews.length > 0 && <span style={{ background:"#2E2E2E", color:"#F0A500", borderRadius:20, padding:"2px 10px", fontSize:11 }}>{reviews.length}</span>}
        </button>
        <button onClick={() => setScreen("sp")} style={{ width:"100%", padding:12, background:"transparent", border:"none", borderRadius:12, color:"#3D3D3D", fontFamily:"'Courier New', monospace", fontSize:12, cursor:"pointer", letterSpacing:2, marginTop:8 }}>SPORT PSYCHOLOGIST ACCESS</button>
        {reviews.length > 0 && (
          <div style={{ marginTop:24 }}>
            <div style={{ color:"#9A9A9A", fontFamily:"'Courier New', monospace", fontSize:12, letterSpacing:2, marginBottom:14 }}>LAST 3 GAMES</div>
            {reviews.slice(0,3).map((rev,i) => (
              <div key={i} style={{ background:"#242424", borderRadius:10, padding:"12px 14px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ color:"#F0F0F0", fontSize:13, fontFamily:"Georgia, serif" }}>vs {rev.opposition}</div>
                  <div style={{ color:"#666666", fontSize:11, fontFamily:"'Courier New', monospace", marginTop:2 }}>{rev.date}</div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {RATINGS.slice(0,3).map(r => { const v=rev.ratings[r.key]||0; const col=v>=8?"#F0A500":v>=5?"#F4C542":"#E74C3C"; return <div key={r.key} style={{textAlign:"center"}}><div style={{color:col,fontFamily:"'Courier New',monospace",fontWeight:"bold",fontSize:15}}>{v}</div><div style={{color:"#666666",fontSize:8,fontFamily:"'Courier New',monospace"}}>{r.key.slice(0,3).toUpperCase()}</div></div>; })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", justifyContent:"center", paddingTop:32, paddingBottom:24 }}>
          <img src={CQ_LOGO} alt="CQ" style={{ height:66, width:"auto", opacity:0.7 }} />
        </div>
      </div>
    </div>
  );

  if (screen === "history") return (
    <div style={{ minHeight:"100vh", background:"#1A1A1A" }}>
      <style>{`* { box-sizing: border-box; }`}</style>
      <Header />
      <div style={{ padding:"20px 22px 40px", maxWidth:500, margin:"0 auto" }}>
        <HistoryView reviews={reviews} onBack={() => setScreen("home")} onDelete={(idx) => { const u = reviews.filter((_,i)=>i!==idx); localStorage.setItem(STORAGE_KEY,JSON.stringify(u)); setReviews(u); }} />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#1A1A1A", display:"flex", flexDirection:"column" }}>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(${animDir*20}px); } to { opacity:1; transform:translateX(0); } } .slide { animation: slideIn 0.22s ease; } textarea::placeholder, input::placeholder { color: #3D3D3D; } * { box-sizing: border-box; -webkit-overflow-scrolling: touch; } body { overflow-y: auto !important; } button:active { opacity: 0.85; }`}</style>
      <Header />
      <div style={{ flex:1, padding:"0 22px", paddingBottom: step === 5 ? 24 : 110, maxWidth:500, margin:"0 auto", width:"100%", display: step === 5 ? "flex" : undefined, flexDirection:"column" }}>
        {step < TOTAL_STEPS && <ProgressBar step={step} />}
        <div className="slide" key={`${step}-view`} style={step === 5 ? {flex:1, display:"flex", flexDirection:"column"} : undefined}>

          {step === 0 && (
            <div>
              <div style={{ color:"#F0F0F0", fontFamily:"Georgia, serif", fontWeight:"bold", fontSize:24, marginBottom:6 }}>Let's reflect.</div>
              <div style={{ color:"#9A9A9A", fontSize:14, marginBottom:30, fontFamily:"Georgia, serif" }}>Honest answers. Better coaching.</div>
              {[{key:"name",label:"YOUR NAME",placeholder:"Enter your name"},{key:"opposition",label:"OPPOSITION",placeholder:"Opposition team name (e.g. Na Piarsaigh)"}].map(f => (
                <div key={f.key} style={{ marginBottom:20 }}>
                  <div style={{ color:"#9A9A9A", fontSize:12, fontFamily:"'Courier New', monospace", letterSpacing:2, marginBottom:8 }}>{f.label}</div>
                  <input value={info[f.key]} onChange={e=>setInfo(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
                    style={{ width:"100%", background:"#2E2E2E", border:"1.5px solid #3D3D3D", borderRadius:10, color:"#F0F0F0", padding:"14px 16px", fontSize:16, fontFamily:"Georgia, serif", outline:"none" }}
                    onFocus={e=>e.target.style.borderColor="#F0A500"} onBlur={e=>e.target.style.borderColor="#2E2E2E"} />
                </div>
              ))}
              <div style={{ background:"#242424", borderRadius:10, padding:"10px 14px", border:"1px solid #2E2E2E" }}>
                <div style={{ color:"#666666", fontSize:13, fontFamily:"Georgia, serif", lineHeight:1.5 }}>🔒 Answers stay private. Only your sport psychologist can see who completes their reflection.</div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ color:"#F0F0F0", fontSize:22, fontFamily:"Georgia, serif", fontWeight:"bold", marginBottom:6 }}>Rate yourself.</div>
              <div style={{ color:"#9A9A9A", fontSize:14, marginBottom:26, fontFamily:"Georgia, serif" }}>Honest scores only — 1 poor, 10 outstanding.</div>
              {RATINGS.map(r => <RatingRow key={r.key} label={r.key} desc={r.desc} value={ratings[r.key]||0} onChange={v=>setRatings(p=>({...p,[r.key]:v}))} />)}
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}><span style={{fontSize:20,color:"#F0A500"}}>✓</span><span style={{color:"#F0A500",fontFamily:"'Courier New', monospace",fontWeight:"bold",fontSize:11,letterSpacing:2}}>WENT WELL</span></div>
              <div style={{ color:"#F0F0F0", fontSize:22, fontFamily:"Georgia, serif", fontWeight:"bold", marginBottom:8 }}>What went well today?</div>
              <div style={{ color:"#9A9A9A", fontSize:13, fontFamily:"Georgia, serif", marginBottom:20 }}>Select all that apply.</div>
              <ChipSelector items={WENT_WELL_PROMPTS} selected={wentWell} onToggle={(d) => toggleItem(wentWell, setWentWell, d)} color="#F0A500" />
              <SelectedSummary items={wentWell} color="#F0A500" bg="#2A1F00" />
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}><span style={{fontSize:20,color:"#3498DB"}}>△</span><span style={{color:"#3498DB",fontFamily:"'Courier New', monospace",fontWeight:"bold",fontSize:11,letterSpacing:2}}>DEVELOPMENT</span></div>
              <div style={{ color:"#F0F0F0", fontSize:22, fontFamily:"Georgia, serif", fontWeight:"bold", marginBottom:8 }}>What needs work?</div>
              <div style={{ color:"#9A9A9A", fontSize:13, fontFamily:"Georgia, serif", marginBottom:20 }}>Select all that apply.</div>
              <ChipSelector items={DEVELOPMENT_PROMPTS} selected={development} onToggle={(d) => toggleItem(development, setDevelopment, d)} color="#3498DB" />
              <SelectedSummary items={development} color="#3498DB" bg="#0D0D1A" />
            </div>
          )}

          {step === 4 && (
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}><span style={{fontSize:20,color:"#E74C3C"}}>▶</span><span style={{color:"#E74C3C",fontFamily:"'Courier New', monospace",fontWeight:"bold",fontSize:11,letterSpacing:2}}>ACTION PLAN</span></div>
              <div style={{ color:"#F0F0F0", fontSize:22, fontFamily:"Georgia, serif", fontWeight:"bold", marginBottom:24 }}>What will you do about it?</div>
              <div style={{ background:"#242424", borderRadius:12, padding:"16px", border:"1px solid #2E2E2E" }}>
                {[
                  {key:"keep_doing", label:"✓ KEEP DOING", sub:"What must you maintain?", ph:"e.g. Clear pre-match message, positive body language..."},
                  {key:"will_change", label:"→ WILL CHANGE", sub:"What will you work on?", ph:"e.g. Composure on the sideline, communication at half-time..."},
                  {key:"how_when", label:"◆ HOW & WHEN", sub:"How and when will you work on it?", ph:"e.g. Review this with management team or sport psychologist at next session..."}
                ].map(f => (
                  <div key={f.key} style={{ marginBottom:18 }}>
                    <div style={{ marginBottom:6 }}>
                      <span style={{ color:"#F0F0F0", fontFamily:"'Courier New', monospace", fontWeight:"bold", fontSize:11, letterSpacing:1 }}>{f.label}</span>
                      <div style={{ color:"#666666", fontSize:11, fontFamily:"Georgia, serif", marginTop:2, fontStyle:"italic" }}>{f.sub}</div>
                    </div>
                    <textarea rows={2} value={action[f.key]} onChange={e=>setAction(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph}
                      style={{ width:"100%", background:"#2E2E2E", border:"1.5px solid #3D3D3D", borderRadius:10, color:"#F0F0F0", padding:"12px 14px", fontSize:13, fontFamily:"Georgia, serif", outline:"none", resize:"none", lineHeight:1.6 }}
                      onFocus={e=>e.target.style.borderColor="#E74C3C"} onBlur={e=>e.target.style.borderColor="#2E2E2E"} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center" }}>
              <div style={{ textAlign:"center", marginBottom:28 }}>
                <div style={{ fontSize:52, marginBottom:12, color:"#F0A500", lineHeight:1 }}>✓</div>
                <div style={{ color:"#F0A500", fontFamily:"'Courier New', monospace", fontWeight:"bold", fontSize:34, letterSpacing:3, lineHeight:1.15 }}>DONE, {info.name.split(" ")[0].toUpperCase()}.</div>
                <div style={{ color:"#666666", fontSize:12, marginTop:10, fontFamily:"'Courier New', monospace", letterSpacing:1.5 }}>vs {info.opposition} · saved to your reviews</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
                {RATINGS.map(r => {
                  const v = ratings[r.key] || 0;
                  const col = v>=8?"#F0A500":v>=5?"#F4C542":"#E74C3C";
                  const label = r.key === "Tactical Setup" ? "TACTICAL" : r.key.toUpperCase();
                  return (
                    <div key={r.key} style={{background:"#0A1520", borderRadius:14, padding:"20px 12px 16px", textAlign:"center", border:"1.5px solid #F0A500"}}>
                      <div style={{color:col, fontFamily:"'Courier New',monospace", fontWeight:"bold", fontSize:48, lineHeight:1}}>{v}</div>
                      <div style={{color:"#AAAAAA", fontSize:10, marginTop:10, fontFamily:"'Courier New',monospace", letterSpacing:1, whiteSpace:"nowrap"}}>{label}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setScreen("history")} style={{ flex:1, padding:15, background:"transparent", border:"1.5px solid #2E2E2E", borderRadius:10, color:"#CCCCCC", fontFamily:"'Courier New', monospace", fontSize:11, cursor:"pointer", letterSpacing:1 }}>MY REVIEWS</button>
                <button onClick={() => setScreen("home")} style={{ flex:1, padding:15, background:"#F0A500", border:"none", borderRadius:10, color:"#111111", fontFamily:"'Courier New', monospace", fontWeight:"bold", fontSize:11, cursor:"pointer", letterSpacing:1 }}>HOME</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {step < TOTAL_STEPS && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#1A1A1A", borderTop:"1px solid #2E2E2E", padding:"14px 22px", display:"flex", gap:10 }}>
          <button onClick={handleBack} style={{ flex:1, padding:14, background:"transparent", border:"1px solid #2E2E2E", borderRadius:10, color:"#9A9A9A", fontFamily:"'Courier New', monospace", fontSize:13, cursor:"pointer" }}>← Back</button>
          <button onClick={handleNext} disabled={!canProceed()} style={{ flex:2, padding:14, background:canProceed()?"#F0A500":"#2E2E2E", border:"none", borderRadius:10, color:canProceed()?"#111111":"#666666", fontFamily:"'Courier New', monospace", fontWeight:"bold", fontSize:13, cursor:canProceed()?"pointer":"not-allowed", letterSpacing:1, transition:"all 0.2s ease" }}>
            {step === 4 ? "See My Review →" : step === 0 ? "Start →" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}
