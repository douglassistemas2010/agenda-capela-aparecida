import test from "node:test";
import assert from "node:assert/strict";
import { parseImport } from "../src/parishioner-import.js";
test("CSV do Excel preserva código, aspas e nascimento brasileiro", () => {
  const rows = parseImport(
    '\uFEFFCódigo;Nome;Telefone;Nascimento;Observações\r\n001;Maria;44999999999;02/01/1980;"Texto; com separador"',
  );
  assert.equal(rows[0].record.external_code, "001");
  assert.equal(rows[0].record.birthday, "1980-01-02");
  assert.equal(rows[0].record.notes, "Texto; com separador");
  assert.deepEqual(rows[0].errors, []);
});
test("Prévia aponta data inexistente e contato inválido", () => {
  const [row] = parseImport("Nome,Email,Nascimento\nMaria,errado,31/02/2000");
  assert.equal(row.errors.length, 2);
});
test("Rejeita cabeçalho, limites e CSV truncado", () => {
  assert.throws(() => parseImport("Telefone\n123"), /Nome/);
  assert.throws(() => parseImport('Nome\n"Maria'), /Aspas/);
  assert.throws(() => parseImport("Nome\n"), /entre 1 e 1000/);
});
test('Bloqueia texto com caractere perdido na extração do PDF', () => {
  assert.equal(parseImport('Nome\nAnt\ufffdnia')[0].errors.length, 1);
});
