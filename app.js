"use strict";

const $ = (id) => document.getElementById(id);
const recordBtn = $("record-btn");
const recordStatus = $("record-status");
const noteText = $("note-text");
const noteCategory = $("note-category");
const newCategoryBtn = $("new-category-btn");
const noteDue = $("note-due");
const saveBtn = $("save-btn");
const readBtn = $("read-btn");
const searchInput = $("search");
const chipsBox = $("category-chips");
const statusFilter = $("status-filter");
const notesList = $("notes-list");
const emptyMsg = $("empty-msg");
const exportBtn = $("export-btn");
const importBtn = $("import-btn");
const importFile = $("import-file");
const installBtn = $("install-btn");
const notifyBtn = $("notify-btn");
const insecureWarning = $("insecure-warning");

const DB_NAME = "pense-bete-vocaux-pwa";
const DB_VERSION = 1;
const LS_NOTIFIED = "pense-bete-vocaux:notified";
const PALETTE = ["#0ea5e9", "#a78bfa", "#f472b6", "#fbbf24", "#4ade80", "#fb923c", "#2dd4bf", "#f87171"];

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let db = null;
let mediaRecorder = null;
let audioChunks = [];
let recognition = null;
let recording = false;
let currentAudioBlob = null;
let deferredInstallPrompt = null;
let activeCategory = "all";

if (!window.isSecureContext) insecureWarning.hidden = false;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("notes")) d.createObjectStore("notes", { keyPath: "id" });
      if (!d.objectStoreNames.contains("categories")) d.createObjectStore("categories", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx(store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
const getAll = (store) => new Promise((resolve, reject) => {
  const t = db.transaction(store, "readonly");
  const r = t.objectStore(store).getAll();
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});
const put = (store, value) => tx(store, "readwrite", (s) => s.put(value));
const del = (store, key) => tx(store, "readwrite", (s) => s.delete(key));

async function ensureDefaultCategory() {
  const cats = await getAll("categories");
  if (!cats.length) {
    await put("categories", { id: "general", name: "Général", color: PALETTE[0] });
  }
}

function newId() {
  return (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2));
}

function setupRecognition() {
  if (!SpeechRecognition) {
    recordStatus.textContent = "Transcription non disponible sur ce navigateur";
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "fr-FR";
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) noteText.value += t;
      else interim += t;
    }
    recordStatus.textContent = interim ? "Écoute… " + interim : "Enregistrement en cours…";
  };
  recognition.onerror = (e) => { recordStatus.textContent = "Erreur transcription : " + e.error; };
  recognition.onend = () => { if (recording) { try { recognition.start(); } catch { } } };
}

async function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    recordStatus.textContent = "Micro non disponible (HTTPS requis)";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    currentAudioBlob = null;
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      currentAudioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      stream.getTracks().forEach((t) => t.stop());
    };
    mediaRecorder.start();
    recording = true;
    recordBtn.textContent = "■ Arrêter";
    recordBtn.classList.add("recording");
    recordStatus.textContent = "Enregistrement en cours…";
    if (recognition) { try { recognition.start(); } catch { } }
  } catch (err) {
    recordStatus.textContent = "Accès au micro refusé : " + err.message;
  }
}

function stopRecording() {
  recording = false;
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  if (recognition) { try { recognition.stop(); } catch { } }
  recordBtn.textContent = "● Enregistrer";
  recordBtn.classList.remove("recording");
  recordStatus.textContent = "Enregistrement terminé";
}

recordBtn.addEventListener("click", () => { recording ? stopRecording() : startRecording(); });

newCategoryBtn.addEventListener("click", async () => {
  const name = prompt("Nom de la nouvelle catégorie :");
  if (!name || !name.trim()) return;
  const cats = await getAll("categories");
  const cat = { id: newId(), name: name.trim(), color: PALETTE[cats.length % PALETTE.length] };
  await put("categories", cat);
  await renderCategories();
  noteCategory.value = cat.id;
});

