import React, { useEffect, useState, useRef } from "react";
import {
  Bell,
  Send,
  Clock,
  ShieldCheck,
  Check,
  ChevronLeft,
  CalendarDays,
  Settings2,
  History,
  Eye,
  Smartphone,
  XCircle,
  Gift,
  Wallet,
  MessageSquare,
  PartyPopper,
} from "lucide-react";
import {
  notificationCategories as categories,
  allowedCategories,
  emptyPreferences,
  validateCampaign,
} from "./notification-domain";
import { roles } from "./roles";
import { dateKey } from "./domain";
const statusLabels = {
  queued: "Na fila",
  processing: "Processando",
  completed: "Concluído",
  partial: "Concluído com falhas",
  failed: "Falhou",
  cancelled: "Cancelado",
};
const audienceLabels = {
  todos: "Todos os inscritos",
  pessoa: "Uma pessoa",
  ...roles,
};
const icons = {
  aniversario: Gift,
  recebimento_dizimo: Wallet,
  recebimento_oferta: Wallet,
  promocao: PartyPopper,
  comunicado: MessageSquare,
};
export default function Notifications({
  db,
  profile,
  demo,
  session,
  notify,
  online,
  Select,
  enablePush,
  intent,
  people = [],
  payments = [],
  onPeopleReload,
}) {
  const requestRef = useRef(null);
  const [linkPerson, setLinkPerson] = useState(""),
    [linkAccount, setLinkAccount] = useState("");
  const role = profile?.role,
    admin = role === "admin",
    allowed = allowedCategories(role);
  const [tab, setTab] = useState(
      allowed.length ? "Criar aviso" : "Preferências",
    ),
    [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [recipients, setRecipients] = useState([]),
    [history, setHistory] = useState([]),
    [preferences, setPreferences] = useState(emptyPreferences),
    [controls, setControls] = useState(
      Object.fromEntries(Object.keys(categories).map((k) => [k, true])),
    ),
    [scheduled, setScheduled] = useState(false),
    [scheduleDate, setScheduleDate] = useState(dateKey(new Date())),
    [scheduleTime, setScheduleTime] = useState("09:00"),
    [receipts, setReceipts] = useState([]);
  const initialKey = intent?.category || allowed[0] || "comunicado";
  const [draft, setDraft] = useState({
    category: initialKey,
    title: intent?.title || categories[initialKey].title,
    body: intent?.body || categories[initialKey].body,
    audience: categories[initialKey].personal ? "pessoa" : "todos",
    recipient_id: intent?.recipient_id || "",
    contribution_id: intent?.contribution_id || null,
  });
  function receiptLabel(p) {
    const name =
      people.find((person) => person.id === p.parishioner_id)?.name ||
      recipients.find((r) => r.id === p.user_id)?.name ||
      "Contribuinte";
    return (
      name +
      " · " +
      p.kind +
      " · " +
      p.paid_on.split("-").reverse().join("/") +
      " · " +
      Number(p.amount || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    );
  }
  async function load() {
    if (demo) {
      setReceipts(payments.filter((p) => p.status === "Confirmado"));
      setRecipients([
        {
          id: "demo-maria",
          name: "Maria da Conceição",
          role: "agente_pastoral",
        },
        {
          id: "demo-jose",
          name: "José Antônio",
          role: "dizimista",
        },
      ]);
      return;
    }
    const results = await Promise.all([
      db
        .from("notification_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("notification_preferences")
        .select("*")
        .eq("user_id", session.user.id),
      db.from("notification_controls").select("*"),
      db.rpc("notification_recipients"),
    ]);
    results.forEach((r, i) => {
      if (r.error) {
        notify("Central de notificações: " + r.error.message);
        return;
      }
      if (i === 0) setHistory(r.data);
      if (i === 1)
        setPreferences({
          ...emptyPreferences(),
          ...Object.fromEntries(r.data.map((p) => [p.category, p.enabled])),
        });
      if (i === 2)
        setControls(
          Object.fromEntries(r.data.map((p) => [p.category, p.enabled])),
        );
      if (i === 3) setRecipients(r.data);
    });
    if (allowed.some((k) => categories[k].receipt)) {
      const { data, error } = await db
        .from("contributions")
        .select("id,kind,paid_on,competence,amount,user_id,parishioner_id")
        .eq("status", "Confirmado")
        .order("paid_on", { ascending: false })
        .limit(100);
      if (error) notify(error.message);
      else setReceipts(data || []);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!intent) return;
    const c = categories[intent.category];
    setDraft({
      category: intent.category,
      title: intent.title || c.title,
      body: intent.body || c.body,
      audience: c.personal ? "pessoa" : "todos",
      recipient_id: intent.recipient_id || "",
      contribution_id: intent.contribution_id || null,
    });
    setStep(0);
    setTab("Criar aviso");
  }, [intent]);
  function changeCategory(key) {
    const c = categories[key];
    setDraft({
      category: key,
      title: c.title,
      body: c.body,
      audience: c.personal ? "pessoa" : "todos",
      recipient_id: "",
      contribution_id: null,
    });
    setStep(0);
  }
  const meta = categories[draft.category],
    receipt = meta.receipt;
  const payload = {
    ...draft,
    scheduled_at: scheduled ? `${scheduleDate}T${scheduleTime}:00-03:00` : null,
  };
  function next() {
    if (step === 0) {
      if (!controls[draft.category])
        return notify("Este assunto foi pausado pelo Administrador.");
      if (receipt && !draft.contribution_id)
        return notify("Escolha um pagamento confirmado.");
      if (draft.audience === "pessoa" && !receipt && !draft.recipient_id)
        return notify("Escolha o destinatário.");
    } else {
      const error = validateCampaign(payload);
      if (error) return notify(error);
    }
    setStep(step + 1);
  }
  function guard() {
    if (demo) {
      notify(
        "Prévia: nenhum aviso foi enviado. Ative Supabase e VAPID para usar os disparos.",
      );
      return false;
    }
    if (!online) {
      notify("Conecte-se à internet para continuar.");
      return false;
    }
    return true;
  }
  async function send() {
    if (!guard()) return;
    const error = validateCampaign(payload);
    if (error) return notify(error);
    const signature = JSON.stringify(payload);
    if (requestRef.current?.signature !== signature)
      requestRef.current = { signature, id: crypto.randomUUID() };
    setBusy(true);
    try {
      const { data, error } = await db.rpc("queue_notification", {
        p_category: payload.category,
        p_title: payload.title.trim(),
        p_body: payload.body.trim(),
        p_audience: payload.audience,
        p_recipient: payload.recipient_id || null,
        p_contribution: payload.contribution_id || null,
        p_scheduled_at: payload.scheduled_at,
        p_request_id: requestRef.current.id,
      });
      if (error) throw error;
      if (!scheduled) {
        const result = await db.functions.invoke("send-push", {
          body: { campaign_id: data },
        });
        if (result.error)
          notify(
            "Aviso salvo na fila. O serviço de envio precisa ser ativado ou reprocessado.",
          );
        else
          notify(
            "Processamento concluído. Confira o histórico de aceites e falhas.",
          );
      } else
        notify(
          "Aviso agendado. O envio depende do processador de notificações ativo.",
        );
      requestRef.current = null;
      setTab("Histórico");
      setStep(0);
      await load();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id) {
    if (!guard()) return;
    const { error } = await db.rpc("cancel_notification", { p_id: id });
    if (error) notify(error.message);
    else {
      notify("Agendamento cancelado.");
      load();
    }
  }
  async function process(id) {
    if (!guard()) return;
    setBusy(true);
    const { error } = await db.functions.invoke("send-push", {
      body: { campaign_id: id },
    });
    setBusy(false);
    if (error)
      notify("Não foi possível processar o aviso. Verifique o serviço push.");
    else load();
  }
  async function preference(key, value) {
    if (demo) {
      setPreferences({ ...preferences, [key]: value });
      return notify(
        "Preferência alterada apenas nesta prévia; nenhum dado foi salvo.",
      );
    }
    if (!guard()) return;
    const { error } = await db
      .from("notification_preferences")
      .upsert(
        { user_id: session.user.id, category: key, enabled: value },
        { onConflict: "user_id,category" },
      );
    if (error) notify(error.message);
    else setPreferences({ ...preferences, [key]: value });
  }
  async function control(key, value) {
    if (demo) {
      setControls({ ...controls, [key]: value });
      return notify(
        "Controle alterado apenas nesta prévia; nenhum disparo será feito.",
      );
    }
    if (!guard()) return;
    const { error } = await db
      .from("notification_controls")
      .update({ enabled: value })
      .eq("category", key);
    if (error) notify(error.message);
    else {
      setControls({ ...controls, [key]: value });
      notify(
        value
          ? "Assunto liberado para envio."
          : "Assunto pausado; os avisos na fila não serão enviados.",
      );
    }
  }
  return (
    <section className="notification-center">
      <div className="section-heading">
        <div>
          <h2>
            <Bell size={21} /> Central de notificações
          </h2>
          <p>Escolha o que comunicar, para quem e em qual momento.</p>
        </div>
      </div>
      <div className="notification-subnav">
        {[
          ...(allowed.length ? ["Criar aviso", "Histórico"] : []),
          "Preferências",
          ...(admin ? ["Controle geral"] : []),
        ].map((t) => (
          <button
            className={tab === t ? "selected" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t === "Histórico" ? (
              <History size={16} />
            ) : t === "Preferências" ? (
              <Smartphone size={16} />
            ) : t === "Controle geral" ? (
              <Settings2 size={16} />
            ) : (
              <Send size={16} />
            )}{" "}
            {t}
          </button>
        ))}
      </div>
      {tab === "Criar aviso" && (
        <>
          <div
            className="notification-flow"
            aria-label={`Etapa ${step + 1} de 3`}
          >
            {[
              "Assunto e público",
              "Mensagem e horário",
              "Revisar e enviar",
            ].map((label, i) => (
              <div
                className={i === step ? "current" : i < step ? "complete" : ""}
                key={label}
              >
                <span>{i < step ? <Check size={14} /> : i + 1}</span>
                {label}
              </div>
            ))}
          </div>
          <div className="notification-workspace">
            <section className="white-card composer">
              <div className="composer-heading">
                <span className="eyebrow">VOCÊ ESTÁ NO CONTROLE</span>
                <h3>
                  {step === 0
                    ? "Qual é o assunto deste aviso?"
                    : step === 1
                      ? "Dê voz à sua mensagem."
                      : "Confira antes de disparar."}
                </h3>
              </div>
              {step === 0 && (
                <>
                  <div className="category-choices">
                    {allowed.map((key) => {
                      const Icon = icons[key] || Bell;
                      return (
                        <button
                          className={draft.category === key ? "selected" : ""}
                          key={key}
                          onClick={() => changeCategory(key)}
                        >
                          <Icon size={19} />
                          <span>{categories[key].label}</span>
                          {!controls[key] && <small>Pausado</small>}
                        </button>
                      );
                    })}
                  </div>
                  {receipt ? (
                    <>
                      <div className="notice">
                        <ShieldCheck size={17} />
                        <span>
                          O aviso será enviado apenas à conta vinculada ao
                          pagamento confirmado. Valores e comprovantes não
                          aparecem na notificação.
                        </span>
                      </div>
                      <label>
                        Pagamento confirmado
                        <Select
                          label="Pagamento"
                          value={draft.contribution_id || "Escolher pagamento"}
                          options={receipts
                            .filter(
                              (p) =>
                                p.kind ===
                                (draft.category === "recebimento_dizimo"
                                  ? "Dízimo"
                                  : "Oferta"),
                            )
                            .map((p) => ({
                              value: p.id,
                              label: receiptLabel(p),
                            }))}
                          onChange={(id) =>
                            setDraft({ ...draft, contribution_id: id })
                          }
                        />
                      </label>
                      {!receipts.length && (
                        <p className="muted">
                          Os pagamentos confirmados aparecerão aqui após ativar
                          o banco.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <label>
                        Público
                        <Select
                          label="Público"
                          value={audienceLabels[draft.audience]}
                          options={(meta.personal
                            ? ["pessoa"]
                            : Object.keys(audienceLabels)
                          ).map((k) => audienceLabels[k])}
                          onChange={(label) =>
                            setDraft({
                              ...draft,
                              audience: Object.keys(audienceLabels).find(
                                (k) => audienceLabels[k] === label,
                              ),
                              recipient_id: "",
                            })
                          }
                        />
                      </label>
                      {draft.audience === "pessoa" && (
                        <label>
                          Destinatário
                          <Select
                            label="Destinatário"
                            value={draft.recipient_id || "Escolher pessoa"}
                            options={recipients.map((r) => ({
                              value: r.id,
                              label:
                                r.name + " · " + (r.email || roles[r.role]),
                            }))}
                            onChange={(id) =>
                              setDraft({ ...draft, recipient_id: id })
                            }
                          />
                        </label>
                      )}
                    </>
                  )}
                  {meta.personal && (
                    <p className="privacy-caption">
                      <ShieldCheck size={15} /> Mensagem individual. Não será
                      divulgada para toda a comunidade.
                    </p>
                  )}
                </>
              )}
              {step === 1 && (
                <>
                  <label>
                    Título <small>{draft.title.length}/80</small>
                    <input
                      maxLength={80}
                      value={draft.title}
                      disabled={receipt}
                      onChange={(e) =>
                        setDraft({ ...draft, title: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Mensagem <small>{draft.body.length}/240</small>
                    <textarea
                      maxLength={240}
                      rows={4}
                      value={draft.body}
                      disabled={receipt}
                      onChange={(e) =>
                        setDraft({ ...draft, body: e.target.value })
                      }
                    />
                  </label>
                  <div className="segmented">
                    <button
                      className={!scheduled ? "selected" : ""}
                      onClick={() => setScheduled(false)}
                    >
                      Enviar agora
                    </button>
                    <button
                      className={scheduled ? "selected" : ""}
                      onClick={() => setScheduled(true)}
                    >
                      Agendar
                    </button>
                  </div>
                  {scheduled && (
                    <>
                      <div className="form-row">
                        <label>
                          Data (AAAA-MM-DD)
                          <input
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            placeholder="2026-12-25"
                          />
                        </label>
                        <label>
                          Horário (HH:MM)
                          <input
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            placeholder="09:00"
                          />
                        </label>
                      </div>
                      <p className="privacy-caption">
                        <Clock size={15} /> Horário de Palotina / São Paulo
                        (UTC−3). O processador precisa estar ativo.
                      </p>
                    </>
                  )}
                </>
              )}
              {step === 2 && (
                <>
                  <dl className="notification-review">
                    <div>
                      <dt>Assunto</dt>
                      <dd>{meta.label}</dd>
                    </div>
                    <div>
                      <dt>Destinatários</dt>
                      <dd>
                        {receipt
                          ? "Somente a conta vinculada ao recebimento"
                          : draft.audience === "pessoa"
                            ? recipients.find(
                                (r) => r.id === draft.recipient_id,
                              )?.name
                            : audienceLabels[draft.audience]}
                      </dd>
                    </div>
                    <div>
                      <dt>Quando</dt>
                      <dd>
                        {scheduled
                          ? `${scheduleDate.split("-").reverse().join("/")} às ${scheduleTime} · Palotina`
                          : "Após confirmar o envio"}
                      </dd>
                    </div>
                  </dl>
                  <div className="notice">
                    <ShieldCheck size={18} />
                    <span>
                      Somente contas aprovadas, dispositivos inscritos e pessoas
                      que aceitaram este assunto receberão o aviso.
                    </span>
                  </div>
                  {demo && (
                    <p className="muted">
                      Você está em demonstração. O botão abaixo não dispara
                      mensagens reais.
                    </p>
                  )}
                </>
              )}
              <div className="composer-actions">
                {step > 0 && (
                  <button
                    className="secondary"
                    onClick={() => setStep(step - 1)}
                  >
                    <ChevronLeft size={16} /> Voltar
                  </button>
                )}
                {step < 2 ? (
                  <button className="primary" onClick={next}>
                    {step === 0 ? "Preparar mensagem" : "Revisar aviso"}
                  </button>
                ) : (
                  <button
                    className="primary"
                    disabled={busy || !online}
                    onClick={send}
                  >
                    {scheduled ? <Clock size={17} /> : <Send size={17} />}{" "}
                    {busy
                      ? "Processando…"
                      : demo
                        ? "Verificar demonstração"
                        : scheduled
                          ? "Confirmar agendamento"
                          : "Confirmar disparo"}
                  </button>
                )}
              </div>
            </section>
            <aside className="notification-preview">
              <span className="eyebrow">
                <Eye size={15} /> PRÉVIA NO CELULAR
              </span>
              <div className="phone-notification">
                <div>
                  <span className="notification-app-icon">
                    <Bell size={16} />
                  </span>
                  <span>NOSSA SENHORA APARECIDA</span>
                  <small>agora</small>
                </div>
                <h4>{draft.title || "Título do aviso"}</h4>
                <p>{draft.body || "Sua mensagem aparecerá aqui."}</p>
              </div>
              <p>
                O sistema do celular pode variar a aparência. Um aceite do
                serviço push não comprova leitura ou recebimento no aparelho.
              </p>
              <div className="notification-advice">
                <ShieldCheck size={18} />
                <span>
                  Evite dados pessoais ou financeiros na mensagem. Ao tocar, a
                  pessoa abre o app e faz login para consultar detalhes.
                </span>
              </div>
            </aside>
          </div>
        </>
      )}
      {tab === "Histórico" && (
        <>
          <div className="section-heading">
            <p>
              Enviados, falhas e agendamentos dos assuntos que seu perfil
              gerencia.
            </p>
            <button className="secondary small" onClick={load}>
              Atualizar
            </button>
          </div>
          {!history.length ? (
            <div className="empty">
              <History />
              <h3>
                {demo
                  ? "Um histórico para cada aviso."
                  : "Nenhum disparo registrado."}
              </h3>
              <p>
                Você verá autor, assunto, horário, aceites, falhas e avisos sem
                destinatários. Não há mensagens reais enviadas na demonstração.
              </p>
            </div>
          ) : (
            history.map((c) => (
              <article className="white-card campaign-card" key={c.id}>
                <div>
                  <span className="tag">{categories[c.category]?.label}</span>
                  <span className="tag">{statusLabels[c.status]}</span>
                </div>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                <small>
                  {c.creator_name} ·{" "}
                  {new Date(c.scheduled_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </small>
                <div className="campaign-counts">
                  <span>{c.accepted_count} aceites</span>
                  <span>{c.failed_count} falhas</span>
                  <span>{c.skipped_count} ignorados</span>
                  <span>{c.unknown_count || 0} sem confirmação</span>
                </div>
                {c.error_message && <p className="muted">{c.error_message}</p>}
                {c.status === "processing" &&
                  Date.parse(c.processing_started_at) < Date.now() - 600000 && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => process(c.id)}
                    >
                      <History size={16} /> Recuperar processamento
                    </button>
                  )}
                {c.status === "queued" && (
                  <div className="campaign-actions">
                    {Date.parse(c.scheduled_at) <= Date.now() && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => process(c.id)}
                      >
                        <Send size={16} /> Processar fila
                      </button>
                    )}
                    <button className="secondary" onClick={() => cancel(c.id)}>
                      <XCircle size={16} /> Cancelar aviso
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </>
      )}
      {tab === "Preferências" && (
        <section className="white-card">
          <div className="section-heading">
            <div>
              <h3>Avisos que você deseja receber</h3>
              <p>
                Suas escolhas valem para todos os seus dispositivos inscritos.
              </p>
            </div>
          </div>
          <button className="primary" onClick={enablePush}>
            <Bell size={17} /> Ativar neste dispositivo
          </button>
          <p className="muted preference-help">
            Ative a permissão do celular e escolha os assuntos abaixo. Desmarcar
            todos interrompe os envios para sua conta.
          </p>
          {Object.entries(categories).map(([key, c]) => (
            <Toggle
              key={key}
              title={c.label}
              subtitle={
                c.personal
                  ? "Avisos individuais para você"
                  : "Novidades da comunidade"
              }
              checked={preferences[key]}
              onChange={(value) => preference(key, value)}
            />
          ))}
        </section>
      )}
      {tab === "Controle geral" && admin && (
        <section className="white-card">
          <h3>Assuntos autorizados para disparo</h3>
          <p className="muted preference-help">
            Pause um assunto para bloquear novos disparos e os avisos ainda na
            fila. Nenhuma mensagem é enviada apenas por ativar uma chave.
          </p>
          {Object.entries(categories).map(([key, c]) => (
            <Toggle
              key={key}
              title={c.label}
              subtitle={
                controls[key]
                  ? "Envios liberados, respeitando as preferências"
                  : "Pausado pela administração"
              }
              checked={!!controls[key]}
              onChange={(value) => control(key, value)}
            />
          ))}
          <div className="notification-link">
            <h3>Vincular dizimista à conta</h3>
            <p className="muted">
              Confira a identidade antes de vincular. O aviso de recebimento de
              um pagamento registrado pela equipe vai somente para esta conta.
            </p>
            <label>
              Dizimista
              <Select
                label="Dizimista"
                value={linkPerson || "Escolher dizimista"}
                options={people.map((p) => ({
                  value: p.id,
                  label: p.name + (p.email ? " · " + p.email : ""),
                }))}
                onChange={(id) => {
                  const person = people.find((p) => p.id === id);
                  setLinkPerson(id);
                  setLinkAccount(person?.linked_user_id || "");
                }}
              />
            </label>
            <label>
              Conta aprovada
              <Select
                label="Conta aprovada"
                value={linkAccount || ""}
                options={[
                  { value: "", label: "Sem vínculo" },
                  ...recipients.map((r) => ({
                    value: r.id,
                    label: r.name + " · " + (r.email || roles[r.role]),
                  })),
                ]}
                onChange={setLinkAccount}
              />
            </label>
            <button
              className="secondary"
              disabled={!linkPerson}
              onClick={async () => {
                if (!guard()) return;
                const { error } = await db.rpc("link_parishioner_account", {
                  p_person_id: linkPerson,
                  p_user_id: linkAccount || null,
                });
                if (error) notify(error.message);
                else {
                  notify("Vínculo atualizado.");
                  onPeopleReload?.();
                }
              }}
            >
              Salvar vínculo
            </button>
          </div>
          <div className="notice">
            <Clock size={17} />
            <span>
              Agendamento é de um aviso específico. Rotinas recorrentes e
              disparos automáticos por aniversário ou recebimento não são
              ativados nesta versão.
            </span>
          </div>
        </section>
      )}
    </section>
  );
}
function Toggle({ title, subtitle, checked, onChange }) {
  return (
    <div className="notification-toggle-row">
      <div>
        <b>{title}</b>
        <p>{subtitle}</p>
      </div>
      <button
        className={"toggle " + (checked ? "on" : "")}
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}
