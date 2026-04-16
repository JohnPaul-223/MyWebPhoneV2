/* ═══════════════════════════════════════════════════════════
   AUTH — localStorage-backed accounts, sessionStorage session
═══════════════════════════════════════════════════════════ */

const AUTH_KEY      = "pcphone_accounts";   // localStorage: { [username]: account }
const SESSION_KEY   = "pcphone_session";    // sessionStorage: username
const CONTACTS_KEY  = "pcphone_contacts";   // localStorage: [ { name, phone } ]
const HISTORY_KEY   = "pcphone_history";    // localStorage: [ { number, direction, ts, duration } ]

function getAccounts() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "{}"); }
  catch { return {}; }
}

function saveAccounts(accounts) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(accounts));
}

function getSession() {
  return sessionStorage.getItem(SESSION_KEY) || null;
}

function setSession(username) {
  sessionStorage.setItem(SESSION_KEY, username);
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function hashSimple(str) {
  // Lightweight deterministic hash — not crypto-grade, fine for local demo
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

// ── DOM refs ──────────────────────────────────────────────
const authOverlay   = document.getElementById("authOverlay");
const appShell      = document.getElementById("appShell");

const tabLogin      = document.getElementById("tabLogin");
const tabRegister   = document.getElementById("tabRegister");
const panelLogin    = document.getElementById("panelLogin");
const panelRegister = document.getElementById("panelRegister");

const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginError    = document.getElementById("loginError");
const loginSubmit   = document.getElementById("loginSubmit");
const loginEye      = document.getElementById("loginEye");

const regName       = document.getElementById("regName");
const regPhone      = document.getElementById("regPhone");
const regUsername   = document.getElementById("regUsername");
const regPassword   = document.getElementById("regPassword");
const regConfirm    = document.getElementById("regConfirm");
const regError      = document.getElementById("regError");
const regSubmit     = document.getElementById("regSubmit");
const regEye        = document.getElementById("regEye");

const toRegisterBtn = document.getElementById("toRegister");
const toLoginBtn    = document.getElementById("toLogin");

const topbarAvatar  = document.getElementById("topbarAvatar");
const topbarName    = document.getElementById("topbarName");
const topbarNumber  = document.getElementById("topbarNumber");
const logoutBtn     = document.getElementById("logoutBtn");

/* ═══════════════════════════════════════════════════════════
   BOTTOM NAV — view switching
═══════════════════════════════════════════════════════════ */
const navButtons = document.querySelectorAll(".nav-item");
const views      = document.querySelectorAll(".view");

function switchView(viewId) {
  views.forEach(v => v.classList.remove("view--active"));
  navButtons.forEach(b => b.classList.remove("nav-active"));
  const target = document.getElementById(viewId);
  if (target) target.classList.add("view--active");
  const btn = document.querySelector(`[data-view="${viewId}"]`);
  if (btn) btn.classList.add("nav-active");
  // Invalidate map size when switching to location view
  if (viewId === "viewLocation" && callMap) {
    setTimeout(() => callMap.invalidateSize(), 50);
  }
}

navButtons.forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

// Default active tab
switchView("viewDialer");

/* ═══════════════════════════════════════════════════════════
   CONTACTS
═══════════════════════════════════════════════════════════ */
function getContacts() {
  try { return JSON.parse(localStorage.getItem(CONTACTS_KEY) || "[]"); }
  catch { return []; }
}
function saveContacts(list) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(list));
}

const addContactBtn    = document.getElementById("addContactBtn");
const contactModal     = document.getElementById("contactModal");
const closeContactModal = document.getElementById("closeContactModal");
const newContactName   = document.getElementById("newContactName");
const newContactPhone  = document.getElementById("newContactPhone");
const saveContactBtn   = document.getElementById("saveContactBtn");
const contactListEl    = document.getElementById("contactList");
const contactSearchEl  = document.getElementById("contactSearch");

