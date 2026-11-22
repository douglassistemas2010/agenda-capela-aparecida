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
  assert.equal(roleKeys.length, 4);
  assert.equal(roleLabel("conselho_administrativo"), "Conselho Administrativo");
  for (const [role, agenda, financial, confirmation] of [
    ["admin", true, true, true],
    ["conselho_administrativo", true, false, false],
    ["conselho_economico", false, true, true],
    ["pastoral_dizimo", false, true, false],
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
