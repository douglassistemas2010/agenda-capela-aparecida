import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import {
  canNotify,
  trustedPushEndpoint,
} from "../../../src/notification-domain.js";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: cors });
const uuid = (v: unknown) =>
  typeof v === "string" &&
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v);
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")
    return json({ error: "Método não permitido" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!,
      anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const secret = Deno.env.get("NOTIFICATION_CRON_SECRET");
    const cron =
      !!secret &&
      secret.length >= 32 &&
      req.headers.get("x-cron-secret") === secret;
    const body = await req.json();
    const service = createClient(
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    if (!cron) {
      if (!uuid(body.campaign_id))
        return json({ error: "Informe um aviso válido" }, 400);
      const client = createClient(url, anon, {
        global: {
          headers: { Authorization: req.headers.get("Authorization") || "" },
        },
        auth: { persistSession: false },
      });
      const {
        data: { user },
        error,
      } = await client.auth.getUser();
      if (error || !user)
        return json({ error: "Autenticação necessária" }, 401);
      const { data: profile } = await client
        .from("profiles")
        .select("role,approved")
        .eq("id", user.id)
        .single();
      const { data: c } = await client
        .from("notification_campaigns")
        .select("category")
        .eq("id", body.campaign_id)
        .single();
      if (!profile?.approved || !c || !canNotify(profile.role, c.category))
        return json({ error: "Acesso negado" }, 403);
    }
    const pub = Deno.env.get("VAPID_PUBLIC_KEY"),
      priv = Deno.env.get("VAPID_PRIVATE_KEY"),
      subject = Deno.env.get("VAPID_SUBJECT");
    if (!pub || !priv || !subject)
      return json({ error: "Serviço push ainda não configurado" }, 503);
    webpush.setVapidDetails(subject, pub, priv);
    let ids: string[];
    if (cron) {
      const cutoff = new Date(Date.now() - 600000).toISOString();
      const { data, error } = await service
        .from("notification_campaigns")
        .select("id")
        .lte("scheduled_at", new Date().toISOString())
        .or(
          `status.eq.queued,and(status.eq.processing,processing_started_at.lt.${cutoff})`,
        )
        .order("scheduled_at")
        .limit(2);
      if (error) throw error;
      ids = (data || []).map((item) => item.id);
    } else ids = [body.campaign_id];
    const results = [];
    for (const id of ids) results.push(await dispatch(service, id));
    return json({ results });
  } catch {
    return json(
      {
        error:
          "Falha ao processar notificações. Consulte o histórico e os logs do serviço.",
      },
      500,
    );
  }
});
async function dispatch(service: any, id: string) {
  const { data: claims, error } = await service.rpc("claim_notification", {
    p_id: id,
  });
  if (error) throw error;
  const campaign = claims?.[0];
  if (!campaign) return { id, status: "not_claimed" };
  const { data: creator } = await service
    .from("profiles")
    .select("role,approved")
    .eq("id", campaign.created_by)
    .single();
  if (!creator?.approved || !canNotify(creator.role, campaign.category))
    return cancel("O autor não possui mais permissão para este assunto");
  if (campaign.category.startsWith("recebimento_")) {
    const { data: p } = await service
      .from("contributions")
      .select("status,kind,user_id,parishioner_id")
      .eq("id", campaign.contribution_id)
      .single();
    let target = p?.user_id;
    if (p?.parishioner_id) {
      const { data: person } = await service
        .from("parishioners")
        .select("linked_user_id")
        .eq("id", p.parishioner_id)
        .single();
      target = person?.linked_user_id;
    }
    if (
      !p ||
      p.status !== "Confirmado" ||
      target !== campaign.recipient_id ||
      p.kind !==
        (campaign.category === "recebimento_dizimo" ? "Dízimo" : "Oferta")
    )
      return cancel(
        "O pagamento ou o vínculo foi alterado. Revise antes de criar outro aviso",
      );
  }
  let query = service
    .from("push_subscriptions")
    .select("id,user_id,subscription,profiles!inner(approved,role)")
    .eq("profiles.approved", true);
  if (campaign.audience === "pessoa")
    query = query.eq("user_id", campaign.recipient_id);
  else if (campaign.audience !== "todos")
    query = query.eq("profiles.role", campaign.audience);
  const { data: candidates, error: subError } = await query;
  if (subError) throw subError;
  if (candidates?.length) {
    const { error } = await service.from("notification_deliveries").upsert(
      candidates.map((s: any) => ({
        campaign_id: id,
        subscription_id: s.id,
        user_id: s.user_id,
      })),
      { onConflict: "campaign_id,subscription_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  }
  const { data: pending, error: pendingError } = await service
    .from("notification_deliveries")
    .select("id,subscription_id")
    .eq("campaign_id", id)
    .eq("status", "pending")
    .limit(40);
  if (pendingError) throw pendingError;
  for (let offset = 0; offset < (pending?.length || 0); offset += 4) {
    await Promise.all(
      pending.slice(offset, offset + 4).map(async (d: any) => {
        const { data: status, error } = await service.rpc(
          "claim_notification_delivery",
          { p_id: d.id },
        );
        if (error) throw error;
        if (status !== "sending") return;
        const s = candidates?.find(
          (candidate: any) => candidate.id === d.subscription_id,
        );
        if (!s || !trustedPushEndpoint(s.subscription?.endpoint)) {
          await record(d.id, "skipped", null);
          return;
        }
        try {
          await webpush.sendNotification(
            s.subscription,
            JSON.stringify({
              title: campaign.title,
              body: campaign.body,
              tag: `capela-${id}`,
            }),
            { TTL: 86400, timeout: 5000 },
          );
        } catch (error: any) {
          await record(
            d.id,
            error.statusCode ? "failed" : "unknown",
            error.statusCode || null,
          );
          if ([404, 410].includes(error.statusCode))
            await service.from("push_subscriptions").delete().eq("id", s.id);
          return;
        }
        // Se a gravação falhar, o lease vira unknown: não duplicar o envio.
        await record(d.id, "accepted", 201);
      }),
    );
  }
  const { data: outcomes, error: outcomeError } = await service
    .from("notification_deliveries")
    .select("status")
    .eq("campaign_id", id);
  if (outcomeError) throw outcomeError;
  const counts = (outcomes || []).reduce((acc: any, row: any) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const more = !!counts.pending,
    failed = (counts.failed || 0) + (counts.unknown || 0);
  const result = more
    ? "queued"
    : failed
      ? counts.accepted
        ? "partial"
        : "failed"
      : "completed";
  const { error: finishError } = await service
    .from("notification_campaigns")
    .update({
      status: result,
      accepted_count: counts.accepted || 0,
      failed_count: counts.failed || 0,
      skipped_count: counts.skipped || 0,
      unknown_count: counts.unknown || 0,
      error_message: !outcomes?.length
        ? "Nenhum dispositivo aprovado e inscrito para este público"
        : null,
      finished_at: more ? null : new Date().toISOString(),
    })
    .eq("id", id);
  if (finishError) throw finishError;
  return {
    id,
    status: result,
    accepted: counts.accepted || 0,
    failed: counts.failed || 0,
    unknown: counts.unknown || 0,
  };
  async function record(
    deliveryId: string,
    status: string,
    http_status: number | null,
  ) {
    const { error } = await service
      .from("notification_deliveries")
      .update({ status, http_status, processed_at: new Date().toISOString() })
      .eq("id", deliveryId);
    if (error) throw error;
  }
  async function cancel(reason: string) {
    const { error } = await service
      .from("notification_campaigns")
      .update({
        status: "cancelled",
        error_message: reason,
        finished_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    return { id, status: "cancelled" };
  }
}