function renderContacts(filter = "") {
  const list = getContacts();
  const f = filter.toLowerCase();
  const filtered = f ? list.filter(c => c.name.toLowerCase().includes(f) || c.phone.toLowerCase().includes(f)) : list;
  if (!filtered.length) {
    contactListEl.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <p>${f ? 'No matches found' : 'No contacts yet'}</p>
      </div>`;
    return;
  }
  contactListEl.innerHTML = filtered.map((c, i) => `
    <div class="contact-item">
      <div class="contact-avatar">${c.name.charAt(0)}</div>
      <div class="contact-info">
        <div class="contact-name">${escapeHtml(c.name)}</div>
        <div class="contact-phone">${escapeHtml(c.phone)}</div>
      </div>
      <div class="contact-actions">
        <button class="contact-action-btn contact-action-btn--call" title="Call" onclick="dialContact('${escapeHtml(c.phone)}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
        </button>
        <button class="contact-action-btn contact-action-btn--video" title="Video Call" onclick="dialContact('${escapeHtml(c.phone)}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
        </button>
        <button class="contact-action-btn" title="Delete" onclick="deleteContact(${i})">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>`).join("");
}

function escapeHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

window.dialContact = function(phone) {
  dialBuffer = phone.replace(/\D/g, "").slice(0, MAX_DIAL_LEN);
  syncDialDisplay();
  switchView("viewDialer");
};

window.deleteContact = function(index) {
  const list = getContacts();
  list.splice(index, 1);
  saveContacts(list);
  renderContacts(contactSearchEl.value);
};

window.promptSaveContact = function(phone) {
  newContactPhone.value = phone;
  contactModal.hidden = false;
  newContactName.focus();
  switchView("viewContacts");
};

addContactBtn.addEventListener("click", () => { 
  newContactPhone.value = "";
  contactModal.hidden = false; 
  newContactName.focus(); 
});
closeContactModal.addEventListener("click", () => { contactModal.hidden = true; });
contactModal.addEventListener("click", e => { if (e.target === contactModal) contactModal.hidden = true; });

saveContactBtn.addEventListener("click", () => {
  const name  = newContactName.value.trim();
  const phone = newContactPhone.value.trim();
  if (!name || !phone) return;
  const list = getContacts();
  list.push({ name, phone });
  saveContacts(list);
  newContactName.value  = "";
  newContactPhone.value = "";
  contactModal.hidden = true;
  renderContacts();
});

contactSearchEl.addEventListener("input", () => renderContacts(contactSearchEl.value));
renderContacts();

/* ═══════════════════════════════════════════════════════════
   CALL HISTORY
═══════════════════════════════════════════════════════════ */
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 100)));
}

function addHistoryEntry(number, direction) {
  const list = getHistory();
  list.unshift({ number, direction, ts: Date.now() });
  saveHistory(list);
  renderHistory();
}

window.clearHistory = function() {
  saveHistory([]);
  renderHistory();
};

function renderHistory() {
  const historyListEl = document.getElementById("historyList");
  if (!historyListEl) return;
  const list = getHistory();
  if (!list.length) {
    historyListEl.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".3"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72 12.05 12.05 0 0 0 .657 2.657 2 2 0 0 1-.45 2.11L7.91 9.91"/></svg>
        <p>No recent calls</p>
      </div>`;
    return;
  }
  historyListEl.innerHTML = list.map(h => {
    const d = new Date(h.ts);
    const timeStr = d.toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    const iconClass = h.direction === 'in' ? 'in' : h.direction === 'missed' ? 'missed' : 'out';
    const iconChar  = h.direction === 'in' ? '↙' : h.direction === 'missed' ? '✕' : '↗';
    const label     = h.direction === 'in' ? 'Incoming' : h.direction === 'missed' ? 'Missed' : 'Outgoing';
    return `
      <div class="history-item">
        <div class="history-avatar history-avatar--${iconClass}">${iconChar}</div>
        <div class="history-info">
          <div class="history-number">${escapeHtml(h.number)}</div>
          <div class="history-meta">${label} · ${timeStr}</div>
        </div>
        <div class="history-actions">
          <button class="history-action-btn history-action-btn--call" title="Call back" onclick="dialContact('${escapeHtml(h.number)}')">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          </button>
          <button class="history-action-btn" title="Save Contact" onclick="promptSaveContact('${escapeHtml(h.number)}')">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          </button>
        </div>
      </div>`;
  }).join("");
}
renderHistory();

// ── Tab switching ─────────────────────────────────────────
function showLoginTab() {
  tabLogin.classList.add("auth-tab--active");
  tabRegister.classList.remove("auth-tab--active");
  tabLogin.setAttribute("aria-selected", "true");
  tabRegister.setAttribute("aria-selected", "false");
  panelLogin.classList.remove("auth-panel--hidden");
  panelRegister.classList.add("auth-panel--hidden");
  clearAuthErrors();
}

