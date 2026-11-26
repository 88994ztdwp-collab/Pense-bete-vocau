import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { playAudio } from "../audio";
import { speak } from "../speech";

function fmt(iso) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}
function fmtDue(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NoteCard({ note, category, onToggleDone, onDelete, onChangeCategory }) {
  const overdue = !note.done && note.due_at && new Date(note.due_at) < new Date();
  return (
    <View
      style={[
        styles.card,
        { borderLeftColor: category?.color || "#0ea5e9" },
        note.done && styles.done,
        overdue && styles.overdue,
      ]}
    >
      <View style={styles.top}>
        <TouchableOpacity onPress={() => onChangeCategory(note)}>
          <View style={[styles.badge, { backgroundColor: category?.color || "#0ea5e9" }]}>
            <Text style={styles.badgeText}>{category?.name || "Général"}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.date}>{fmt(note.created_at)}</Text>
        {!!note.due_at && (
          <Text style={[styles.due, overdue ? styles.dueOverdue : styles.dueUpcoming]}>
            {(overdue ? "⚠ en retard : " : "⏰ ") + fmtDue(note.due_at)}
          </Text>
        )}
      </View>
      {!!note.text && <Text style={styles.text}>{note.text}</Text>}
      <View style={styles.actions}>
        {!!note.audio_path && (
          <TouchableOpacity style={styles.btn} onPress={() => playAudio(note.audio_path)}>
            <Text style={styles.btnText}>▶ Audio</Text>
          </TouchableOpacity>
        )}
        {!!note.text && (
          <TouchableOpacity style={styles.btn} onPress={() => speak(note.text)}>
            <Text style={styles.btnText}>🔊 Lire</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.btn} onPress={() => onToggleDone(note)}>
          <Text style={styles.btnText}>{note.done ? "↩ À faire" : "✔ Faite"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => onDelete(note)}>
          <Text style={[styles.btnText, { color: "#f87171" }]}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 10,
  },
  done: { opacity: 0.55 },
  overdue: { borderLeftColor: "#f87171" },
  top: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: "#082f49", fontWeight: "700", fontSize: 12 },
  date: { color: "#94a3b8", fontSize: 12 },
  due: { fontSize: 12, fontWeight: "600" },
  dueOverdue: { color: "#f87171" },
  dueUpcoming: { color: "#0ea5e9" },
  text: { color: "#e2e8f0", marginTop: 6, fontSize: 15 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  btn: {
    backgroundColor: "#273549",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnText: { color: "#e2e8f0", fontSize: 13 },
});
