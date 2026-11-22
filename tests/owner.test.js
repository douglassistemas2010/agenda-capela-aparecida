import test from "node:test";
import assert from "node:assert/strict";
import { owner, loginEmail } from "../src/owner.js";
test("Apelido Douglas resolve somente para o e-mail do proprietário", () => {
  assert.equal(loginEmail(" Douglas "), owner.email);
  assert.equal(loginEmail("OUTRO@example.com"), "outro@example.com");
  assert.equal(loginEmail("douglas@outro.com"), "douglas@outro.com");
  assert.equal(loginEmail(""), "");
});
