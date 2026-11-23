import { dateKey, parseDay } from "./domain.js";
export function weekendEvent(events, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const today = `${parts.year}-${parts.month}-${parts.day}`,
    time = `${parts.hour}:${parts.minute}`;
  const event =
    events
      .filter(
        (e) =>
          ["Missa", "Culto da Palavra", "Celebração"].includes(e.type) &&
          e.status === "Confirmado" &&
          [0, 6].includes(parseDay(e.date).getDay()) &&
          (e.date > today ||
            (e.date === today && e.start_time.slice(0, 5) >= time)),
      )
      .sort((a, b) =>
        (a.date + a.start_time).localeCompare(b.date + b.start_time),
      )[0] || null;
  const start = event ? parseDay(event.date) : parseDay(today);
  if (event) {
    if (start.getDay() === 0) start.setDate(start.getDate() - 1);
  } else start.setDate(start.getDate() + ((6 - start.getDay() + 7) % 7 || 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { event, from: dateKey(start), to: dateKey(end) };
}
