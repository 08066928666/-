import React, { useCallback, useEffect, useState } from "react";
import { PropertyListPage } from "./dx/mobile/PropertyListPage.jsx";
import { PropertyDetailPage } from "./dx/mobile/PropertyDetailPage.jsx";
import { SimpleQuoteEditor } from "./dx/SimpleQuoteEditor.jsx";

const AUTH_KEY = "haseko-app-auth-v1";
const PROPERTIES_KEY = "haseko-properties-v2";
const QUOTE_PREFIX = "haseko-quote-v2-";

function loadProperties() {
  try {
    const raw = localStorage.getItem(PROPERTIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [
    {
      id: "p1",
      name: "アーデン清澄白河",
      address: "東京都江東区",
      rooms: [
        { id: "r1", roomNo: "307号室", status: "pending", updatedAt: null },
        { id: "r2", roomNo: "501号室", status: "pending", updatedAt: null }
      ]
    },
    {
      id: "p2",
      name: "エスティメゾン豊洲レジデンスA棟",
      address: "東京都江東区豊洲",
      rooms: [{ id: "r3", roomNo: "1415号室", status: "pending", updatedAt: null }]
    }
  ];
}

function saveProperties(props) {
  try {
    localStorage.setItem(PROPERTIES_KEY, JSON.stringify(props));
  } catch {
    /* ignore */
  }
}

function loadQuote(roomId) {
  try {
    const raw = localStorage.getItem(QUOTE_PREFIX + roomId);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function saveQuote(roomId, lines) {
  try {
    localStorage.setItem(QUOTE_PREFIX + roomId, JSON.stringify(lines));
  } catch {
    /* ignore */
  }
}

function calcLineQty(line, sectionType) {
  if (!line || line.type === "comment" || line.active === false) return 0;
  const lineType = line.lineType || sectionType || "other";
  if (lineType === "harikae") {
    const t1 = Number(line.taisho1) || 0;
    const t2 = Number(line.taisho2) || 0;
    return Math.round((t1 + t2) * 100) / 100;
  }
  return Number(line.suryo) || 0;
}

function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!user.trim()) {
      setErr("ユーザー名を入力してください");
      return;
    }
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ user: user.trim(), at: Date.now() }));
    } catch {
      /* ignore */
    }
    onLogin(user.trim());
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <i className="fa-solid fa-building text-white text-2xl" />
          </div>
        </div>
        <h1 className="text-center text-2xl font-black text-slate-900 mb-1">長谷工 DX</h1>
        <p className="text-center text-sm text-slate-400 mb-8">退去立会 · 見積ワークフロー</p>
        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">ユーザー名</span>
            <input
              className="login-input"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="demo"
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">パスワード</span>
            <input
              type="password"
              className="login-input"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
            />
          </label>
          {err && <p className="text-center text-xs text-rose-600 font-medium">{err}</p>}
          <button type="submit" className="login-btn">
            ログイン
          </button>
        </form>
        <p className="mt-6 text-center text-[11px] text-slate-400">プロトタイプ — 任意のユーザー名でログイン可能</p>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => {
    try {
      return Boolean(localStorage.getItem(AUTH_KEY));
    } catch {
      return false;
    }
  });
  const [userName, setUserName] = useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw).user || "demo" : "";
    } catch {
      return "";
    }
  });

  /** @type {['properties' | 'property-detail' | 'editor']} */
  const [screen, setScreen] = useState("properties");
  const [properties, setProperties] = useState(loadProperties);
  const [activePropertyId, setActivePropertyId] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [quoteLines, setQuoteLines] = useState([]);

  useEffect(() => {
    saveProperties(properties);
  }, [properties]);

  const handleLogin = useCallback((name) => {
    setUserName(name);
    setAuthed(true);
  }, []);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
    setAuthed(false);
    setUserName("");
    setScreen("properties");
    setActivePropertyId(null);
    setActiveRoom(null);
  }, []);

  const openProperty = useCallback((propertyId) => {
    setActivePropertyId(propertyId);
    setScreen("property-detail");
  }, []);

  const openRoom = useCallback(
    (propertyId, roomId) => {
      const prop = properties.find((p) => p.id === propertyId);
      const room = prop?.rooms.find((r) => r.id === roomId);
      if (!prop || !room) return;
      setActivePropertyId(propertyId);
      setActiveRoom({ propertyId, propertyName: prop.name, roomId, roomNo: room.roomNo });
      setQuoteLines(loadQuote(roomId));
      setScreen("editor");
    },
    [properties]
  );

  const handleSaveQuote = useCallback(
    (sections) => {
      if (!activeRoom) return;
      saveQuote(activeRoom.roomId, sections);
      setQuoteLines(sections);
      const allLines = Array.isArray(sections) ? sections.flatMap((s) => s.lines || []) : [];
      const total = (Array.isArray(sections) ? sections : []).reduce((sum, sec) => {
        const lines = Array.isArray(sec?.lines) ? sec.lines : [];
        return sum + lines.reduce((lineSum, line) => lineSum + calcLineQty(line, sec.kojiType) * (Number(line?.teika) || 0), 0);
      }, 0);
      const detailCount = allLines.filter((l) => l?.type !== "comment").length;
      setProperties((prev) =>
        prev.map((p) =>
          p.id !== activeRoom.propertyId
            ? p
            : {
                ...p,
                rooms: p.rooms.map((r) =>
                  r.id !== activeRoom.roomId
                    ? r
                    : {
                        ...r,
                        status: detailCount > 0 ? "draft" : "pending",
                        total,
                        updatedAt: new Date().toISOString()
                      }
                )
              }
        )
      );
    },
    [activeRoom]
  );

  const handleBackFromEditor = useCallback(() => {
    setScreen("property-detail");
    setActiveRoom(null);
  }, []);

  const handleBackFromProperty = useCallback(() => {
    setScreen("properties");
    setActivePropertyId(null);
  }, []);

  if (!authed) return <LoginScreen onLogin={handleLogin} />;

  if (screen === "editor" && activeRoom) {
    return (
      <SimpleQuoteEditor
        propertyName={activeRoom.propertyName}
        roomNo={activeRoom.roomNo}
        lines={quoteLines}
        onSave={handleSaveQuote}
        onBack={handleBackFromEditor}
        userName={userName}
      />
    );
  }

  if (screen === "property-detail" && activePropertyId) {
    const property = properties.find((p) => p.id === activePropertyId);
    return (
      <PropertyDetailPage
        property={property}
        allProperties={properties}
        onPropertiesChange={setProperties}
        onBack={handleBackFromProperty}
        onOpenRoom={openRoom}
      />
    );
  }

  return (
    <PropertyListPage
      properties={properties}
      onPropertiesChange={setProperties}
      onSelectProperty={openProperty}
      userName={userName}
      onLogout={handleLogout}
    />
  );
}
