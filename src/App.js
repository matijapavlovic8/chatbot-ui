import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000"; // prilagodi ako treba
const userId = "1";

// Sources popup component
function SourcesPopup({ sources }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "absolute",
          bottom: "-8px",
          right: "8px",
          background: "#333",
          color: "#fff",
          border: "none",
          borderRadius: "12px",
          padding: "4px 8px",
          fontSize: "10px",
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        📚 {sources.length}
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "0",
            background: "#222",
            border: "1px solid #444",
            borderRadius: "8px",
            padding: "8px",
            minWidth: "200px",
            maxWidth: "300px",
            zIndex: 20,
            boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ color: "#fff", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>
            Izvori:
          </div>
          {sources.map((source, idx) => (
            <div
              key={idx}
              style={{
                color: "#ccc",
                fontSize: "11px",
                padding: "2px 0",
                borderBottom: idx < sources.length - 1 ? "1px solid #444" : "none",
              }}
            >
              {source}
            </div>
          ))}
          <button
            onClick={() => setIsOpen(false)}
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              background: "none",
              border: "none",
              color: "#999",
              cursor: "pointer",
              fontSize: "12px",
            }}
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
  const [sessionMessagesMap, setSessionMessagesMap] = useState({}); // nova mapa session_id -> poruke
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchSessions() {
    try {
      const res = await fetch(`${API_BASE}/user_sessions/${userId}`);
      const data = await res.json();
      setSessions(data);

      // Za svaku sesiju dohvatimo poruke i spremimo u mapu
      const map = {};
      await Promise.all(
        data.map(async (s) => {
          try {
            const res = await fetch(`${API_BASE}/session_messages/${s.session_id}`);
            const msgs = await res.json();
            map[s.session_id] = msgs;
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
      const res = await fetch(`${API_BASE}/create_new_session?user_id=${userId}`, {
        method: "POST",
      });
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
    if (!currentSessionId) {
      await createNewSession();
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          session_id: currentSessionId,
          query: input,
        }),
      });
      const data = await res.json();

      setMessages((msgs) => [
        ...msgs,
        { sender: "user", message: input },
        { sender: "bot", message: data.response, sources: data.sources || [] },
      ]);
      setInput("");
    } catch (err) {
      console.error("Failed to send message", err);
    }
    setLoading(false);
  }

  // Prilikom promjene sesije učitaj poruke iz mape ako postoji
  useEffect(() => {
    if (currentSessionId && sessionMessagesMap[currentSessionId]) {
      setMessages(sessionMessagesMap[currentSessionId]);
    } else {
      setMessages([]);
    }
  }, [currentSessionId, sessionMessagesMap]);

  useEffect(() => {
    fetchSessions();
  }, []);

  // Funkcija za dobivanje preview teksta iz druge korisničke poruke
  function getSessionPreview(sessionId) {
    const msgs = sessionMessagesMap[sessionId];
    if (!msgs || msgs.length < 2) return "Novi razgovor";

    // Prva je uvijek initialization - uzmemo drugu korisničku poruku
    // Nađemo prvu poruku koju je poslao user nakon initialization
    for (let i = 1; i < msgs.length; i++) {
      if (msgs[i].sender === "user" && msgs[i].message) {
        // Izvući nekoliko riječi (recimo 3 riječi)
        const words = msgs[i].message.split(/\s+/).slice(0, 3).join(" ");
        return words.length > 0 ? words : "Novi razgovor";
      }
    }
    return "Novi razgovor";
  }

  const styles = {
    app: {
      height: "100vh",
      display: "flex",
      backgroundColor: "#121212",
      fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
    },
    sidebar: {
      width: 280,
      borderRight: "1px solid #333",
      padding: 16,
      boxSizing: "border-box",
      backgroundColor: "#1e1e1e",
    },
    newSessionBtn: {
      width: "100%",
      padding: "8px 12px",
      marginBottom: 12,
      borderRadius: 4,
      border: "none",
      backgroundColor: "#0b5",
      color: "#000",
      cursor: "pointer",
      fontWeight: "bold",
    },
    sessionsList: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      maxHeight: "70vh",
      overflowY: "auto",
    },
    sessionBtn: {
      padding: "10px",
      borderRadius: 6,
      border: "none",
      color: "#eee",
      cursor: "pointer",
      textAlign: "left",
      fontSize: 14,
      lineHeight: 1.2,
    },
    chatArea: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: 16,
    },
    messages: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      paddingBottom: 16,
      overflowY: "auto",
    },
    message: {
      maxWidth: "70%",
      padding: "10px 14px",
      borderRadius: 12,
      wordBreak: "break-word",
    },
    inputArea: {
      display: "flex",
      gap: 8,
    },
    input: {
      flex: 1,
      padding: "10px 14px",
      borderRadius: 8,
      border: "none",
      fontSize: 16,
      outline: "none",
    },
    sendBtn: {
      backgroundColor: "#0b5",
      border: "none",
      borderRadius: 8,
      padding: "10px 18px",
      fontWeight: "bold",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <h2 style={{ color: "#fff" }}>Razgovori</h2>
        <button style={styles.newSessionBtn} onClick={createNewSession}>
          + Novi razgovor
        </button>
        <div style={styles.sessionsList}>
          {sessions.length === 0 && <p style={{ color: "#aaa" }}>Nema razgovora</p>}
          {sessions.map((s) => (
            <button
              key={s.session_id}
              style={{
                ...styles.sessionBtn,
                backgroundColor: s.session_id === currentSessionId ? "#444" : "#222",
              }}
              onClick={() => setCurrentSessionId(s.session_id)}
            >
              {/* Prikaz preview teksta umjesto session_id */}
              {getSessionPreview(s.session_id)}
              <br />
              <small style={{ color: "#888" }}>
                {new Date(s.first_message_timestamp).toLocaleString()}
              </small>
            </button>
          ))}
        </div>
      </div>

      {/* ostatak koda ostaje isti */}
      <div style={styles.chatArea}>
        <div style={styles.messages}>
          {messages.length === 0 && (
            <p style={{ color: "#888", fontStyle: "italic" }}>
              {currentSessionId ? "Pošalji poruku za početak razgovora" : "Odaberi ili kreiraj razgovor"}
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                ...styles.message,
                alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                backgroundColor: m.sender === "user" ? "#0b5" : "#556",
                color: m.sender === "user" ? "#000" : "#eee",
                position: "relative",
              }}
            >
              {m.message}
              {m.sender === "bot" && m.sources && m.sources.length > 0 && (
                <SourcesPopup sources={m.sources} />
              )}
            </div>
          ))}
        </div>
        <div style={styles.inputArea}>
          <input
            style={styles.input}
            type="text"
            placeholder="Napiši poruku..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            style={{
              ...styles.sendBtn,
              opacity: loading || !input.trim() ? 0.5 : 1,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            }}
            disabled={loading || !input.trim()}
          >
            Pošalji
          </button>
        </div>
      </div>
    </div>
  );
}