function showRegisterTab() {
  tabRegister.classList.add("auth-tab--active");
  tabLogin.classList.remove("auth-tab--active");
  tabRegister.setAttribute("aria-selected", "true");
  tabLogin.setAttribute("aria-selected", "false");
  panelRegister.classList.remove("auth-panel--hidden");
  panelLogin.classList.add("auth-panel--hidden");
  clearAuthErrors();
}

tabLogin.addEventListener("click", showLoginTab);
tabRegister.addEventListener("click", showRegisterTab);
toRegisterBtn.addEventListener("click", showRegisterTab);
toLoginBtn.addEventListener("click", showLoginTab);

// ── Error helpers ─────────────────────────────────────────
function showError(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}

function clearAuthErrors() {
  loginError.hidden = true;
  regError.hidden = true;
  [loginUsername, loginPassword, regName, regPhone, regUsername, regPassword, regConfirm]
    .forEach(i => i.classList.remove("auth-input--error"));
}

// ── Password eye toggles ──────────────────────────────────
function makeEyeToggle(btn, input) {
  btn.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    // swap icon path
    btn.querySelector("svg").innerHTML = show
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });
}
makeEyeToggle(loginEye, loginPassword);
makeEyeToggle(regEye, regPassword);

// ── Login logic ───────────────────────────────────────────
function doLogin() {
  clearAuthErrors();
  const identifier = loginUsername.value.trim();
  const password   = loginPassword.value;

  let bad = false;
  if (!identifier) { loginUsername.classList.add("auth-input--error"); bad = true; }
  if (!password)   { loginPassword.classList.add("auth-input--error"); bad = true; }
  if (bad) { showError(loginError, "Please fill in all fields."); return; }

  const accounts = getAccounts();
  // match by username OR phone number
  const account = accounts[identifier] ||
    Object.values(accounts).find(a => a.phone === identifier);

  if (!account || account.passwordHash !== hashSimple(password)) {
    loginUsername.classList.add("auth-input--error");
    loginPassword.classList.add("auth-input--error");
    showError(loginError, "Incorrect username/phone or password.");
    return;
  }

  setSession(account.username);
  enterApp(account);
}

loginSubmit.addEventListener("click", doLogin);
loginPassword.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
loginUsername.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });

// ── Register logic ────────────────────────────────────────
function doRegister() {
  clearAuthErrors();
  const name     = regName.value.trim();
  const phone    = regPhone.value.trim().replace(/\s+/g, "");
  const username = regUsername.value.trim().toLowerCase();
  const password = regPassword.value;
  const confirm  = regConfirm.value;

  let bad = false;
  const markBad = (el) => { el.classList.add("auth-input--error"); bad = true; };

  if (!name)                       markBad(regName);
  if (!phone)                      markBad(regPhone);
  if (!username)                   markBad(regUsername);
  if (!password)                   markBad(regPassword);
  if (!confirm)                    markBad(regConfirm);
  if (bad) { showError(regError, "Please fill in all fields."); return; }

  if (!/^[a-z0-9_.]{3,32}$/.test(username)) {
    markBad(regUsername);
    showError(regError, "Username: 3–32 chars, letters/digits/. or _ only.");
    return;
  }
  if (!/^\+?[\d\s\-]{7,15}$/.test(phone)) {
    markBad(regPhone);
    showError(regError, "Enter a valid phone number (digits only, 7–15 chars).");
    return;
  }
  if (password.length < 6) {
    markBad(regPassword);
    showError(regError, "Password must be at least 6 characters.");
    return;
  }
  if (password !== confirm) {
    markBad(regPassword);
    markBad(regConfirm);
    showError(regError, "Passwords do not match.");
    return;
  }

  const accounts = getAccounts();
  if (accounts[username]) {
    markBad(regUsername);
    showError(regError, "That username is already taken.");
    return;
  }
  if (Object.values(accounts).some(a => a.phone === phone)) {
    markBad(regPhone);
    showError(regError, "That phone number is already registered.");
    return;
  }

  const account = { name, phone, username, passwordHash: hashSimple(password) };
  accounts[username] = account;
  saveAccounts(accounts);
  setSession(username);
  enterApp(account);
}

regSubmit.addEventListener("click", doRegister);
regConfirm.addEventListener("keydown", e => { if (e.key === "Enter") doRegister(); });

