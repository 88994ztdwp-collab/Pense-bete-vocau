import * as SQLite from "expo-sqlite";

let dbPromise = null;

export function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync("pense-bete-vocaux.db");
  return dbPromise;
}

export async function initDb() {
  const db = await getDb();
  await db.execAsync(
    "CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL);" +
      "CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, text TEXT NOT NULL DEFAULT '', category_id TEXT NOT NULL, created_at TEXT NOT NULL, due_at TEXT, done INTEGER NOT NULL DEFAULT 0, audio_path TEXT);"
  );
  const row = await db.getFirstAsync("SELECT COUNT(*) AS c FROM categories");
  if (!row || !row.c) {
    await db.runAsync("INSERT INTO categories (id, name, color) VALUES (?, ?, ?)", [
      "general",
      "Général",
      "#0ea5e9",
    ]);
  }
}

export async function listCategories() {
  const db = await getDb();
  return db.getAllAsync("SELECT * FROM categories ORDER BY name");
}

export async function addCategory(name, color) {
  const db = await getDb();
  const id = "cat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  await db.runAsync("INSERT INTO categories (id, name, color) VALUES (?, ?, ?)", [id, name, color]);
  return { id, name, color };
}

export async function listNotes() {
  const db = await getDb();
  return db.getAllAsync("SELECT * FROM notes");
}

export async function insertNote(note) {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO notes (id, text, category_id, created_at, due_at, done, audio_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [note.id, note.text, note.categoryId, note.createdAt, note.dueAt || null, note.done ? 1 : 0, note.audioPath || null]
  );
}

export async function updateNote(note) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE notes SET text = ?, category_id = ?, due_at = ?, done = ?, audio_path = ? WHERE id = ?",
    [note.text, note.categoryId, note.dueAt || null, note.done ? 1 : 0, note.audioPath || null, note.id]
  );
}

export async function deleteNote(id) {
  const db = await getDb();
  await db.runAsync("DELETE FROM notes WHERE id = ?", [id]);
}
