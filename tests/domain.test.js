import test from "node:test";
import assert from "node:assert/strict";
import { fee, conflicts, period, shareText } from "../src/domain.js";
import { pixPayload } from "../src/pix.js";
test("Taxas de casamento e outros encontros", () => {
  assert.equal(fee("Casamento", true), 150);
  assert.equal(fee("Casamento", false), 350);
  assert.equal(fee("Retiro", false), 0);
});
test("Horários adjacentes permitidos e sobreposição bloqueada", () => {
  const events = [
    {
      id: "1",
      date: "2026-11-22",
      start_time: "09:00",
      end_time: "10:00",
      status: "Confirmado",
    },
  ];
  assert.equal(
    conflicts(events, {
      date: "2026-11-22",
      start_time: "09:30",
      end_time: "11:00",
    }),
    true,
  );
  assert.equal(
    conflicts(events, {
      date: "2026-11-22",
      start_time: "10:00",
      end_time: "11:00",
    }),
    false,
  );
  assert.equal(conflicts(events, { ...events[0] }), false);
  assert.equal(
    conflicts([{ ...events[0], status: "Cancelado" }], {
      date: "2026-11-22",
      start_time: "09:00",
      end_time: "11:00",
    }),
    false,
  );
});
test("Semana atravessa mudança de mês e ano", () => {
  assert.deepEqual(period(new Date(2027, 0, 1, 12), "Semana"), [
    "2026-12-27",
    "2027-01-02",
  ]);
  assert.deepEqual(period(new Date(2028, 1, 14, 12), "Mês"), [
    "2028-02-01",
    "2028-02-29",
  ]);
});
test("WhatsApp omite dados internos e reservas canceladas", () => {
  const text = shareText(
    [
      {
        date: "2026-11-22",
        start_time: "09:00",
        end_time: "10:00",
        type: "Missa",
        title: "Comunidade",
        contact: "SEGREDO",
        notes: "PRIVADO",
        status: "Confirmado",
      },
      { status: "Cancelado", title: "CANCELADO" },
    ],
    "Hoje",
  );
  assert.ok(text.includes("Comunidade"));
  assert.ok(!text.includes("SEGREDO"));
  assert.ok(!text.includes("PRIVADO"));
  assert.ok(!text.includes("CANCELADO"));
});
test("Pix gera TLV e CRC válido de forma independente", () => {
  const p = pixPayload(
    "123e4567-e89b-12d3-a456-426614174000",
    "CAPELA",
    "CIDADE",
    150,
  );
  assert.ok(p.includes("5406150.00"));
  let crc = 65535;
  for (const ch of p.slice(0, -4)) {
    crc ^= ch.charCodeAt(0) * 256;
    for (let i = 0; i < 8; i++) crc = (crc * 2) ^ (crc & 32768 ? 0x1021 : 0);
    crc &= 65535;
  }
  assert.equal(p.slice(-4), crc.toString(16).toUpperCase().padStart(4, "0"));
  assert.ok(!pixPayload("chave", "nome", "cidade", 0).includes("54040.00"));
});
