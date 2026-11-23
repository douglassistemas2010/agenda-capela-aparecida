import test from "node:test";
import assert from "node:assert/strict";
import { weekendEvent } from "../src/weekend.js";
test("Cartão usa celebração confirmada do fim de semana e ignora cancelamentos e passado", () => {
  const base = { type: "Missa", status: "Confirmado", start_time: "09:00" };
  const result = weekendEvent(
    [
      { ...base, id: "passada", date: "2026-11-22" },
      { ...base, id: "semana", date: "2026-11-23" },
      { ...base, id: "cancelada", date: "2026-11-28", status: "Cancelado" },
      {
        ...base,
        id: "proxima",
        type: "Culto da Palavra",
        date: "2026-11-29",
        start_time: "19:00",
      },
    ],
    new Date("2026-11-22T15:00:00Z"),
  );
  assert.equal(result.event.id, "proxima");
  assert.equal(result.from, "2026-11-28");
  assert.equal(result.to, "2026-11-29");
});
test("Sem evento, não inventa missa, celebração ou horário", () => {
  const result = weekendEvent([], new Date("2026-11-23T15:00:00Z"));
  assert.equal(result.event, null);
  assert.equal(result.from, "2026-11-28");
});