// ── Enter / leave app ─────────────────────────────────────
function enterApp(account) {
  // Update header
  topbarAvatar.textContent = (account.name || account.username).charAt(0).toUpperCase();
  topbarName.textContent   = account.name || account.username;
  topbarNumber.textContent = account.phone || "—";

  // Pre-fill dialer with their phone number (digits only, max 12)
  const digits = (account.phone || "").replace(/\D/g, "").slice(0, MAX_DIAL_LEN);
  if (digits) {
    dialBuffer = digits;
    syncDialDisplay();
  }

  // Show app, hide auth
  authOverlay.classList.add("auth-overlay--hidden");
  appShell.hidden = false;

  // Kick off map + devices
  ensureMap();
  initDeviceListsIfPossible();
  setHint("Device A: enter number → Wait. Device B: same number → Call.");
  setStatus("Ready");

  // Refresh contact/history lists
  renderContacts();
  renderHistory();

  // Switch to dialer view
  switchView("viewDialer");
}

logoutBtn.addEventListener("click", () => {
  clearSession();
  // Reset call state if active
  if (inCall) endCall(false);
  dialBuffer = "";
  syncDialDisplay();
  // Show auth, hide app
  authOverlay.classList.remove("auth-overlay--hidden");
  appShell.hidden = true;
  // Reset forms
  loginUsername.value = "";
  loginPassword.value = "";
  clearAuthErrors();
  showLoginTab();
});

// ── Auto-restore session runs at end of file (after all vars are declared)


/* ═══════════════════════════════════════════════════════════
   ORIGINAL APP LOGIC (unchanged below)
═══════════════════════════════════════════════════════════ */

const waitBtn         = document.getElementById("waitBtn");
const callBtn         = document.getElementById("callBtn");
const hangupBtn       = document.getElementById("hangupBtn");
const clearDialBtn    = document.getElementById("clearDialBtn");
const muteBtn         = document.getElementById("muteBtn");
const camBtn          = document.getElementById("camBtn");
const statusText      = document.getElementById("statusText");
const hintText        = document.getElementById("hintText");
const dialPill        = document.getElementById("dialPill");
const messagesLine    = document.getElementById("messagesLine");
const chatLog         = document.getElementById("chatLog");
const chatInput       = document.getElementById("chatInput");
const sendBtn         = document.getElementById("sendBtn");
const keypadEl        = document.getElementById("keypad");
const callMapEl          = document.getElementById("callMap");
const chatBadge          = document.getElementById("chatBadge");
const callDurationEl     = document.getElementById("callDuration");
const micSelect          = document.getElementById("micSelect");
const camSelect          = document.getElementById("camSelect");
const localVideo         = document.getElementById("localVideo");
const remoteVideo        = document.getElementById("remoteVideo");

// Unread chat badge
let unreadChat = 0;

