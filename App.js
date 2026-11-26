import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import {
  initDb,
  listCategories,
  addCategory,
  listNotes,
  insertNote,
  updateNote,
  deleteNote,
} from "./src/db";
import { requestMicPermission, startRecording, stopRecording } from "./src/audio";
import { ensureNotificationPermission, scheduleDueReminder, cancelDueReminder } from "./src/notifications";
import NoteCard from "./src/components/NoteCard";

const PALETTE = ["#0ea5e9", "#a78bfa", "#f472b6", "#fbbf24", "#4ade80", "#fb923c", "#2dd4bf", "#f87171"];
const STATUS_FILTERS = [
  { id: "all", label: "Toutes" },
  { id: "todo", label: "À faire" },
  { id: "overdue", label: "En retard" },
  { id: "done", label: "Terminées" },
];

export default function App() {
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [text, setText] = useState("");
  const [newCat, setNewCat] = useState("");
  const [categoryId, setCategoryId] = useState("general");
  const [dueAt, setDueAt] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);
  const [status, setStatus] = useState("Prêt");
  const [activeCategory, setActiveCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    setNotes(await listNotes());
    setCategories(await listCategories());
  }, []);

  useEffect(() => {
    (async () => {
      await initDb();
      await ensureNotificationPermission();
      await refresh();
    })();
  }, [refresh]);

  const isOverdue = (n) => !n.done && n.due_at && new Date(n.due_at) < new Date();

  const toggleRecording = async () => {
    if (recording) {
      const uri = await stopRecording(recording);
      setRecording(null);
      setRecordingUri(uri);
      setStatus(uri ? "Audio enregistré ✔" : "Enregistrement annulé");
      return;
    }
    const ok = await requestMicPermission();
    if (!ok) {
      setStatus("Permission micro refusée");
      return;
    }
    try {
      const rec = await startRecording();
      setRecording(rec);
      setRecordingUri(null);
      setStatus("Enregistrement en cours… (re-tapez pour arrêter)");
    } catch (e) {
      setStatus("Erreur micro : " + (e?.message || e));
    }
  };

  const saveNote = async () => {
    if (!text.trim() && !recordingUri) {
      setStatus("Rien à enregistrer (tapez une note ou enregistrez l'audio)");
      return;
    }
    const note = {
      id: "note-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      text: text.trim(),
      categoryId,
      createdAt: new Date().toISOString(),
      dueAt: dueAt ? dueAt.toISOString() : null,
      done: false,
      audioPath: recordingUri,
    };
    await insertNote(note);
    if (note.dueAt) await scheduleDueReminder(note.id, note.text, note.dueAt);
    setText("");
    setDueAt(null);
    setRecordingUri(null);
    setStatus("Note enregistrée ✔");
    await refresh();
  };

  const addNewCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    const cat = await addCategory(name, PALETTE[categories.length % PALETTE.length]);
    setNewCat("");
    setCategoryId(cat.id);
    await refresh();
  };

  const onToggleDone = async (note) => {
    await updateNote({
      id: note.id,
      text: note.text,
      categoryId: note.category_id,
      dueAt: note.due_at,
      done: !note.done,
      audioPath: note.audio_path,
    });
    if (note.done) {
      if (note.due_at) await scheduleDueReminder(note.id, note.text, note.due_at);
    } else {
      await cancelDueReminder(note.id);
    }
    await refresh();
  };

  const onDelete = async (note) => {
    await deleteNote(note.id);
    await cancelDueReminder(note.id);
    await refresh();
  };

  const onChangeCategory = (note) => {
    Alert.alert("Déplacer dans…", undefined, [
      ...categories.map((c) => ({
        text: c.name,
        onPress: async () => {
          await updateNote({
            id: note.id,
            text: note.text,
            categoryId: c.id,
            dueAt: note.due_at,
            done: !!note.done,
            audioPath: note.audio_path,
          });
          await refresh();
        },
      })),
      { text: "Annuler", style: "cancel" },
    ]);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = notes.filter((n) => {
      if (activeCategory !== "all" && n.category_id !== activeCategory) return false;
      if (q && !(n.text || "").toLowerCase().includes(q)) return false;
      if (statusFilter === "todo" && (n.done || isOverdue(n))) return false;
      if (statusFilter === "overdue" && !isOverdue(n)) return false;
      if (statusFilter === "done" && !n.done) return false;
      return true;
    });
    return list.sort((a, b) => {
      const ao = isOverdue(a);
      const bo = isOverdue(b);
      if (ao !== bo) return ao ? -1 : 1;
      const ad = a.due_at ? new Date(a.due_at) : null;
      const bd = b.due_at ? new Date(b.due_at) : null;
      if (ad && bd && ad - bd) return ad - bd;
      if (ad && !bd) return -1;
      if (!ad && bd) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [notes, activeCategory, statusFilter, query]);

  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>🎙️ Pense-bête vocaux</Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.card}>
              <View style={styles.recRow}>
                <TouchableOpacity
                  style={[styles.recordBtn, recording && styles.recording]}
                  onPress={toggleRecording}
                >
                  <Text style={styles.recordText}>{recording ? "■ Arrêter" : "● Enregistrer"}</Text>
                </TouchableOpacity>
                <Text style={styles.status}>{status}</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Tapez votre note ici…"
                placeholderTextColor="#94a3b8"
                multiline
                value={text}
                onChangeText={setText}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, categoryId === c.id && styles.chipActive, { borderLeftColor: c.color, borderLeftWidth: 4 }]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.newCatRow}>
                <TextInput
                  style={[styles.input, styles.newCatInput]}
                  placeholder="Nouvelle catégorie…"
                  placeholderTextColor="#94a3b8"
                  value={newCat}
                  onChangeText={setNewCat}
                />
                <TouchableOpacity style={styles.smallBtn} onPress={addNewCategory}>
                  <Text style={styles.smallBtnText}>＋</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dueRow}>
                <TouchableOpacity style={styles.smallBtn} onPress={() => setShowPicker(true)}>
                  <Text style={styles.smallBtnText}>
                    {dueAt ? "⏰ " + dueAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "⏰ Ajouter une échéance"}
                  </Text>
                </TouchableOpacity>
                {!!dueAt && (
                  <TouchableOpacity style={styles.smallBtn} onPress={() => setDueAt(null)}>
                    <Text style={[styles.smallBtnText, { color: "#f87171" }]}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {showPicker && (
                <DateTimePicker
                  value={dueAt || new Date()}
                  mode="datetime"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(e, d) => {
                    if (Platform.OS === "android") setShowPicker(false);
                    if (d) setDueAt(d);
                  }}
                />
              )}
              <TouchableOpacity style={styles.saveBtn} onPress={saveNote}>
                <Text style={styles.saveText}>💾 Enregistrer la note</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="🔍 Rechercher…"
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={setQuery}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              <TouchableOpacity
                style={[styles.chip, activeCategory === "all" && styles.chipActive]}
                onPress={() => setActiveCategory("all")}
              >
                <Text style={[styles.chipText, activeCategory === "all" && styles.chipTextActive]}>Toutes</Text>
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, activeCategory === c.id && styles.chipActive, { borderLeftColor: c.color, borderLeftWidth: 4 }]}
                  onPress={() => setActiveCategory(c.id)}
                >
                  <Text style={[styles.chipText, activeCategory === c.id && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {STATUS_FILTERS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, statusFilter === s.id && styles.chipActive]}
                  onPress={() => setStatusFilter(s.id)}
                >
                  <Text style={[styles.chipText, statusFilter === s.id && styles.chipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.listTitle}>Mes notes ({filtered.length})</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Aucune note pour le moment.</Text>}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            category={catById[item.category_id]}
            onToggleDone={onToggleDone}
            onDelete={onDelete}
            onChangeCategory={onChangeCategory}
          />
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0f172a" },
  header: {
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1e293b",
    borderBottomColor: "#334155",
    borderBottomWidth: 1,
  },
  title: { color: "#e2e8f0", fontSize: 20, fontWeight: "700" },
  content: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  recRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  recordBtn: {
    backgroundColor: "#7f1d1d",
    borderColor: "#ef4444",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recording: { backgroundColor: "#dc2626" },
  recordText: { color: "#fff", fontWeight: "700" },
  status: { color: "#94a3b8", fontSize: 12, flexShrink: 1 },
  input: {
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    marginBottom: 8,
  },
  chipsRow: { flexDirection: "row", marginBottom: 8 },
  chip: {
    backgroundColor: "#273549",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  chipActive: { backgroundColor: "#0ea5e9", borderColor: "#0ea5e9" },
  chipText: { color: "#e2e8f0", fontSize: 13 },
  chipTextActive: { color: "#082f49", fontWeight: "700" },
  newCatRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  newCatInput: { flex: 1, marginBottom: 0 },
  dueRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  smallBtn: {
    backgroundColor: "#273549",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallBtnText: { color: "#e2e8f0", fontSize: 13 },
  saveBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  saveText: { color: "#082f49", fontWeight: "700", fontSize: 15 },
  listTitle: { color: "#e2e8f0", fontSize: 16, fontWeight: "700", marginVertical: 4 },
  empty: { color: "#94a3b8", textAlign: "center", marginTop: 20 },
});
