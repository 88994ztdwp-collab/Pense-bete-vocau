import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

export async function scheduleDueReminder(noteId, text, dueAt) {
  try {
    await Notifications.cancelScheduledNotificationAsync(noteId);
    await Notifications.scheduleNotificationAsync({
      identifier: noteId,
      content: {
        title: "⏰ Pense-bête vocal",
        body: (text || "(note audio)").slice(0, 120),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(dueAt),
      },
    });
  } catch {
  }
}

export async function cancelDueReminder(noteId) {
  try {
    await Notifications.cancelScheduledNotificationAsync(noteId);
  } catch {
  }
}