saveBtn.addEventListener("click", async () => {
  const text = noteText.value.trim();
  if (!text && !currentAudioBlob) {
    recordStatus.textContent = "Rien à enregistrer (parlez ou tapez du texte)";
    return;
  }
  const note = {
    id: newId(),
    text,
    categoryId: noteCategory.value || "general",
    createdAt: new Date().toISOString(),
    dueAt: noteDue.value ? new Date(noteDue.value).toISOString() : null,
    done: false,
    audio: currentAudioBlob || null,
  };
  await put("notes", note);
  noteText.value = "";
  noteDue.value = "";
  currentAudioBlob = null;
  recordStatus.textContent = "Note enregistrée ✔";
  await renderNotes();
});

readBtn.addEventListener("click", () => {
  const text = noteText.value.trim();
  if (text) speak(text);
});

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  const voice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith("fr"));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}
function fmtDue(iso) {
  return new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function isOverdue(note) {
  return !note.done && note.dueAt && new Date(note.dueAt) < new Date();
}

async function renderCategories() {
  const cats = await getAll("categories");
  noteCategory.innerHTML = "";
  for (const c of cats) {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name;
    noteCategory.append(o);
  }
  chipsBox.innerHTML = "";
  const all = document.createElement("button");
  all.className = "chip" + (activeCategory === "all" ? " active" : "");
  all.textContent = "Toutes";
  all.addEventListener("click", () => { activeCategory = "all"; renderCategories(); renderNotes(); });
  chipsBox.append(all);
  for (const c of cats) {
    const chip = document.createElement("button");
    chip.className = "chip" + (activeCategory === c.id ? " active" : "");
    chip.textContent = c.name;
    chip.style.borderLeft = "4px solid " + c.color;
    chip.addEventListener("click", () => { activeCategory = c.id; renderCategories(); renderNotes(); });
    chipsBox.append(chip);
  }
}

async function renderNotes() {
  const notes = await getAll("notes");
  const cats = await getAll("categories");
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const q = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const now = new Date();
  let list = notes.filter((n) => {
    if (activeCategory !== "all" && n.categoryId !== activeCategory) return false;
    if (q && !(n.text || "").toLowerCase().includes(q)) return false;
    if (status === "todo" && (n.done || isOverdue(n))) return false;
    if (status === "overdue" && !isOverdue(n)) return false;
    if (status === "done" && !n.done) return false;
    return true;
  });
  list.sort((a, b) => {
    const aOver = isOverdue(a), bOver = isOverdue(b);
    if (aOver !== bOver) return aOver ? -1 : 1;
    const ad = a.dueAt ? new Date(a.dueAt) : null;
    const bd = b.dueAt ? new Date(b.dueAt) : null;
    if (ad && bd && ad - bd) return ad - bd;
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  notesList.innerHTML = "";
  emptyMsg.hidden = list.length > 0;
  for (const note of list) {
    const cat = catById[note.categoryId] || { name: "Général", color: PALETTE[0] };
    const li = document.createElement("li");
    li.className = "note" + (isOverdue(note) ? " overdue" : "") + (note.done ? " done" : "");
    li.style.borderLeftColor = cat.color;

    const top = document.createElement("div");
    top.className = "note-top";
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.style.background = cat.color;
    badge.textContent = cat.name;
    const date = document.createElement("span");
    date.className = "note-date";
    date.textContent = fmtDate(note.createdAt);
    top.append(badge, date);
    if (note.dueAt) {
      const due = document.createElement("span");
      due.className = "due " + (isOverdue(note) ? "overdue" : "upcoming");
      due.textContent = (isOverdue(note) ? "⚠ en retard : " : "⏰ ") + fmtDue(note.dueAt);
      top.append(due);
    }
    li.append(top);

    if (note.text) {
      const p = document.createElement("p");
      p.className = "note-text";
      p.textContent = note.text;
      li.append(p);
    }
    if (note.audio) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = URL.createObjectURL(note.audio);
      li.append(audio);
    }
    const row = document.createElement("div");
    row.className = "note-actions";
    const doneLabel = document.createElement("label");
    const doneCb = document.createElement("input");
    doneCb.type = "checkbox";
    doneCb.checked = !!note.done;
    doneCb.addEventListener("change", async () => {
      note.done = doneCb.checked;
      await put("notes", note);
      renderNotes();
    });
    doneLabel.append(doneCb, document.createTextNode(" faite"));
    row.append(doneLabel);
    if (note.text) {
      const listen = document.createElement("button");
      listen.textContent = "🔊 Écouter";
      listen.addEventListener("click", () => speak(note.text));
      row.append(listen);
    }
    const catSel = document.createElement("select");
    for (const c of cats) {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name;
      if (c.id === note.categoryId) o.selected = true;
      catSel.append(o);
    }
    catSel.addEventListener("change", async () => {
      note.categoryId = catSel.value;
      await put("notes", note);
      renderNotes();
    });
    row.append(catSel);
    const del = document.createElement("button");
    del.textContent = "🗑️";
    del.addEventListener("click", async () => {
      await del("notes", note.id);
      renderNotes();
    });
    row.append(del);
    li.append(row);
    notesList.append(li);
  }
}

searchInput.addEventListener("input", renderNotes);
statusFilter.addEventListener("change", renderNotes);

function blobToDataURL(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

exportBtn.addEventListener("click", async () => {
  const notes = await getAll("notes");
  const cats = await getAll("categories");
  const out = [];
  for (const n of notes) {
    out.push({ ...n, audio: n.audio ? await blobToDataURL(n.audio) : null });
  }
  const blob = new Blob([JSON.stringify({ categories: cats, notes: out }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pense-bete-vocaux.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const f = importFile.files[0];
  if (!f) return;
  const data = JSON.parse(await f.text());
  for (const c of data.categories || []) await put("categories", c);
  for (const n of data.notes || []) {
    if ((await getAll("notes")).some((x) => x.id === n.id)) continue;
    if (n.audio) n.audio = await (await fetch(n.audio)).blob();
    await put("notes", n);
  }
  await renderCategories();
  await renderNotes();
  importFile.value = "";
});

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBtn.hidden = true;
});

notifyBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    recordStatus.textContent = "Notifications non disponibles sur ce navigateur";
    return;
  }
  const perm = await Notification.requestPermission();
  recordStatus.textContent = perm === "granted" ? "Rappels activés 🔔" : "Rappels refusés (" + perm + ")";
  checkDue();
});

function notifiedIds() {
  try { return JSON.parse(localStorage.getItem(LS_NOTIFIED)) || []; } catch { return []; }
}
function markNotified(id) {
  const ids = notifiedIds();
  ids.push(id);
  localStorage.setItem(LS_NOTIFIED, JSON.stringify(ids));
}
function checkDue() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  getAll("notes").then((notes) => {
    const done = new Set(notifiedIds());
    for (const n of notes) {
      if (n.done || !n.dueAt || done.has(n.id)) continue;
      if (new Date(n.dueAt) < new Date()) {
        new Notification("⏰ Pense-bête vocal en retard", {
          body: (n.text || "(note audio)").slice(0, 120) + " — échéance " + fmtDue(n.dueAt),
          tag: n.id,
        });
        markNotified(n.id);
      }
    }
  });
}

async function init() {
  db = await openDB();
  await ensureDefaultCategory();
  await renderCategories();
  await renderNotes();
  if (window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    recordBtn.disabled = false;
    recordStatus.textContent = "Prêt à enregistrer";
    setupRecognition();
  } else {
    recordBtn.disabled = true;
    recordStatus.textContent = window.isSecureContext ? "Micro non disponible" : "HTTPS requis pour le micro";
  }
  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  checkDue();
  setInterval(checkDue, 60000);
}

init();