// ── Browser Push Notifications ──────────────────────────────────
function ensureNotificationPerm() {
  if (window.Notification && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}
document.addEventListener("click", ensureNotificationPerm, { once: true });

function notifyBackgroundUser(title, body) {
  if (window.Notification && Notification.permission === "granted" && document.hidden) {
    new Notification(title, { 
      body, 
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'%3E%3Cpath d='M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z'/%3E%3C/svg%3E"
    });
  }
}

function incrementChatBadge() {
  const activeView = document.querySelector(".view--active");
  if (activeView && activeView.id === "viewChat") return; // already visible
  unreadChat++;
  chatBadge.textContent = unreadChat > 9 ? "9+" : String(unreadChat);
  chatBadge.hidden = false;
}
function clearChatBadge() {
  unreadChat = 0;
  chatBadge.hidden = true;
}
// Clear badge when switching to chat
document.getElementById("navChat").addEventListener("click", clearChatBadge);

let localStream     = null;
let peer            = null;
let activeCall      = null;
let dataConn        = null;
let inCall          = false;
let dialBuffer      = "";
/** @type {'caller' | 'receiver' | null} */
let myRole          = null;
let callLive        = false;
let callDurationTimer = null;
let callStartedAt   = 0;
let callMap         = null;
let callerMarker    = null;
let receiverMarker  = null;
let callerCoords    = null;
let receiverCoords  = null;

const MAX_DIAL_LEN = 12;

function setStatus(text)  { statusText.textContent = text; }
function setHint(text)    { hintText.textContent   = text; }

function formatChatTime(ts) {
  const d = typeof ts === "number" ? new Date(ts) : new Date();
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function syncDialDisplay() {
  // For an <input>, keep value in sync with dialBuffer
  if (dialPill.value !== dialBuffer) dialPill.value = dialBuffer;
  messagesLine.textContent = dialBuffer.length ? dialBuffer : "—";
}

// Allow direct keyboard/touch input into the dial field
dialPill.addEventListener("input", () => {
  if (inCall) { dialPill.value = dialBuffer; return; }
  // Strip anything that's not a digit, *, or #
  const clean = dialPill.value.replace(/[^\d*#]/g, "").slice(0, MAX_DIAL_LEN);
  dialBuffer = clean;
  dialPill.value = clean;
  messagesLine.textContent = clean.length ? clean : "—";
});

// Prevent letters, allow digits / backspace / arrow keys / paste
dialPill.addEventListener("keydown", (e) => {
  if (inCall) { e.preventDefault(); return; }
});

function updateRoleBadges() {
  // role badges removed from UI
}

function parseCoords(text) {
  const match = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(String(text).trim());
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return [lat, lon];
}

function ensureMap() {
  if (!callMapEl || callMap || !window.L) return;
  callMap = window.L.map(callMapEl, { zoomControl: true }).setView([14.5995, 120.9842], 5);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap contributors"
  }).addTo(callMap);
}

function refreshMapMarkers() {
  ensureMap();
  if (!callMap || !window.L) return;
  if (callerMarker)   { callMap.removeLayer(callerMarker);   callerMarker   = null; }
  if (receiverMarker) { callMap.removeLayer(receiverMarker); receiverMarker = null; }
  if (callerCoords)   callerMarker   = window.L.marker(callerCoords).addTo(callMap).bindPopup("Caller");
  if (receiverCoords) receiverMarker = window.L.marker(receiverCoords).addTo(callMap).bindPopup("Receiver");
  if (callerCoords && receiverCoords) {
    callMap.fitBounds([callerCoords, receiverCoords], { padding: [30, 30], maxZoom: 15 });
  } else if (callerCoords || receiverCoords) {
    callMap.setView(callerCoords || receiverCoords, 13);
  }
}

function setRoleLocation(role, text) {
  const value = String(text);
  if (role === "caller") {
    callerCoords = parseCoords(value);
  } else if (role === "receiver") {
    receiverCoords = parseCoords(value);
  }
  refreshMapMarkers();
}

function appendChatBubble(text, direction, ts = Date.now()) {
  const wrap   = document.createElement("div");
  wrap.className = direction === "out" ? "chat-wrap chat-wrap--out" : "chat-wrap chat-wrap--in";
  const bubble = document.createElement("div");
  bubble.className = direction === "out" ? "chat-bubble chat-bubble--out" : "chat-bubble chat-bubble--in";
  bubble.textContent = text;
  const timeEl = document.createElement("div");
  timeEl.className   = "chat-time";
  timeEl.textContent = formatChatTime(ts);
  wrap.appendChild(bubble);
  wrap.appendChild(timeEl);
  chatLog.appendChild(wrap);
  chatLog.scrollTop = chatLog.scrollHeight;
  if (direction === "in") incrementChatBadge();
}

function startCallTimer() {
  stopCallTimer();
  callStartedAt = Date.now();
  callDurationEl.hidden      = false;
  callDurationEl.textContent = "00:00";
  callDurationTimer = window.setInterval(() => {
    const s  = Math.floor((Date.now() - callStartedAt) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    callDurationEl.textContent = `${mm}:${ss}`;
  }, 1000);
}

function stopCallTimer() {
  if (callDurationTimer) { window.clearInterval(callDurationTimer); callDurationTimer = null; }
  callDurationEl.hidden      = true;
  callDurationEl.textContent = "00:00";
}

function markCallLive() {
  if (callLive) return;
  callLive = true;
  startCallTimer();
}

function teardownDataConn() {
  if (dataConn) { dataConn.close(); dataConn = null; }
}

function handleDataPayload(raw) {
  let payload;
  try { payload = typeof raw === "string" ? JSON.parse(raw) : raw; }
  catch { return; }
  if (payload.type === "msg" && payload.text) {
    appendChatBubble(String(payload.text), "in", typeof payload.ts === "number" ? payload.ts : Date.now());
    notifyBackgroundUser("New Message", String(payload.text));
  } else if (payload.type === "peerLoc" && payload.role && payload.text) {
    setRoleLocation(payload.role, payload.text);
  }
}

function setupDataConn(conn) {
  teardownDataConn();
  dataConn = conn;
  conn.on("data", handleDataPayload);
  conn.on("open", () => { shareMyLocation(); });
}

function peerLocationString(cb) {
  if (!navigator.geolocation) { cb("Not available"); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => { const { latitude, longitude } = pos.coords; cb(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`); },
    () => cb("Denied / unavailable"),
    { timeout: 8000, maximumAge: 60000 }
  );
}

function sendPeerLoc(role, text) {
  if (!dataConn || !dataConn.open || !role) return;
  dataConn.send(JSON.stringify({ type: "peerLoc", role, text }));
}

function shareMyLocation() {
  if (!myRole) return;
  if (myRole === "caller") setRoleLocation("caller", "Fetching…");
  else setRoleLocation("receiver", "Fetching…");
  peerLocationString((text) => {
    if (myRole === "caller") setRoleLocation("caller", text);
    else setRoleLocation("receiver", text);
    sendPeerLoc(myRole, text);
  });
}

function trySendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  if (!dataConn || !dataConn.open) {
    setHint("Wait until the call is connected — then you can send messages.");
    return;
  }
  const ts = Date.now();
  dataConn.send(JSON.stringify({ type: "msg", text, ts }));
  appendChatBubble(text, "out", ts);
  chatInput.value = "";
}

function resetLocationLabels() {
  // labels removed
}

function getMediaConstraints() {
  const audioId = micSelect.value;
  const videoId = camSelect.value;
  return {
    audio: audioId ? { deviceId: { exact: audioId } } : true,
    video: videoId ? { deviceId: { exact: videoId } } : true
  };
}

function fillDeviceSelect(select, devices, preferredId) {
  const previous = select.value;
  select.innerHTML = "";
  const def = document.createElement("option");
  def.value = ""; def.textContent = "Default";
  select.appendChild(def);
  devices.forEach((d) => {
    const o = document.createElement("option");
    o.value       = d.deviceId;
    o.textContent = d.label || `Device (${d.deviceId.slice(0, 6)}…)`;
    select.appendChild(o);
  });
  const pick = preferredId && [...select.options].some(o => o.value === preferredId)
    ? preferredId
    : previous && [...select.options].some(o => o.value === previous) ? previous : "";
  select.value = pick;
}

function refreshDeviceLists(stream) {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    const mics = devices.filter(d => d.kind === "audioinput");
    const cams = devices.filter(d => d.kind === "videoinput");
    const aId  = stream?.getAudioTracks()[0]?.getSettings?.().deviceId;
    const vId  = stream?.getVideoTracks()[0]?.getSettings?.().deviceId;
    fillDeviceSelect(micSelect, mics, aId);
    fillDeviceSelect(camSelect, cams, vId);
  });
}

function syncMuteCamUi() {
  const audioOn = localStream?.getAudioTracks().some(t => t.enabled) ?? false;
  const videoOn = localStream?.getVideoTracks().some(t => t.enabled) ?? false;
  muteBtn.setAttribute("aria-pressed", String(!audioOn));
  muteBtn.classList.toggle("icon-toggle--off", !audioOn);
  camBtn.setAttribute("aria-pressed", String(!videoOn));
  camBtn.classList.toggle("icon-toggle--off", !videoOn);
  muteBtn.querySelector(".icon-toggle__text").textContent = audioOn ? "Mic"  : "Muted";
  camBtn.querySelector(".icon-toggle__text").textContent  = videoOn ? "Cam"  : "Cam off";
}

function mountVideosForCaller() {
  // UI removed, just ensure they play audio if not muted
  localVideo.hidden  = false;
  remoteVideo.hidden = false;
}

function mountVideosForReceiver() {
  localVideo.hidden  = false;
  remoteVideo.hidden = false;
}

function unmountVideos() {
  localVideo.hidden  = true;
  remoteVideo.hidden = true;
  localVideo.pause?.();
  remoteVideo.pause?.();
  localVideo.srcObject  = null;
  remoteVideo.srcObject = null;
}

function updateControls() {
  waitBtn.disabled     = inCall;
  callBtn.disabled     = inCall;
  hangupBtn.disabled   = !inCall;
  clearDialBtn.disabled = inCall;
  chatInput.disabled   = !inCall;
  sendBtn.disabled     = !inCall;
  micSelect.disabled   = inCall;
  camSelect.disabled   = inCall;
  const hasStream = Boolean(localStream);
  muteBtn.disabled = !hasStream;
  camBtn.disabled  = !hasStream;
  keypadEl.querySelectorAll(".keypad-btn").forEach(b => { b.disabled = inCall; });
}

function stopLocalMedia() {
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  localVideo.srcObject = null;
  syncMuteCamUi();
}

async function setupLocalMedia() {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
  localVideo.srcObject = localStream;
  refreshDeviceLists(localStream);
  syncMuteCamUi();
  return localStream;
}

function closeActiveCall() {
  if (activeCall) {
    activeCall.off("stream");
    activeCall.off("close");
    activeCall.off("error");
    activeCall.close();
    activeCall = null;
  }
  remoteVideo.srcObject = null;
}

function resetState() {
  stopCallTimer();
  callLive  = false;
  stopLocalMedia();
  inCall    = false;
  myRole    = null;
  updateRoleBadges();
  updateControls();
  teardownDataConn();
  unmountVideos();
  resetLocationLabels();
}

function endCall(localAction = false) {
  if (localAction) setStatus("Call ended");
  // Log to history
  if (dialBuffer && myRole) {
    addHistoryEntry(dialBuffer, myRole === "caller" ? "out" : "in");
  }
  closeActiveCall();
  if (peer) { peer.destroy(); peer = null; }
  resetState();
  setHint("Device A: enter number → Wait. Device B: same number → Call.");
}

function bindIncomingCalls() {
  peer.on("call", (incomingCall) => {
    if (!localStream) { setStatus("Local media not ready."); return; }
    if (activeCall)   { incomingCall.close(); return; }

    activeCall = incomingCall;
    setStatus("Connecting…");
    notifyBackgroundUser("Incoming Call", "Someone is connecting to your WebPhone.");
    incomingCall.answer(localStream);
    setHint("Connected.");

    incomingCall.on("stream", (remoteStream) => {
      remoteVideo.srcObject = remoteStream;
      setStatus("In call");
      setHint("Connected — you can chat on the left.");
      markCallLive();
    });
    incomingCall.on("close", () => {
      setStatus("Other line disconnected.");
      setHint("Press Wait for call to receive again.");
      closeActiveCall(); resetState();
    });
    incomingCall.on("error", () => { setStatus("Call error."); closeActiveCall(); resetState(); });
  });

  peer.on("connection", (conn) => { setupDataConn(conn); });
}

function createPeerId(number) { return `pc-phone-${number}`; }

function readDialNumberOrExplain() {
  const value = dialBuffer.trim();
  if (!value) {
    setStatus("Dial a number on the keypad first.");
    setHint("Tap digits, then Wait (receiver) or Call (caller).");
    return null;
  }
  return value;
}

function openCallerDataChannel(targetId) {
  const conn = peer.connect(targetId, { reliable: true });
  setupDataConn(conn);
}

async function startCaller() {
  const value = readDialNumberOrExplain();
  if (!value) return;
  if (peer || activeCall) endCall(false);

  myRole = "caller";
  updateRoleBadges();
  setStatus("Starting camera/mic…");
  setHint("Allow access if the browser asks.");
  addHistoryEntry(value, "out");

  try { await setupLocalMedia(); }
  catch {
    setStatus("Camera/mic permission denied.");
    setHint("Allow permissions for this page and try again.");
    myRole = null; updateRoleBadges(); return;
  }

  mountVideosForCaller();
  inCall = true;
  updateControls();
  setStatus("Dialing…");
  setHint("Other device must tap Wait for call with the same number.");

  const ownId    = `${createPeerId(value)}-caller-${Math.random().toString(36).slice(2, 8)}`;
  const targetId = createPeerId(value);
  peer = new Peer(ownId);

  peer.on("open", () => {
    openCallerDataChannel(targetId);
    const call = peer.call(targetId, localStream);
    activeCall  = call;

    call.on("stream", (remoteStream) => {
      remoteVideo.srcObject = remoteStream;
      setStatus("In call");
      setHint("Connected — you can chat on the left.");
      markCallLive();
    });
    call.on("close", () => {
      setStatus("Call ended"); closeActiveCall(); resetState(); setHint("Call finished.");
      if (peer) { peer.destroy(); peer = null; }
    });
    call.on("error", () => {
      setStatus("Line not available.");
      setHint("On the other device: Wait for call with this number, then Call again.");
      closeActiveCall(); resetState();
      if (peer) { peer.destroy(); peer = null; }
    });
  });

  peer.on("error", () => {
    setStatus("Network error."); setHint("Refresh both pages and try again."); endCall(false);
  });
}

async function startReceiver() {
  const value = readDialNumberOrExplain();
  if (!value) return;
  if (peer || activeCall) endCall(false);

  myRole = "receiver";
  updateRoleBadges();
  setStatus("Starting camera/mic…");
  setHint("Allow access if the browser asks.");

  try { await setupLocalMedia(); }
  catch {
    setStatus("Camera/mic permission denied.");
    setHint("Allow permissions for this page and try again.");
    myRole = null; updateRoleBadges(); return;
  }

  mountVideosForReceiver();
  inCall = true;
  updateControls();
  setStatus("Waiting…");
  setHint("Other device: same number → blue Call button.");

  const receiverId = createPeerId(value);
  peer = new Peer(receiverId);
  bindIncomingCalls();

  peer.on("error", () => {
    setStatus("Line busy."); setHint("Another session is using this number. Pick another."); endCall(false);
  });
}

function buildKeypad() {
  const keys = ["1","2","3","4","5","6","7","8","9","*","0"];
  keys.forEach((k) => {
    const btn = document.createElement("button");
    btn.type      = "button";
    btn.className = "keypad-btn";
    btn.textContent = k;
    btn.addEventListener("click", () => {
      if (inCall) return;
      if (dialBuffer.length >= MAX_DIAL_LEN) return;
      dialBuffer += k;
      syncDialDisplay();
    });
    keypadEl.appendChild(btn);
  });

  const back = document.createElement("button");
  back.type      = "button";
  back.className = "keypad-btn keypad-btn--back";
  back.textContent = "⌫";
  back.setAttribute("aria-label", "Backspace");
  back.addEventListener("click", () => {
    if (inCall) return;
    dialBuffer = dialBuffer.slice(0, -1);
    syncDialDisplay();
  });
  keypadEl.appendChild(back);
}

buildKeypad();
syncDialDisplay();
updateRoleBadges();
updateControls();

muteBtn.addEventListener("click", () => {
  if (!localStream) return;
  const tracks = localStream.getAudioTracks();
  const anyOn  = tracks.some(t => t.enabled);
  tracks.forEach(t => { t.enabled = !anyOn; });
  syncMuteCamUi();
});

camBtn.addEventListener("click", () => {
  if (!localStream) return;
  const tracks = localStream.getVideoTracks();
  const anyOn  = tracks.some(t => t.enabled);
  tracks.forEach(t => { t.enabled = !anyOn; });
  syncMuteCamUi();
});

function onDeviceSelectChange() {
  if (inCall || !localStream) return;
  stopLocalMedia();
}
micSelect.addEventListener("change", onDeviceSelectChange);
camSelect.addEventListener("change", onDeviceSelectChange);

waitBtn.addEventListener("click",    async () => { await startReceiver(); });
callBtn.addEventListener("click",    async () => { await startCaller(); });
hangupBtn.addEventListener("click",  ()        => { endCall(true); });
clearDialBtn.addEventListener("click", () => {
  if (inCall) return;
  dialBuffer = "";
  syncDialDisplay();
});
sendBtn.addEventListener("click", trySendChat);
chatInput.addEventListener("keydown", e => { if (e.key === "Enter") trySendChat(); });

function initDeviceListsIfPossible() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    if (localStream) return;
    fillDeviceSelect(micSelect, devices.filter(d => d.kind === "audioinput"), "");
    fillDeviceSelect(camSelect, devices.filter(d => d.kind === "videoinput"), "");
  });
}

// ── Auto-restore session (MUST be last — needs all vars declared above) ──────
(function checkSession() {
  const username = getSession();
  if (username) {
    const accounts = getAccounts();
    const account = accounts[username];
    if (account) {
      enterApp(account);
      return;
    }
  }
  // No session — show auth overlay
  authOverlay.classList.remove("auth-overlay--hidden");
  appShell.hidden = true;
})();
