import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedCategories,
  canNotify,
  validateCampaign,
  trustedPushEndpoint,
} from "../src/notification-domain.js";
test("Disparos respeitam as responsabilidades dos perfis", () => {
  assert.equal(allowedCategories("admin").length, 8);
  assert.deepEqual(allowedCategories("conselho_economico"), [
    "recebimento_dizimo",
    "recebimento_oferta",
  ]);
  assert.equal(canNotify("pastoral_dizimo", "aniversario"), true);
  assert.equal(
    canNotify("conselho_administrativo", "recebimento_dizimo"),
    false,
  );
  assert.equal(canNotify("consulta", "comunicado"), false);
});
test("Recebimentos exigem pagamento e aniversários exigem destinatário", () => {
  const base = { title: "Aviso", body: "Paz e bem", audience: "todos" };
  assert.ok(validateCampaign({ ...base, category: "aniversario" }));
  assert.equal(
    validateCampaign({
      ...base,
      category: "aniversario",
      recipient_id: "pessoa",
    }),
    null,
  );
  assert.ok(validateCampaign({ ...base, category: "recebimento_dizimo" }));
  assert.equal(
    validateCampaign({
      ...base,
      category: "recebimento_dizimo",
      contribution_id: "pagamento",
    }),
    null,
  );
  assert.ok(
    validateCampaign({
      ...base,
      category: "comunicado",
      scheduled_at: "2000-01-01T10:00:00Z",
    }),
  );
  assert.ok(
    validateCampaign({
      ...base,
      category: "comunicado",
      body: "x".repeat(241),
    }),
  );
});
test("Push só pode chamar provedores conhecidos por HTTPS", () => {
  for (const endpoint of [
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://web.push.apple.com/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://wns2.notify.windows.com/abc",
  ])
    assert.equal(trustedPushEndpoint(endpoint), true, endpoint);
  for (const endpoint of [
    "http://localhost",
    "https://127.0.0.1",
    "https://fcm.googleapis.com.evil.example/",
    "https://fcm.googleapis.com@evil.example",
    "https://fcm.googleapis.com:1234/",
    "invalid",
  ])
    assert.equal(trustedPushEndpoint(endpoint), false, endpoint);
});
