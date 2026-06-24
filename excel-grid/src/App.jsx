import React, { useCallback, useEffect, useState } from "react";
import { PropertyListPage } from "./dx/mobile/PropertyListPage.jsx";
import { PropertyDetailPage } from "./dx/mobile/PropertyDetailPage.jsx";
import { SimpleQuoteEditor } from "./dx/SimpleQuoteEditor.jsx";
import { computeQuoteTotals } from "./dx/quoteTotals.js";

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

function parseRouteHash() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);
  if (parts[0] === "property" && parts[1]) {
    return { screen: "property-detail", propertyId: parts[1] };
  }
  if (parts[0] === "editor" && parts[1] && parts[2]) {
    return { screen: "editor", propertyId: parts[1], roomId: parts[2] };
  }
  return { screen: "properties" };
}

function setRouteHash(screen, propertyId, roomId) {
  let hash = "/";
  if (screen === "property-detail" && propertyId) hash = `/property/${propertyId}`;
  else if (screen === "editor" && propertyId && roomId) hash = `/editor/${propertyId}/${roomId}`;
  const next = `#${hash}`;
  if (window.location.hash !== next) window.location.hash = next;
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
      <div className="login-card w-full max-w-lg">
        <div className="flex justify-start mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <i className="fa-solid fa-building text-white text-2xl" />
          </div>
        </div>
        <h1 className="text-left text-2xl font-black text-slate-900 mb-1">長谷工 DX</h1>
        <p className="text-left text-sm text-slate-400 mb-8">退去立会 · 見積ワークフロー</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="ios-inset-group">
            <label className="ios-row flex-col items-stretch !min-h-0 !py-0">
              <span className="text-xs text-slate-500 px-4 pt-3 pb-1">ユーザー名</span>
              <input
                className="login-input !rounded-none !bg-transparent border-none"
                style={{ boxShadow: "none" }}
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="demo"
                autoComplete="username"
              />
            </label>
            <label className="ios-row flex-col items-stretch !min-h-0 !py-0">
              <span className="text-xs text-slate-500 px-4 pt-3 pb-1">パスワード</span>
              <input
                type="password"
                className="login-input !rounded-none !bg-transparent border-none"
                style={{ boxShadow: "none" }}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
              />
            </label>
          </div>
          {err && <p className="text-center text-xs text-rose-600 font-medium px-4">{err}</p>}
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

  const [screen, setScreen] = useState("properties");
  const [properties, setProperties] = useState(loadProperties);
  const [activePropertyId, setActivePropertyId] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [quoteLines, setQuoteLines] = useState([]);

  useEffect(() => {
    saveProperties(properties);
  }, [properties]);

  useEffect(() => {
    if (!authed) return;
    const syncFromHash = () => {
      const route = parseRouteHash();
      if (route.screen === "properties") {
        setScreen("properties");
        setActivePropertyId(null);
        setActiveRoom(null);
        return;
      }
      const prop = properties.find((p) => p.id === route.propertyId);
      if (!prop) {
        setRouteHash("properties");
        return;
      }
      if (route.screen === "property-detail") {
        setActivePropertyId(route.propertyId);
        setActiveRoom(null);
        setScreen("property-detail");
        return;
      }
      if (route.screen === "editor") {
        const room = prop.rooms.find((r) => r.id === route.roomId);
        if (!room) {
          setRouteHash("property-detail", route.propertyId);
          return;
        }
        setActivePropertyId(route.propertyId);
        setActiveRoom({
          propertyId: route.propertyId,
          propertyName: prop.name,
          roomId: route.roomId,
          roomNo: room.roomNo,
          status: room.status
        });
        setQuoteLines(loadQuote(route.roomId));
        setScreen("editor");
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [authed, properties]);

  const handleLogin = useCallback((name) => {
    setUserName(name);
    setAuthed(true);
    setRouteHash("properties");
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
    window.location.hash = "#/";
  }, []);

  const openProperty = useCallback((propertyId) => {
    setActivePropertyId(propertyId);
    setScreen("property-detail");
    setRouteHash("property-detail", propertyId);
  }, []);

  const openRoom = useCallback(
    (propertyId, roomId) => {
      const prop = properties.find((p) => p.id === propertyId);
      const room = prop?.rooms.find((r) => r.id === roomId);
      if (!prop || !room) return;
      setActivePropertyId(propertyId);
      setActiveRoom({
        propertyId,
        propertyName: prop.name,
        roomId,
        roomNo: room.roomNo,
        status: room.status
      });
      setQuoteLines(loadQuote(roomId));
      setScreen("editor");
      setRouteHash("editor", propertyId, roomId);
    },
    [properties]
  );

  const updateRoomFromQuote = useCallback(
    (sections, statusOverride) => {
      if (!activeRoom) return;
      saveQuote(activeRoom.roomId, sections);
      setQuoteLines(sections);
      const allLines = Array.isArray(sections) ? sections.flatMap((s) => s.lines || []) : [];
      const { grand } = computeQuoteTotals(sections);
      const detailCount = allLines.filter((l) => l?.type !== "comment").length;
      let status = statusOverride;
      if (!status) {
        status = detailCount > 0 ? "draft" : "pending";
      }
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
                        status,
                        total: grand,
                        updatedAt: new Date().toISOString()
                      }
                )
              }
        )
      );
      setActiveRoom((prev) => (prev ? { ...prev, status } : prev));
    },
    [activeRoom]
  );

  const handleSaveQuote = useCallback(
    (sections) => {
      updateRoomFromQuote(sections);
    },
    [updateRoomFromQuote]
  );

  const handleMarkDone = useCallback(
    (sections) => {
      updateRoomFromQuote(sections, "done");
    },
    [updateRoomFromQuote]
  );

  const handleBackFromEditor = useCallback(() => {
    if (activeRoom?.propertyId) {
      setRouteHash("property-detail", activeRoom.propertyId);
    } else {
      setRouteHash("properties");
    }
    setScreen("property-detail");
    setActiveRoom(null);
  }, [activeRoom]);

  const handleBackFromProperty = useCallback(() => {
    setRouteHash("properties");
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
        onMarkDone={handleMarkDone}
        roomStatus={activeRoom.status || "pending"}
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
