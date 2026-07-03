const STORAGE_KEY = "taisho-moyo-session-v1";

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    propertyName: "",
    moveOutDate: "",
    currentStep: "home",
    currentRoomIndex: 0,
    findings: [],
    photos: []
  };
}

export function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch { /* ignore */ }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

export function addFinding(session, finding) {
  const findings = [...(session.findings || []), { ...finding, id: `f_${Date.now()}` }];
  return { ...session, findings };
}

export function removeFinding(session, findingId) {
  return {
    ...session,
    findings: (session.findings || []).filter((f) => f.id !== findingId)
  };
}
