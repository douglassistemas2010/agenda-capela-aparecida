export const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDay = (s) => new Date(`${s}T12:00:00`);
export const fee = (type, contributor) =>
  type === "Casamento" ? (contributor ? 150 : 350) : 0;
export function period(date, view) {
  const start = parseDay(dateKey(date)),
    end = new Date(start);
  if (view === "Mês") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }
  if (view === "Semana") {
    start.setDate(start.getDate() - start.getDay());
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
  }
  return [dateKey(start), dateKey(end)];
}
export function conflicts(events, item) {
  return events.some(
    (e) =>
      e.id !== item.id &&
      e.status !== "Cancelado" &&
      e.date === item.date &&
      e.start_time < item.end_time &&
      e.end_time > item.start_time,
  );
}
export function shareText(events, label) {
  return `*Agenda • Capela Nossa Senhora Aparecida*\nBairro União · ${label}\n\n${
    events
      .filter((e) => e.status !== "Cancelado")
      .map(
        (e) =>
          `${parseDay(e.date).toLocaleDateString("pt-BR")} • ${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)}\n${e.type} · ${e.title}`,
      )
      .join("\n\n") || "Nenhuma reserva neste período."
  }\n\nConsulte o Conselho Administrativo para informações.`;
}
