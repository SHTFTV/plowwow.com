import { useState, useRef, useEffect } from "react";

const MascotImage = () => (
  <img
    src="/wow-mascot.png"
    alt=""
    aria-hidden="true"
    className="h-full w-full object-contain"
  />
);

const SYSTEM_PROMPT = `You are PlowWow Bot, the friendly AI snow removal assistant for PlowWow.com.
You help homeowners and businesses with snow removal quotes, scheduling, services info, and general questions.
Keep responses short, warm, and helpful. Use occasional snow/winter emojis ❄️🌨️⛄.
Always encourage users to get a free quote when relevant.
PlowWow offers: residential driveway plowing from $49/visit, commercial lot clearing, sidewalk salting, roof snow removal, and seasonal contracts.
Respond in 2-3 sentences max unless more detail is needed.`;

export default function PlowWowBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hey there! 👋\nI'm PlowWow Bot! I can help you with quotes, scheduling, services, and more.\n\nHow can I help you today?",
      first: true,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) {
      setHasNew(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [open, messages]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);
    const normalized = userText.toLowerCase();
    let reply =
      "I can help with services, pricing, service areas, or a free quote. For the fastest help, call 604-761-1518 or email wow@plowwow.com. ❄️";

    if (normalized.includes("price") || normalized.includes("cost") || normalized.includes("much")) {
      reply =
        "Residential driveway plowing starts from $49 per visit. Commercial, strata, salting, and seasonal pricing depends on the property—tap the quote option and we’ll prepare the right plan. ❄️";
    } else if (normalized.includes("service") || normalized.includes("offer")) {
      reply =
        "We provide driveway and parking-lot plowing, walkway clearing, salting and de-icing, roof snow removal, and seasonal contracts. We also support strata and commercial properties.";
    } else if (normalized.includes("quote") || normalized.includes("address")) {
      reply =
        "Great—email wow@plowwow.com with the property address and service needed, or call 604-761-1518 for a fast quote. We’ll confirm coverage and next steps.";
    } else if (normalized.includes("how") || normalized.includes("work")) {
      reply =
        "Tell us your address and the service you need, and we’ll confirm coverage, timing, and pricing. For urgent help, call 604-761-1518.";
    } else if (normalized.includes("strata") || normalized.includes("commercial")) {
      reply =
        "Yes—we support strata and commercial sites with proactive plowing, walkways, de-icing, storm monitoring, and seasonal service plans. Email wow@plowwow.com for a property review.";
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
    setMessages([...newMessages, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  const quickActions = [
    { label: "❄️ Services", msg: "What snow removal services do you offer?" },
    { label: "🏷️ Pricing", msg: "How much does snow removal cost?" },
    { label: "ℹ️ How It Works", msg: "How does PlowWow work?" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .pwb * { box-sizing: border-box; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
        .pwb-launcher { position: fixed; bottom: 24px; right: 24px; z-index: 9999; width: 64px; height: 64px; border-radius: 50%; border: none; cursor: pointer; padding: 4px; background: white; box-shadow: 0 4px 20px rgba(0,114,206,0.25), 0 2px 8px rgba(0,0,0,0.15); transition: transform 0.2s, box-shadow 0.2s; }
        .pwb-launcher:hover { transform: scale(1.08); box-shadow: 0 8px 28px rgba(0,114,206,0.35), 0 4px 12px rgba(0,0,0,0.2); }
        .pwb-badge { position: absolute; top: 0; right: 0; background: #e53e3e; color: white; font-size: 11px; font-weight: 700; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; }
        .pwb-window { position: fixed; bottom: 100px; right: 24px; z-index: 9998; width: 360px; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.15); display: flex; flex-direction: column; background: white; animation: pwb-up 0.25s ease; max-height: 580px; }
        @keyframes pwb-up { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .pwb-header { background: linear-gradient(135deg, #1a4fbd 0%, #0d3a96 50%, #1a2f7a 100%); padding: 14px 16px; display: flex; align-items: center; gap: 10px; border-bottom: 3px solid #F5A623; position: relative; overflow: hidden; flex-shrink: 0; }
        .pwb-header::before { content: '❄'; position: absolute; right: -8px; bottom: -12px; font-size: 72px; opacity: 0.07; color: white; pointer-events: none; }
        .pwb-av-wrap { position: relative; flex-shrink: 0; }
        .pwb-av { width: 48px; height: 48px; border-radius: 14px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); padding: 3px; overflow: hidden; }
        .pwb-ping { position: absolute; top: -3px; right: -3px; width: 13px; height: 13px; }
        .pwb-ping-ring { position: absolute; inset: 0; background: #22c55e; border-radius: 50%; opacity: 0.6; animation: pwb-ping 1.5s cubic-bezier(0,0,0.2,1) infinite; }
        .pwb-ping-dot { position: absolute; inset: 2px; background: #22c55e; border-radius: 50%; border: 2px solid #1a4fbd; }
        @keyframes pwb-ping { 75%,100% { transform: scale(2); opacity: 0; } }
        .pwb-hname { color: white; font-size: 15px; font-weight: 700; }
        .pwb-hsub { color: rgba(255,255,255,0.75); font-size: 10.5px; margin-top: 2px; }
        .pwb-hbtns { margin-left: auto; display: flex; gap: 2px; }
        .pwb-hbtn { background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; padding: 5px; border-radius: 8px; font-size: 15px; }
        .pwb-hbtn:hover { background: rgba(255,255,255,0.12); }
        .pwb-msgs { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; min-height: 0; }
        .pwb-msgs::-webkit-scrollbar { width: 3px; }
        .pwb-msgs::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 3px; }
        .pwb-row { display: flex; align-items: flex-end; gap: 7px; }
        .pwb-row.user { flex-direction: row-reverse; }
        .pwb-mav { width: 26px; height: 26px; flex-shrink: 0; border-radius: 50%; background: white; border: 1.5px solid #bfdbfe; padding: 2px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
        .pwb-bubble { max-width: 80%; padding: 9px 13px; border-radius: 18px; font-size: 13px; line-height: 1.55; white-space: pre-wrap; }
        .pwb-bubble.bot { background: white; color: #1e293b; border-bottom-left-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .pwb-bubble.ice { background: #EFF8FF; color: #1e293b; border-bottom-left-radius: 4px; border: 1px solid #BAE6FD; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
        .pwb-bubble.user { background: #1a4fbd; color: white; border-bottom-right-radius: 4px; box-shadow: 0 2px 8px rgba(26,79,189,0.3); }
        .pwb-cta { margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 14px; background: #F5A623; color: #1a1a1a; border: none; border-radius: 12px; font-size: 12.5px; font-weight: 700; cursor: pointer; width: 100%; transition: background 0.15s, transform 0.1s; box-shadow: 0 3px 10px rgba(245,166,35,0.4); }
        .pwb-cta:hover { background: #e8971a; transform: translateY(-1px); }
        .pwb-cta:active { transform: scale(0.97); }
        .pwb-typing { display: flex; gap: 4px; padding: 10px 13px; background: white; border-radius: 18px; border-bottom-left-radius: 4px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.06); width: fit-content; }
        .pwb-dot { width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: pwb-bounce 1.2s infinite; }
        .pwb-dot:nth-child(2){animation-delay:.15s} .pwb-dot:nth-child(3){animation-delay:.3s}
        @keyframes pwb-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        .pwb-pills { padding: 8px 12px; background: white; border-top: 1px solid #f1f5f9; display: flex; gap: 6px; overflow-x: auto; flex-shrink: 0; }
        .pwb-pills::-webkit-scrollbar { display: none; }
        .pwb-pill { padding: 5px 11px; border-radius: 20px; background: #EFF6FF; color: #1d4ed8; border: 1.5px solid #bfdbfe; font-size: 11.5px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.15s; }
        .pwb-pill:hover { background: #1d4ed8; color: white; border-color: #1d4ed8; transform: translateY(-1px); box-shadow: 0 3px 8px rgba(29,78,216,0.25); }
        .pwb-inp-row { padding: 10px 12px; background: white; border-top: 1px solid #f1f5f9; display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
        .pwb-inp { flex: 1; background: #f1f5f9; border: 1.5px solid transparent; border-radius: 22px; padding: 8px 14px; font-size: 13px; outline: none; color: #1e293b; transition: all 0.15s; }
        .pwb-inp:focus { border-color: #3b82f6; background: white; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .pwb-inp::placeholder { color: #94a3b8; }
        .pwb-send { width: 36px; height: 36px; border-radius: 50%; background: #F5A623; border: none; cursor: pointer; color: white; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; box-shadow: 0 2px 8px rgba(245,166,35,0.4); }
        .pwb-send:hover { background: #e8971a; transform: scale(1.08); }
        .pwb-send:disabled { background: #e2e8f0; color: #94a3b8; box-shadow: none; transform: none; }
        .pwb-footer { padding: 5px 12px 8px; background: white; display: flex; justify-content: center; gap: 12px; flex-shrink: 0; }
        .pwb-footer span { font-size: 10px; color: #94a3b8; }
        @media (max-width: 420px) { .pwb-window { width: calc(100vw - 16px); right: 8px; bottom: 88px; } }
      `}</style>

      <div className="pwb">
        <button className="pwb-launcher" onClick={() => setOpen(!open)} aria-label="Open PlowWow Bot">
          <MascotImage />
          {hasNew && !open && <span className="pwb-badge">1</span>}
        </button>

        {open && (
          <div className="pwb-window">
            <div className="pwb-header">
              <div className="pwb-av-wrap">
                <div className="pwb-av"><MascotImage /></div>
                <div className="pwb-ping">
                  <div className="pwb-ping-ring" />
                  <div className="pwb-ping-dot" />
                </div>
              </div>
              <div>
                <div className="pwb-hname">PlowWow Bot</div>
                <div className="pwb-hsub">❄️ Your AI snow removal assistant · 24/7</div>
              </div>
              <div className="pwb-hbtns">
                <button className="pwb-hbtn" title="Mute">🔈</button>
                <button className="pwb-hbtn" title="More">⋮</button>
                <button className="pwb-hbtn" onClick={() => setOpen(false)} title="Close">—</button>
              </div>
            </div>

            <div className="pwb-msgs">
              {messages.map((m, i) => {
                const isBot = m.role === "assistant";
                const bubbleCls = isBot ? (m.first ? "bot" : "ice") : "user";
                return (
                  <div key={i} className={`pwb-row ${isBot ? "" : "user"}`}>
                    {isBot && <div className="pwb-mav"><MascotImage /></div>}
                    <div>
                      <div className={`pwb-bubble ${bubbleCls}`}>
                        {m.content}
                        {m.first && (
                          <button className="pwb-cta" onClick={() => sendMessage("I'd like a free quote")}>
                            📝 Get a Free Quote →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="pwb-row">
                  <div className="pwb-mav"><MascotImage /></div>
                  <div className="pwb-typing">
                    <div className="pwb-dot" /><div className="pwb-dot" /><div className="pwb-dot" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="pwb-pills">
              {quickActions.map((a) => (
                <button key={a.label} className="pwb-pill" onClick={() => sendMessage(a.msg)}>
                  {a.label}
                </button>
              ))}
            </div>

            <div className="pwb-inp-row">
              <input
                className="pwb-inp"
                placeholder="Type your address or message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
              />
              <button className="pwb-send" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                ➤
              </button>
            </div>

            <div className="pwb-footer">
              <span>⚡ Fast responses</span>
              <span>🔒 Info is secure</span>
              <span>💙 Always here</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
