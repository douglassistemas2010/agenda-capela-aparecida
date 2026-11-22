import React, { useState, useEffect } from "react";
import {
  Heart,
  Users,
  Gift,
  Bell,
  Plus,
  FileCheck,
  Upload,
  Copy,
  CalendarDays,
  Check,
  ShieldCheck,
  Settings,
  Share2,
} from "lucide-react";
import QRCode from "qrcode";
import { pixPayload } from "./pix";
import { dateKey } from "./domain";
const money = (n) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const monthNow = dateKey(new Date()).slice(0, 7);
export default function Community({
  db,
  profile,
  session,
  demo,
  notify,
  online,
  Select,
}) {
  const [section, setSection] = useState("Visão geral"),
    [people, setPeople] = useState([]),
    [payments, setPayments] = useState([]),
    [notices, setNotices] = useState([]),
    [settings, setSettings] = useState(null),
    [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [range, setRange] = useState("Mês"),
    [qr, setQr] = useState(""),
    [pix, setPix] = useState(""),
    [giving, setGiving] = useState("Dízimo"),
    [amount, setAmount] = useState(""),
    [file, setFile] = useState(null),
    [personId, setPersonId] = useState("");
  const finance = demo || ["admin", "tesouraria"].includes(profile?.role),
    staff = demo || ["admin", "secretaria"].includes(profile?.role),
    admin = profile?.role === "admin";
  async function load() {
    if (!db) return;
    const tables = [
      "announcements",
      "community_settings",
      ...(finance ? ["parishioners"] : []),
      "contributions",
    ];
    const results = await Promise.all(
      tables.map((t) => db.from(t).select("*")),
    );
    results.forEach((r, i) => {
      if (r.error) return notify(r.error.message);
      if (tables[i] === "announcements") setNotices(r.data);
      if (tables[i] === "community_settings") setSettings(r.data[0]);
      if (tables[i] === "parishioners") setPeople(r.data);
      if (tables[i] === "contributions") setPayments(r.data);
    });
  }
  useEffect(() => {
    if (demo) {
      setPeople([
        {
          id: "1",
          name: "Maria da Conceição",
          birthday: "1980-11-25",
          phone: "Exemplo",
          email: "Dados ilustrativos",
          active: true,
        },
        {
          id: "2",
          name: "José Antônio",
          birthday: "1975-11-28",
          phone: "Exemplo",
          active: true,
        },
      ]);
      setPayments(
        Array.from({ length: 12 }, (_, i) => ({
          id: String(i),
          kind: i % 3 ? "Dízimo" : "Oferta",
          amount: [150, 80, 120, 50, 200, 100][i % 6],
          status: i === 11 ? "Pendente" : "Confirmado",
          paid_on: `${monthNow}-${String(2 + i * 2).padStart(2, "0")}`,
          competence: monthNow,
          user_id: "demo",
        })),
      );
      setNotices([
        {
          id: "1",
          title: "Uma comunidade que caminha unida",
          body: "Este é o espaço dos avisos da capela. Aqui teremos comunicados, celebrações, promoções e eventos. Conteúdo ilustrativo.",
          category: "Comunicado",
          created_at: new Date().toISOString(),
        },
      ]);
    } else load();
  }, []);
  useEffect(() => {
    setQr("");
    setPix("");
    if (!settings?.pix_key || !settings?.pix_name || !settings?.pix_city)
      return;
    const payload = pixPayload(
      settings.pix_key,
      settings.pix_name,
      settings.pix_city,
      Number(amount),
    );
    setPix(payload);
    QRCode.toDataURL(payload, {
      margin: 2,
      width: 260,
      errorCorrectionLevel: "M",
    })
      .then(setQr)
      .catch(() => notify("Não foi possível gerar o QR Code."));
  }, [settings, amount]);
  function guard() {
    if (demo) {
      notify("Demonstração: ative o banco online para registrar dados reais.");
      return false;
    }
    if (!online) {
      notify("Esta operação exige conexão com a internet.");
      return false;
    }
    return true;
  }
  async function submit(e) {
    e.preventDefault();
    if (!guard()) return;
    setBusy(true);
    const f = new FormData(e.currentTarget);
    let result;
    try {
      if (form === "person") {
        result = await db
          .from("parishioners")
          .insert({
            name: f.get("name"),
            email: f.get("email"),
            phone: f.get("phone"),
            birthday: f.get("birthday") || null,
            notes: f.get("notes"),
            created_by: session.user.id,
          });
      }
      if (form === "notice") {
        result = await db
          .from("announcements")
          .insert({
            title: f.get("title"),
            body: f.get("body"),
            category: f.get("category"),
            created_by: session.user.id,
          });
      }
      if (form === "pix") {
        result = await db
          .from("community_settings")
          .upsert({
            id: 1,
            pix_key: f.get("key"),
            pix_name: f.get("name"),
            pix_city: f.get("city"),
          });
      }
      if (form === "contribution") {
        const id = crypto.randomUUID();
        let proof_path = null;
        if (file) {
          if (file.size > 10 * 1024 * 1024)
            throw Error("O comprovante deve ter até 10 MB.");
          if (
            !["image/jpeg", "image/png", "application/pdf"].includes(file.type)
          )
            throw Error("Envie JPG, PNG ou PDF.");
          proof_path = `${session.user.id}/${id}.${file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg"}`;
          const upload = await db.storage
            .from("receipts")
            .upload(proof_path, file, { contentType: file.type });
          if (upload.error) throw upload.error;
        }
        result = await db
          .from("contributions")
          .insert({
            id,
            kind: giving,
            amount: Number(f.get("amount")),
            paid_on: f.get("date"),
            competence: f.get("competence"),
            parishioner_id: f.get("person") || null,
            user_id: session.user.id,
            proof_path,
            status: "Pendente",
          });
        if (result.error && proof_path)
          await db.storage.from("receipts").remove([proof_path]);
      }
      if (result?.error) throw result.error;
      setForm(null);
      setFile(null);
      notify("Registro salvo online.");
      load();
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm(p) {
    if (!guard()) return;
    const { error } = await db
      .from("contributions")
      .update({ status: p.status === "Confirmado" ? "Pendente" : "Confirmado" })
      .eq("id", p.id);
    if (error) notify(error.message);
    else {
      load();
      notify("Conferência atualizada.");
    }
  }
  async function proof(p) {
    if (!guard()) return;
    const { data, error } = await db.storage
      .from("receipts")
      .createSignedUrl(p.proof_path, 60);
    if (error) notify(error.message);
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async function enablePush() {
    if (!guard()) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window))
      return notify(
        "Para receber push no iPhone, adicione o app à tela inicial e abra por lá.",
      );
    const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!key)
      return notify(
        "As notificações push ainda aguardam a configuração do serviço de envio.",
      );
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        return notify("Permita notificações nas configurações do dispositivo.");
      const sw = await navigator.serviceWorker.ready;
      const padding = "=".repeat((4 - (key.length % 4)) % 4);
      const raw = atob((key + padding).replace(/-/g, "+").replace(/_/g, "/"));
      const sub = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: Uint8Array.from(raw, (c) => c.charCodeAt(0)),
      });
      const { error } = await db
        .from("push_subscriptions")
        .upsert(
          {
            user_id: session.user.id,
            endpoint: sub.endpoint,
            subscription: sub.toJSON(),
          },
          { onConflict: "endpoint" },
        );
      if (error) throw error;
      notify("Notificações ativadas neste dispositivo.");
    } catch (err) {
      notify(err.message);
    }
  }
  const cutoff = new Date();
  if (range === "Semana") cutoff.setDate(cutoff.getDate() - 6);
  else cutoff.setDate(1);
  const confirmed = payments.filter(
    (p) =>
      p.status === "Confirmado" &&
      p.paid_on >= dateKey(cutoff) &&
      p.paid_on <= dateKey(new Date()),
  );
  const total = (kind) =>
    confirmed
      .filter((p) => p.kind === kind)
      .reduce((s, p) => s + Number(p.amount), 0);
  const birthdayMonth = new Date().getMonth() + 1;
  const chart = Array.from({ length: range === "Semana" ? 7 : 6 }, (_, i) => {
    const d = new Date();
    if (range === "Semana") d.setDate(d.getDate() - 6 + i);
    else d.setMonth(d.getMonth() - 5 + i, 1);
    const key = dateKey(d).slice(0, range === "Semana" ? 10 : 7);
    return {
      label: d.toLocaleDateString(
        "pt-BR",
        range === "Semana"
          ? { day: "2-digit", month: "2-digit" }
          : { month: "short" },
      ),
      t: payments
        .filter(
          (p) =>
            p.status === "Confirmado" &&
            p.paid_on.startsWith(key) &&
            p.kind === "Dízimo",
        )
        .reduce((s, p) => s + Number(p.amount), 0),
      o: payments
        .filter(
          (p) =>
            p.status === "Confirmado" &&
            p.paid_on.startsWith(key) &&
            p.kind === "Oferta",
        )
        .reduce((s, p) => s + Number(p.amount), 0),
    };
  });
  const max = Math.max(1, ...chart.map((x) => x.t + x.o));
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">FÉ QUE SE TRANSFORMA EM CUIDADO</p>
          <h1>
            Nossa comunidade<span className="greeting-dot">.</span>
          </h1>
          <p>Generosidade, encontros e vida em comunhão.</p>
        </div>
        <button className="secondary" onClick={enablePush}>
          <Bell size={17} /> Receber avisos
        </button>
      </section>
      <div className="community-tabs">
        {[
          "Visão geral",
          "Contribuir",
          ...(finance ? ["Dizimistas", "Financeiro"] : []),
          "Mural",
        ].map((s) => (
          <button
            className={section === s ? "selected" : ""}
            onClick={() => setSection(s)}
            key={s}
          >
            {s}
          </button>
        ))}
      </div>
      {section === "Visão geral" && (
        <>
          <div className="community-banner">
            <Heart />
            <div>
              <h2>Pequenos gestos. Uma grande missão.</h2>
              <p>
                Seu dízimo e sua oferta ajudam a manter viva a nossa comunidade.
              </p>
            </div>
            <button
              className="primary"
              onClick={() => setSection("Contribuir")}
            >
              Quero contribuir
            </button>
          </div>
          {finance && (
            <>
              <div className="section-heading">
                <h2>Generosidade em números</h2>
                <Select
                  value={range}
                  options={["Semana", "Mês"]}
                  onChange={setRange}
                />
              </div>
              <div className="stats">
                <div>
                  <span className="stat-icon green">
                    <Heart />
                  </span>
                  <div>
                    <b>{money(total("Dízimo"))}</b>
                    <span>Dízimos confirmados</span>
                  </div>
                </div>
                <div>
                  <span className="stat-icon gold">
                    <Gift />
                  </span>
                  <div>
                    <b>{money(total("Oferta"))}</b>
                    <span>Ofertas confirmadas</span>
                  </div>
                </div>
                <div>
                  <span className="stat-icon rose">
                    <FileCheck />
                  </span>
                  <div>
                    <b>
                      {payments.filter((p) => p.status === "Pendente").length}
                    </b>
                    <span>Aguardando conferência</span>
                  </div>
                </div>
              </div>
              <div className="chart-card">
                <div className="section-heading">
                  <h3>
                    {range === "Semana" ? "Últimos 7 dias" : "Últimos 6 meses"}
                  </h3>
                  <span className="chart-legend">
                    <i /> Dízimos <i /> Ofertas
                  </span>
                </div>
                <div
                  className="bar-chart"
                  role="img"
                  aria-label="Dízimos e ofertas confirmados no período"
                >
                  {chart.map((v, i) => (
                    <div className="bar-column" key={i}>
                      <small>{money(v.t + v.o)}</small>
                      <div className="bar-space">
                        <div
                          className="bar-total"
                          style={{ height: `${((v.t + v.o) / max) * 100}%` }}
                        >
                          <div
                            style={{
                              height: `${(v.o / (v.t + v.o || 1)) * 100}%`,
                            }}
                          />
                          <div
                            style={{
                              height: `${(v.t / (v.t + v.o || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span>{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className="community-grid">
            <section className="white-card">
              <div className="section-heading">
                <h3>
                  <Gift size={18} /> Aniversariantes do mês
                </h3>
              </div>
              {finance ? (
                people
                  .filter(
                    (p) =>
                      p.birthday &&
                      Number(p.birthday.split("-")[1]) === birthdayMonth,
                  )
                  .map((p) => (
                    <div className="birthday" key={p.id}>
                      <span className="avatar">{p.name[0]}</span>
                      <b>{p.name}</b>
                      <span>Dia {p.birthday.slice(8)}</span>
                    </div>
                  ))
              ) : (
                <p className="muted">
                  Os aniversários ficam disponíveis à equipe autorizada.
                </p>
              )}
              {finance &&
                !people.some(
                  (p) =>
                    p.birthday &&
                    Number(p.birthday.split("-")[1]) === birthdayMonth,
                ) && (
                  <p className="muted">
                    Nenhum aniversário cadastrado neste mês.
                  </p>
                )}
            </section>
            <section className="white-card">
              <h3>
                <Bell size={18} /> Lembretes com carinho
              </h3>
              <p>
                Ative os avisos para receber comunicados. A equipe pode
                compartilhar um lembrete de contribuição no WhatsApp.
              </p>
              <button
                className="secondary"
                onClick={() =>
                  window.open(
                    "https://wa.me/?text=" +
                      encodeURIComponent(
                        "Paz e bem! A Capela Nossa Senhora Aparecida agradece seu carinho e sua contribuição. Se desejar, procure a secretaria para informações sobre dízimos e ofertas. Que Deus abençoe sua família!",
                      ),
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                <Share2 size={16} /> Compartilhar lembrete
              </button>
              <small className="muted">
                O envio é feito por você; não enviamos cobranças automáticas.
              </small>
            </section>
          </div>
        </>
      )}
      {section === "Contribuir" && (
        <div className="community-grid">
          <section className="white-card">
            <span className="eyebrow">CONTRIBUIÇÃO COM AMOR</span>
            <h2>Faça parte desta missão.</h2>
            <p>Escolha como deseja contribuir para a nossa capela.</p>
            <div className="segmented">
              {["Dízimo", "Oferta"].map((k) => (
                <button
                  className={giving === k ? "selected" : ""}
                  onClick={() => setGiving(k)}
                  key={k}
                >
                  {k}
                </button>
              ))}
            </div>
            <label>
              Valor da contribuição (R$)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </label>
            {qr ? (
              <div className="qr">
                <img src={qr} alt="QR Code Pix da comunidade" />
                <p>{settings.pix_name}</p>
                <small>Confira o destinatário no app do seu banco.</small>
                <button
                  className="secondary full"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(pix)
                      .then(() => notify("Código Pix copiado."))
                      .catch(() => notify("Não foi possível copiar o código."))
                  }
                >
                  <Copy size={16} /> Copiar código Pix
                </button>
              </div>
            ) : (
              <div className="pix-pending">
                <ShieldCheck />
                <h3>Pix em preparação</h3>
                <p>
                  A chave oficial da comunidade será definida. O QR Code será
                  exibido após a configuração pela administração.
                </p>
              </div>
            )}
            <button
              className="primary full"
              onClick={() => {
                setFile(null);
                setForm("contribution");
              }}
            >
              <Upload size={18} /> Registrar pagamento e comprovante
            </button>
            <small className="muted">
              O envio do comprovante aguarda a conferência da tesouraria. O QR
              Code não confirma o pagamento automaticamente.
            </small>
          </section>
          <section className="white-card">
            <h3>Minhas contribuições</h3>
            {demo ? (
              <p className="muted">
                Entre com sua conta para acompanhar seus pagamentos.
              </p>
            ) : (
              payments
                .filter((p) => p.user_id === session.user.id)
                .map((p) => <Payment key={p.id} p={p} proof={proof} />)
            )}
            {!demo && !payments.some((p) => p.user_id === session.user.id) && (
              <p className="muted">Seus registros aparecerão aqui.</p>
            )}
            {admin && (
              <button className="secondary full" onClick={() => setForm("pix")}>
                <Settings size={16} /> Configurar Pix da comunidade
              </button>
            )}
          </section>
        </div>
      )}
      {section === "Dizimistas" && (
        <>
          <div className="section-heading">
            <div>
              <h2>Dizimistas da comunidade</h2>
              <p>Cadastro reservado à administração e tesouraria.</p>
            </div>
            <button className="primary" onClick={() => setForm("person")}>
              <Plus size={17} /> Cadastrar
            </button>
          </div>
          {people.map((p) => (
            <div className="member" key={p.id}>
              <span className="avatar">{p.name[0]}</span>
              <div>
                <b>{p.name}</b>
                <p>
                  {p.email} {p.phone && `· ${p.phone}`}
                </p>
                <small>
                  {p.birthday
                    ? `Aniversário: ${p.birthday.slice(8)}/${p.birthday.slice(5, 7)}`
                    : "Aniversário não informado"}
                </small>
              </div>
              <span className="tag">{p.active ? "Ativo" : "Inativo"}</span>
            </div>
          ))}
          {!people.length && (
            <div className="empty">
              <Users />
              <h3>Acolha o primeiro dizimista.</h3>
              <p>Cadastre os dados para acompanhar as contribuições.</p>
            </div>
          )}
        </>
      )}
      {section === "Financeiro" && (
        <>
          <div className="section-heading">
            <div>
              <h2>Contribuições e comprovantes</h2>
              <p>Confirme somente após conferir o recebimento.</p>
            </div>
            <button className="primary" onClick={() => setForm("contribution")}>
              <Plus size={17} /> Registrar
            </button>
          </div>
          {payments
            .slice()
            .sort((a, b) => b.paid_on.localeCompare(a.paid_on))
            .map((p) => (
              <Payment
                key={p.id}
                p={p}
                proof={proof}
                person={people.find((x) => x.id === p.parishioner_id)?.name}
                action={
                  <button
                    className="secondary small"
                    onClick={() => confirm(p)}
                  >
                    {p.status === "Confirmado" ? "Reabrir" : "Confirmar"}
                  </button>
                }
              />
            ))}
          {!payments.length && (
            <div className="empty">
              <FileCheck />
              <h3>Nenhuma contribuição registrada.</h3>
            </div>
          )}
        </>
      )}
      {section === "Mural" && (
        <>
          <div className="section-heading">
            <div>
              <h2>A vida da nossa capela</h2>
              <p>Comunicados, avisos, promoções e eventos.</p>
            </div>
            {staff && (
              <button className="primary" onClick={() => setForm("notice")}>
                <Plus size={17} /> Publicar
              </button>
            )}
          </div>
          {notices
            .slice()
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map((n) => (
              <article className="white-card announcement" key={n.id}>
                <span className="tag">{n.category}</span>
                <h2>{n.title}</h2>
                <p>{n.body}</p>
                <div>
                  <small>
                    {new Date(n.created_at).toLocaleDateString("pt-BR")}
                  </small>
                  {staff && !demo && (
                    <button
                      className="text-button"
                      onClick={async () => {
                        const { data, error } = await db.functions.invoke(
                          "send-push",
                          { body: { announcement_id: n.id } },
                        );
                        if (error)
                          notify("O envio push ainda precisa ser configurado.");
                        else
                          notify(
                            data.sent +
                              " notifica??es enviadas ? " +
                              data.failed +
                              " falhas.",
                          );
                      }}
                    >
                      <Bell size={16} /> Notificar
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={() =>
                      window.open(
                        "https://wa.me/?text=" +
                          encodeURIComponent(
                            `*Capela Nossa Senhora Aparecida*\n\n*${n.title}*\n${n.body}`,
                          ),
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    <Share2 size={16} /> Compartilhar
                  </button>
                </div>
              </article>
            ))}
          {!notices.length && (
            <div className="empty">
              <Bell />
              <h3>Em breve, novidades por aqui.</h3>
            </div>
          )}
        </>
      )}
      {form && (
        <div className="modal-backdrop" onClick={() => !busy && setForm(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Novo registro"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close icon-btn" onClick={() => setForm(null)}>
              ✕
            </button>
            <h2>
              {form === "person"
                ? "Cadastrar dizimista"
                : form === "notice"
                  ? "Novo comunicado"
                  : form === "pix"
                    ? "Pix da comunidade"
                    : "Registrar contribuição"}
            </h2>
            <form onSubmit={submit}>
              {form === "person" && (
                <>
                  <label>
                    Nome completo
                    <input name="name" required maxLength={150} />
                  </label>
                  <label>
                    E-mail
                    <input name="email" type="email" maxLength={150} />
                  </label>
                  <label>
                    Telefone
                    <input name="phone" type="tel" maxLength={30} />
                  </label>
                  <label>
                    Nascimento (AAAA-MM-DD)
                    <input
                      name="birthday"
                      pattern="\d{4}-\d{2}-\d{2}"
                      placeholder="1980-12-25"
                    />
                  </label>
                  <label>
                    Observações
                    <textarea name="notes" maxLength={2000} />
                  </label>
                </>
              )}
              {form === "notice" && (
                <>
                  <label>
                    Título
                    <input name="title" required maxLength={150} />
                  </label>
                  <label>
                    Categoria
                    <input
                      name="category"
                      required
                      placeholder="Comunicado, evento, promoção…"
                      maxLength={40}
                    />
                  </label>
                  <label>
                    Mensagem
                    <textarea name="body" required rows={5} maxLength={5000} />
                  </label>
                </>
              )}
              {form === "pix" && (
                <>
                  <p className="muted">
                    Use somente a chave oficial autorizada pela comunidade.
                  </p>
                  <label>
                    Chave Pix
                    <input
                      name="key"
                      required
                      maxLength={77}
                      defaultValue={
                        settings?.pix_key || "uniao.mitra@hotmail.com"
                      }
                    />
                  </label>
                  <label>
                    Nome do beneficiário
                    <input
                      name="name"
                      required
                      maxLength={25}
                      defaultValue={settings?.pix_name}
                    />
                  </label>
                  <label>
                    Cidade
                    <input
                      name="city"
                      required
                      maxLength={15}
                      defaultValue={settings?.pix_city || "Palotina"}
                    />
                  </label>
                </>
              )}
              {form === "contribution" && (
                <>
                  <label>
                    Tipo
                    <Select
                      value={giving}
                      options={["Dízimo", "Oferta"]}
                      onChange={setGiving}
                    />
                  </label>
                  <label>
                    Valor (R$)
                    <input
                      name="amount"
                      type="number"
                      min="0.01"
                      max="999999.99"
                      step="0.01"
                      required
                      defaultValue={amount}
                    />
                  </label>
                  <label>
                    Data do pagamento (AAAA-MM-DD)
                    <input
                      name="date"
                      pattern="\d{4}-\d{2}-\d{2}"
                      required
                      defaultValue={dateKey(new Date())}
                    />
                  </label>
                  <label>
                    Competência (AAAA-MM)
                    <input
                      name="competence"
                      pattern="\d{4}-\d{2}"
                      required
                      defaultValue={monthNow}
                    />
                  </label>
                  {finance && (
                    <label>
                      Dizimista (opcional)
                      <Select
                        value={
                          people.find((p) => p.id === personId)?.name ||
                          "N?o vinculado"
                        }
                        options={[
                          "N?o vinculado",
                          ...people.map((p) => p.name),
                        ]}
                        onChange={(name) =>
                          setPersonId(
                            people.find((p) => p.name === name)?.id || "",
                          )
                        }
                      />
                      <input type="hidden" name="person" value={personId} />
                    </label>
                  )}
                  <label className="upload-control">
                    <Upload size={22} />
                    <b>{file ? file.name : "Selecionar comprovante"}</b>
                    <small>JPG, PNG ou PDF · até 10 MB</small>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) => setFile(e.target.files[0])}
                    />
                  </label>
                  <p className="muted">
                    O registro será criado como pendente de conferência.
                  </p>
                </>
              )}
              <button className="primary full" disabled={busy}>
                {busy ? "Salvando…" : "Salvar registro"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
function Payment({ p, proof, action, person }) {
  return (
    <div className="payment-row">
      <div className="payment-icon">
        <Heart size={19} />
      </div>
      <div>
        <b>
          {p.kind} · {money(p.amount)}
        </b>
        <p>
          {person || "Contribuição"} ·{" "}
          {p.paid_on.split("-").reverse().join("/")}
          <br />
          Competência {p.competence}
        </p>
      </div>
      <div className="payment-actions">
        <span className="tag">{p.status}</span>
        {p.proof_path && (
          <button className="text-button" onClick={() => proof(p)}>
            Ver comprovante
          </button>
        )}
        {action}
      </div>
    </div>
  );
}
