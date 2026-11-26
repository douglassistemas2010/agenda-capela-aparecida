import test from "node:test";
import assert from "node:assert/strict";
import {
  roleKeys,
  roleLabel,
  canOrganize,
  canManageContributions,
  canConfirm,
} from "../src/roles.js";
test("Perfis separam agenda, acompanhamento e conferência financeira", () => {
  assert.equal(roleKeys.length, 3);
  assert.equal(roleLabel("agente_pastoral"), "Agente de Pastoral");
  for (const [role, agenda, financial, confirmation] of [
    ["admin", true, true, true],
    ["agente_pastoral", true, true, false],
    ["dizimista", false, false, false],
    ["pastoral_dizimo", false, false, false],
    ["secretaria", false, false, false],
    ["desconhecido", false, false, false],
    [undefined, false, false, false],
  ]) {
    assert.deepEqual(
      [canOrganize(role), canManageContributions(role), canConfirm(role)],
      [agenda, financial, confirmation],
      role,
    );
  }
});
