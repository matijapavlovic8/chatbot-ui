import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000";
const userId = "1";

function SourcesPopup({ sources }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="absolute right-2 bottom-2 z-10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-br from-accent to-accent-secondary text-white rounded-full px-3 py-1 text-xs font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
      >
        📚 {sources.length}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-gradient-to-br from-gray-900 to-gray-800 border border-accent rounded-lg p-4 min-w-[280px] max-w-[360px] shadow-2xl backdrop-blur-lg">
          <div className="text-primary-500 text-sm font-bold mb-3 tracking-wide">📖 Izvori</div>
          <div className="max-h-52 overflow-y-auto">
            {sources.map((source, idx) => (
              <div
                key={idx}
                className="text-gray-200 text-xs p-2 mb-1 rounded-md bg-primary-500/10 border border-primary-500/20 leading-snug"
              >
                <span className="text-primary-500 font-semibold">#{idx + 1}</span> {source}
              </div>
            ))}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 bg-red-600/20 border border-red-600 w-6 h-6 text-red-600 rounded-full flex items-center justify-center text-xs transition-all duration-200 hover:bg-red-600 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [sessionMessagesMap, setSessionMessagesMap] = useState({});
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchSessions() {
    try {
      const res = await fetch(`${API_BASE}/user_sessions/${userId}`);
      const data = await res.json();
      setSessions(data);

      const map = {};
      await Promise.all(
        data.map(async (s) => {
          try {
            const resMsgs = await fetch(`${API_BASE}/session_messages/${s.session_id}`);
            const msgs = await resMsgs.json();
            map[s.session_id] = Array.isArray(msgs) ? msgs : [];
          } catch {
            map[s.session_id] = [];
          }
        })
      );
      setSessionMessagesMap(map);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  }

  async function createNewSession() {
    try {
      const res = await fetch(`${API_BASE}/create_new_session?user_id=${userId}`, { method: "POST" });
      const data = await res.json();
      await fetchSessions();
      setCurrentSessionId(data.session_id);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create session", err);
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    if (!currentSessionId) await createNewSession();

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, session_id: currentSessionId, query: input }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { sender: "user", message: input },
        { sender: "bot", message: data.response, sources: data.sources || [] },
      ]);
      setInput("");
    } catch (err) {
      console.error("Failed to send message", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      const msgs = sessionMessagesMap[currentSessionId] || [];
      setMessages(msgs);
    }
  }, [currentSessionId, sessionMessagesMap]);

  function getSessionPreview(session) {
    const msgs = sessionMessagesMap[session.session_id] || [];
    const userMsg = msgs.find((m) => m.sender === "user" && m.message);
    if (userMsg) return userMsg.message.split(/\s+/).slice(0, 3).join(" ");
    return "Novi razgovor";
  }

  return (
    <div className="flex h-screen font-inter bg-black text-gray-200">
      <aside className="w-80 border-r border-gray-800 p-5 bg-gradient-to-b from-gray-900 to-black">
        <h2 className="text-primary-500 text-lg font-bold mb-5 tracking-wide">💬 Razgovori</h2>
        <button
          onClick={createNewSession}
          className="w-full mb-5 py-3 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-black font-bold shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl"
        >
          ✨ Novi razgovor
        </button>
        <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
          {sessions.length === 0 && <p className="text-gray-500 italic text-center py-5">Nema razgovora</p>}
          {sessions.map((s) => (
            <button
              key={s.session_id}
              onClick={() => setCurrentSessionId(s.session_id)}
              className={`p-4 rounded-xl border transition-colors hover:bg-white/5 ${
                s.session_id === currentSessionId ? 'bg-gradient-to-br from-accent/30 to-accent-secondary/20 border-accent' : 'border-accent/20'
              }`}
            >
              <div className="font-semibold mb-1">{getSessionPreview(s)}</div>
              <small className="text-gray-500 text-xs">{new Date(s.first_message_timestamp).toLocaleString()}</small>
            </button>
          ))}
        </div>
      </aside>
      <main className="flex-1 flex flex-col p-6 bg-gradient-to-br from-black to-[#1a001a]">
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-600 italic text-base py-10">
              {currentSessionId ? '🚀 Pošalji poruku za početak razgovora' : '📝 Odaberi ili kreiraj razgovor'}
            </div>
          ) : (
            messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`relative max-w-[75%] rounded-xl p-4 shadow-md ${m.sender === 'user' ? 'bg-accent text-black' : 'bg-gray-800 text-white'}`}>
                  <div>{m.message}</div>
                  {m.sources && m.sources.length > 0 && <SourcesPopup sources={m.sources} />}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-6 flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 rounded-xl px-4 py-3 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Upiši poruku..."
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            className="ml-4 px-6 py-3 rounded-xl bg-accent text-black font-bold transition-transform hover:-translate-y-0.5 hover:shadow-xl"
            disabled={loading}
          >
            {loading ? '⏳' : '📨'}
          </button>
        </div>
      </main>
    </div>
  );
}
