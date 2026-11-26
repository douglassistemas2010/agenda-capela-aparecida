import ResponsiveForm from "./ResponsiveForm";
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Church,
  CalendarDays,
  House,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Heart,
  BookOpen,
  Share2,
  Clock,
  MapPin,
  X,
  Check,
  LogOut,
  WifiOff,
  ShieldCheck,
  Sun,
  Sparkles,
} from "lucide-react";
import { dateKey, parseDay, fee, period, conflicts, shareText } from "./domain";
import "./style.css";
import "./identity.css";
import "./experience.css";
import "./responsive.css";
import Community from "./community";
import { roles, roleKeys, roleLabel, canOrganize } from "./roles";
import { owner, loginEmail } from "./owner";
import WeekendCard from "./WeekendCard";
const localPreview =
  window.location.protocol === "file:" ||
  window.location.pathname.toUpperCase().endsWith("/PREVIA-APP.HTML");
const configured =
  !localPreview &&
  !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );
const db = configured
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )
  : null;
const now = new Date();
const fmt = (d, opts) => d.toLocaleDateString("pt-BR", opts);
const money = (n) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const types = [
  "Casamento",
  "Palestra",
  "Retiro",
  "Celebração",
  "Missa",
  "Culto da Palavra",
  "Promoção",
  "Evento",
  "Encontro",
];
const reflections = [
  [
    "Salmo 23,1",
    "Deus cuida de cada passo.",
    "Entregue suas preocupações ao Senhor e siga com confiança. Hoje, seja presença de cuidado na vida de alguém.",
  ],
  [
    "Mateus 5,9",
    "A paz começa em nós.",
    "Escolha palavras que acolhem e gestos que aproximam. Cada pequeno ato de paz transforma a nossa comunidade.",
  ],
  [
    "1 Coríntios 13,13",
    "O amor dá sentido ao caminho.",
    "Faça do amor a intenção por trás de cada tarefa. Servir com alegria também é uma forma de oração.",
  ],
  [
    "Filipenses 4,13",
    "Renove sua força na fé.",
    "Você não precisa carregar tudo sozinho. Busque em Deus a coragem para dar o próximo passo.",
  ],
  [
    "João 15,12",
    "Amar é fazer-se próximo.",
    "Reserve um momento para escutar alguém. Acolher com atenção é uma maneira simples de viver o Evangelho.",
  ],
  [
    "Romanos 12,12",
    "Cultive a esperança.",
    "Mesmo nos dias difíceis, persevere na oração. A esperança floresce quando caminhamos juntos.",
  ],
  [
    "Salmo 118,24",
    "Receba este dia com gratidão.",
    "Reconheça o bem nas pequenas coisas e compartilhe sua alegria. Este dia é uma nova oportunidade de amar.",
  ],
];
const demoEvents = [
  {
    title: "Mariana & Gabriel",
    type: "Casamento",
    offset: 0,
    start_time: "16:00",
    end_time: "17:30",
    contributor: true,
  },
  {
    title: "Encontro de famílias",
    type: "Palestra",
    offset: 2,
    start_time: "19:00",
    end_time: "21:00",
  },
  {
    title: "Um dia de fé e renovação",
    type: "Retiro",
    offset: 5,
    start_time: "08:00",
    end_time: "17:00",
  },
  {
    title: "Ana & Lucas",
    type: "Casamento",
    offset: 7,
    start_time: "18:00",
    end_time: "19:30",
  },
  {
    title: "Celebração da comunidade",
    type: "Celebração",
    offset: 0,
    start_time: "09:00",
    end_time: "10:00",
  },
].map((e, i) => {
  let d = new Date(now);
  d.setDate(d.getDate() + e.offset);
  return {
    ...e,
    id: `demo-${i}`,
    date: dateKey(d),
    status: "Confirmado",
    creator_name: "Conselho Administrativo · exemplo",
    created_at: now.toISOString(),
    amount: fee(e.type, e.contributor),
  };
});
function App() {
  const [session, setSession] = useState(null),
    [profile, setProfile] = useState(null),
    [events, setEvents] = useState(configured ? [] : demoEvents),
    [tab, setTab] = useState("Início"),
    [view, setView] = useState("Semana"),
    [date, setDate] = useState(now),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("Todos"),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [busy, setBusy] = useState(false),
    [members, setMembers] = useState([]),
    [loading, setLoading] = useState(configured);
  const [previewRole, setPreviewRole] = useState("admin");
  const effectiveRole = !configured ? previewRole : profile?.role;
  const effectiveProfile = !configured
    ? { role: previewRole, approved: true }
    : profile;
  const demo = !configured,
    canWrite = !demo && canOrganize(profile?.role) && profile?.approved,
    admin = profile?.role === "admin" && profile?.approved;
  const notify = (m) => setToast(m);
  async function load() {
    if (!db) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from("events")
        .select("*")
        .order("date")
        .order("start_time");
      if (error) throw error;
      setEvents(data || []);
    } catch (e) {
      notify("Não foi possível atualizar a agenda. " + e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let alive = true;
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    if (db) {
      db.auth
        .getSession()
        .then(({ data }) => alive && setSession(data.session));
      const { data } = db.auth.onAuthStateChange((event, s) => {
        setSession(s);
        setProfile(null);
        setEvents([]);
        if (event === "PASSWORD_RECOVERY") setModal({ kind: "password" });
      });
      return () => {
        alive = false;
        data.subscription.unsubscribe();
        window.removeEventListener("online", on);
        window.removeEventListener("offline", on);
      };
    }
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (!session || !db) return;
    let active = true;
    db.from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) notify(error.message);
        setProfile(data);
        if (data?.approved) load();
        else setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (tab === "Pessoas" && admin) loadMembers();
  }, [tab, admin]);
  async function loadMembers() {
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .order("created_at");
    if (error) notify(error.message);
    else setMembers(data);
  }
  async function changeMember(id, updates) {
    if (id === session.user.id)
      return notify("Seu próprio acesso é protegido.");
    const { error } = await db.rpc("manage_member", {
      member_id: id,
      new_role: updates.role,
      new_approved: updates.approved,
    });
    if (error) notify(error.message);
    else {
      notify("Acesso atualizado.");
      loadMembers();
    }
  }
  const [from, to] = period(date, view);
  const filtered = events.filter(
    (e) =>
      e.date >= from &&
      e.date <= to &&
      (filter === "Todos" || e.type === filter) &&
      `${e.title} ${e.type}`.toLowerCase().includes(query.toLowerCase()),
  );
  const upcoming = events
    .filter((e) => e.date >= dateKey(now) && e.status !== "Cancelado")
    .slice()
    .sort((a, b) =>
      (a.date + a.start_time).localeCompare(b.date + b.start_time),
    );
  const name = demo
    ? owner.name.split(" ")[0]
    : (
        profile?.name ||
        session?.user?.user_metadata?.full_name ||
        "bem-vindo"
      ).split(" ")[0];
  const reflection =
    reflections[
      Math.floor(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000,
      ) % reflections.length
    ];
  function move(n) {
    let d = new Date(date);
    if (view === "Mês") d = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
    else d.setDate(d.getDate() + n * (view === "Semana" ? 7 : 1));
    setDate(d);
  }
  function share(list, label) {
    if (!online) return notify("Conecte-se à internet para compartilhar.");
    window.open(
      "https://wa.me/?text=" + encodeURIComponent(shareText(list, label)),
      "_blank",
      "noopener,noreferrer",
    );
  }
  function newEvent() {
    if (!demo && !canWrite)
      return notify("Seu perfil permite apenas consultar a agenda.");
    setModal({
      kind: "event",
      event: {
        date: dateKey(date),
        start_time: "09:00",
        end_time: "10:00",
        type: "Casamento",
        status: "Confirmado",
        contributor: false,
        title: "",
        contact: "",
        notes: "",
      },
    });
  }
  async function save(e) {
    e.preventDefault();
    if (demo)
      return notify(
        "Prévia do formulário: nenhum dado foi salvo. Ative o banco para registrar reservas reais.",
      );
    if (!canWrite || !online)
      return notify("É necessário estar online e autorizado.");
    const form = new FormData(e.currentTarget);
    const value = {
      ...modal.event,
      ...Object.fromEntries(form),
      contributor: form.get("contributor") === "on",
    };
    value.amount = fee(value.type, value.contributor);
    if (value.end_time <= value.start_time)
      return notify("O horário final deve ser posterior ao início.");
    if (conflicts(events, value) && value.status !== "Cancelado")
      return notify(
        "Já existe uma reserva neste horário. Escolha outro intervalo.",
      );
    setBusy(true);
    const payload = {
      title: value.title,
      date: value.date,
      start_time: value.start_time,
      end_time: value.end_time,
      type: value.type,
      status: value.status,
      contributor: value.contributor,
      contact: value.contact,
      notes: value.notes,
    };
    const result = value.id
      ? await db.from("events").update(payload).eq("id", value.id)
      : await db.from("events").insert(payload);
    setBusy(false);
    if (result.error)
      return notify(
        result.error.code === "23P01"
          ? "Este horário acabou de ser reservado por outra pessoa."
          : result.error.message,
      );
    setModal(null);
    notify("Reserva salva na agenda da comunidade.");
    load();
  }
  async function auth(e) {
    e.preventDefault();
    if (!db)
      return notify(
        "O login estará disponível após configurar o banco online.",
      );
    if (!online) return notify("Conecte-se à internet para entrar.");
    const f = new FormData(e.currentTarget);
    setBusy(true);
    let result;
    const redirect = window.location.origin + window.location.pathname;
    if (modal.mode === "signup")
      result = await db.auth.signUp({
        email: loginEmail(f.get("email")),
        password: f.get("password"),
        options: {
          data: { full_name: f.get("name") },
          emailRedirectTo: redirect,
        },
      });
    else if (modal.mode === "reset")
      result = await db.auth.resetPasswordForEmail(loginEmail(f.get("email")), {
        redirectTo: redirect,
      });
    else
      result = await db.auth.signInWithPassword({
        email: loginEmail(f.get("email")),
        password: f.get("password"),
      });
    setBusy(false);
    if (result.error) notify(result.error.message);
    else {
      setModal(null);
      notify(
        modal.mode === "signup"
          ? "Confira seu e-mail. Após confirmar, aguarde a aprovação do administrador."
          : modal.mode === "reset"
            ? "Confira seu e-mail para recuperar o acesso."
            : "Bem-vindo à agenda!",
      );
    }
  }
  async function oauth(provider) {
    if (!db)
      return notify("Configure a autenticação para usar Google ou Apple.");
    const { error } = await db.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) notify(error.message);
  }
  const Nav = () => (
    <>
      {[
        ["Início", House],
        ["Agenda", CalendarDays],
        ["Comunidade", Heart],
        ["Pessoas", Users],
      ]
        .filter(([t]) => t !== "Pessoas" || effectiveRole === "admin")
        .map(([t, I]) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            <I size={21} />
            <span>{t}</span>
          </button>
        ))}
    </>
  );
  const EventCard = ({ event: e }) => (
    <button
      className={"event-card " + e.type.toLowerCase()}
      onClick={() => setModal({ kind: "detail", event: e })}
    >
      <div className="event-date">
        <b>{parseDay(e.date).getDate()}</b>
        <span>
          {fmt(parseDay(e.date), { month: "short" }).replace(".", "")}
        </span>
      </div>
      <div className="event-body">
        <span className="tag">{e.type}</span>
        <h3>{e.title}</h3>
        <p>
          <Clock size={14} />
          {e.start_time.slice(0, 5)} – {e.end_time.slice(0, 5)}
          <span
            className={"status " + (e.status === "Cancelado" ? "cancel" : "")}
          >
            {e.status}
          </span>
        </p>
      </div>
      <ChevronRight size={18} />
    </button>
  );
  return (
    <div
      className={
        "app " +
        (effectiveRole === "dizimista" ? "dizimista-app" : "staff-portal")
      }
    >
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("Início");
          }}
        >
          <span className="brand-icon">
            <Church size={27} />
          </span>
          <span>
            Nossa Senhora
            <br />
            <b>Aparecida</b>
            <small>CAPELA · BAIRRO UNIÃO</small>
          </span>
        </a>
        <div className="side-label">NOSSA COMUNIDADE</div>
        <nav>
          <Nav />
        </nav>
        <div className="sidebar-bottom">
          <Heart size={23} />
          <p>
            Uma comunidade.
            <br />
            <b>Muitos encontros com Deus.</b>
          </p>
          <span>Fé que acolhe. Amor que une.</span>
        </div>
      </aside>
      <div className="shell">
        <header>
          <div className="header-title">
            <span className="header-emblem">
              <Church size={23} strokeWidth={1.6} />
            </span>
            <div>
              <b>Nossa Senhora Aparecida</b>
              <small>BAIRRO UNIÃO · PALOTINA</small>
            </div>
            <span className="header-section">{tab}</span>
          </div>
          <div className="header-actions">
            <span className={"connection " + (!online ? "offline" : "")}>
              <i />
              {online ? "Online" : "Sem conexão"}
            </span>
            <button
              className="profile"
              onClick={() =>
                session
                  ? setModal({ kind: "account" })
                  : setModal({ kind: "auth", mode: "login" })
              }
            >
              <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
              <span>
                {demo ? owner.name : name}
                <small>
                  {roleLabel(effectiveRole)}
                  {demo ? " · prévia" : ""}
                </small>
              </span>
            </button>
          </div>
        </header>
        <main>
          {demo && (
            <label className="preview-profile">
              Visualizar como
              <select
                value={previewRole}
                onChange={(e) => {
                  setPreviewRole(e.target.value);
                  setTab("Início");
                  setModal(null);
                }}
              >
                {roleKeys.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
              <small>
                Prévia visual; não altera permissões nem grava dados.
              </small>
            </label>
          )}
          {!online && (
            <div className="notice error">
              <WifiOff size={18} />
              Sem conexão. As reservas exigem internet; os dados exibidos podem
              estar desatualizados.
            </div>
          )}
          {demo && (
            <div className="notice">
              <ShieldCheck size={17} />
              <span>
                Prévia do Administrador Douglas · dados ilustrativos. Reservas e
                login serão liberados após ativar o banco online.
              </span>
              <button onClick={() => setModal({ kind: "auth", mode: "login" })}>
                Entrar
              </button>
            </div>
          )}
          {!demo && !session ? (
            <section className="welcome">
              <Church size={52} />
              <h1>Um lugar para nossos encontros.</h1>
              <p>
                Entre para consultar e organizar a agenda da Capela Nossa
                Senhora Aparecida.
              </p>
              <button
                className="primary"
                onClick={() => setModal({ kind: "auth", mode: "login" })}
              >
                Entrar na comunidade
              </button>
              <p>Seu acesso será liberado pelo administrador.</p>
            </section>
          ) : !demo && !profile?.approved ? (
            <section className="welcome">
              <ShieldCheck size={48} />
              <h1>
                {loading
                  ? "Carregando seu perfil…"
                  : "Seu acesso está em análise."}
              </h1>
              <p>
                O administrador precisa aprovar seu cadastro antes de liberar a
                agenda.
              </p>
              <button className="secondary" onClick={() => db.auth.signOut()}>
                Sair
              </button>
            </section>
          ) : (
            <>
              {tab === "Início" && (
                <>
                  <section className="page-heading">
                    <div>
                      <p className="eyebrow">
                        {fmt(now, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                      <h1>
                        Olá, {name}
                        <span className="greeting-dot">.</span>
                      </h1>
                      <p>
                        Que bom ter você aqui. Vamos cuidar dos nossos
                        encontros?
                      </p>
                    </div>
                    <button className="primary" onClick={newEvent}>
                      <Plus size={19} /> Nova reserva
                    </button>
                  </section>
                  <div className="home-spotlight">
                    <section className="reflection">
                      <div className="reflection-copy">
                        <span className="reflection-label">
                          <BookOpen size={17} /> PALAVRA PARA O DIA
                        </span>
                        <h2>{reflection[1]}</h2>
                        <p>{reflection[2]}</p>
                        <div className="reflection-reference">
                          <span>{reflection[0]}</span>
                          <span>Reflexão inspirada na Bíblia</span>
                        </div>
                      </div>
                      <div className="reflection-art" aria-hidden="true">
                        <svg
                          className="marian-art"
                          viewBox="0 0 260 300"
                          fill="none"
                        >
                          <defs>
                            <linearGradient
                              id="mantle"
                              x1="65"
                              y1="100"
                              x2="205"
                              y2="285"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#6196e0" stopOpacity=".5" />
                              <stop
                                offset="1"
                                stopColor="#143d83"
                                stopOpacity=".15"
                              />
                            </linearGradient>
                            <linearGradient id="gold-stroke">
                              <stop stopColor="#f6e4ae" />
                              <stop offset="1" stopColor="#c29a4d" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M35 270V119a95 95 0 0 1 190 0v151"
                            stroke="#c7a15a"
                            strokeOpacity=".24"
                          />
                          <path
                            d="M48 270V120a82 82 0 0 1 164 0v150"
                            stroke="#c7a15a"
                            strokeOpacity=".12"
                          />
                          <circle
                            cx="130"
                            cy="114"
                            r="51"
                            stroke="#f1d791"
                            strokeOpacity=".23"
                          />
                          <circle
                            cx="130"
                            cy="114"
                            r="42"
                            stroke="#f1d791"
                            strokeOpacity=".12"
                          />
                          <path
                            d="M109 85l-8-25 20 10 9-21 10 21 20-10-9 25z"
                            fill="url(#gold-stroke)"
                          />
                          <path
                            d="M109 92c-10 15-15 35-21 54L55 260q75 24 150 0l-33-114c-6-19-11-39-21-54"
                            fill="url(#mantle)"
                            stroke="url(#gold-stroke)"
                            strokeWidth="1.7"
                          />
                          <path
                            d="M114 96c4-8 28-8 32 0l-2 21c-2 14-24 14-27 0z"
                            fill="#d9bf88"
                            fillOpacity=".88"
                          />
                          <path
                            d="M130 139l-12 18 12 23 12-23-12-18zm0 41v70m-12-93L88 248m54-91 30 91"
                            stroke="#edd59a"
                            strokeOpacity=".65"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          {[
                            [-56, 39],
                            [-35, 20],
                            [0, 13],
                            [35, 20],
                            [56, 39],
                          ].map(([x, y], i) => (
                            <path
                              key={i}
                              d={`M${130 + x} ${y}v7m-3.5-3.5h7`}
                              stroke="#ead296"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                            />
                          ))}
                          <path
                            d="M67 273q63 18 126 0"
                            stroke="#e4c47e"
                            strokeOpacity=".45"
                          />
                        </svg>
                        <span>
                          <Sparkles size={12} /> Sob o manto do amor.
                        </span>
                      </div>
                    </section>
                    <WeekendCard
                      events={events}
                      onOpen={(day) => {
                        setDate(parseDay(day));
                        setView("Dia");
                        setTab("Agenda");
                      }}
                    />
                  </div>
                  <div className="stats">
                    <div>
                      <span className="stat-icon green">
                        <CalendarDays />
                      </span>
                      <div>
                        <b>
                          {
                            events.filter(
                              (e) =>
                                e.date.slice(0, 7) ===
                                  dateKey(now).slice(0, 7) &&
                                e.status !== "Cancelado",
                            ).length
                          }
                        </b>
                        <span>Encontros neste mês</span>
                      </div>
                    </div>
                    <div>
                      <span className="stat-icon rose">
                        <Heart />
                      </span>
                      <div>
                        <b>
                          {
                            events.filter(
                              (e) =>
                                e.type === "Casamento" &&
                                e.date >= dateKey(now) &&
                                e.status !== "Cancelado",
                            ).length
                          }
                        </b>
                        <span>Casamentos por vir</span>
                      </div>
                    </div>
                    <div>
                      <span className="stat-icon gold">
                        <Sun />
                      </span>
                      <div>
                        <b>
                          {
                            events.filter(
                              (e) =>
                                e.date === dateKey(now) &&
                                e.status !== "Cancelado",
                            ).length
                          }
                        </b>
                        <span>Encontros hoje</span>
                      </div>
                    </div>
                  </div>
                  <div className="home-columns">
                    <section>
                      <div className="section-heading">
                        <div>
                          <h2>Próximos encontros</h2>
                          <p>Momentos especiais que vamos viver juntos.</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setTab("Agenda")}
                        >
                          Ver agenda <ChevronRight size={16} />
                        </button>
                      </div>
                      <div className="event-list">
                        {loading ? (
                          <p>Atualizando agenda…</p>
                        ) : upcoming.length ? (
                          upcoming
                            .slice(0, 4)
                            .map((e) => <EventCard key={e.id} event={e} />)
                        ) : (
                          <div className="empty">
                            <CalendarDays />
                            <h3>Novos encontros virão.</h3>
                            <p>Nenhuma reserva agendada por enquanto.</p>
                          </div>
                        )}
                      </div>
                    </section>
                    <aside className="home-aside">
                      <MiniCalendar
                        date={date}
                        setDate={setDate}
                        events={events}
                        onPick={() => {
                          setTab("Agenda");
                          setView("Dia");
                        }}
                      />
                      <div className="share-card">
                        <span className="share-icon">
                          <Share2 size={21} />
                        </span>
                        <h3>Leve a agenda com você</h3>
                        <p>
                          Compartilhe os encontros da comunidade no WhatsApp.
                        </p>
                        <button
                          onClick={() =>
                            share(upcoming.slice(0, 12), "Próximos encontros")
                          }
                        >
                          Compartilhar agenda <Share2 size={16} />
                        </button>
                      </div>
                    </aside>
                  </div>
                </>
              )}
              {tab === "Agenda" && (
                <>
                  <section className="page-heading">
                    <div>
                      <p className="eyebrow">CADA ENCONTRO TEM SEU LUGAR</p>
                      <h1>
                        Agenda da capela<span className="greeting-dot">.</span>
                      </h1>
                      <p>Organize hoje os momentos que vão nos reunir.</p>
                    </div>
                    <button className="primary" onClick={newEvent}>
                      <Plus size={19} /> Nova reserva
                    </button>
                  </section>
                  <section className="agenda-panel">
                    <div className="agenda-toolbar">
                      <div className="date-controls">
                        <button
                          className="icon-btn"
                          aria-label="Período anterior"
                          onClick={() => move(-1)}
                        >
                          <ChevronLeft />
                        </button>
                        <h2>
                          {view === "Dia"
                            ? fmt(date, { day: "numeric", month: "long" })
                            : view === "Semana"
                              ? `${fmt(parseDay(from), { day: "numeric", month: "short" })} – ${fmt(parseDay(to), { day: "numeric", month: "short", year: "numeric" })}`
                              : fmt(date, { month: "long", year: "numeric" })}
                        </h2>
                        <button
                          className="icon-btn"
                          aria-label="Próximo período"
                          onClick={() => move(1)}
                        >
                          <ChevronRight />
                        </button>
                        <button
                          className="secondary small"
                          onClick={() => setDate(new Date())}
                        >
                          Hoje
                        </button>
                      </div>
                      <div className="segmented">
                        {["Dia", "Semana", "Mês"].map((v) => (
                          <button
                            className={view === v ? "selected" : ""}
                            key={v}
                            onClick={() => setView(v)}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="filter-row">
                      <label className="search">
                        <Search size={18} />
                        <input
                          placeholder="Buscar um encontro…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <CustomSelect
                        label="Tipo de encontro"
                        value={filter}
                        options={["Todos", ...types]}
                        onChange={setFilter}
                      />
                      <button
                        className="secondary share-button"
                        onClick={() =>
                          share(
                            filtered,
                            `${fmt(parseDay(from))} a ${fmt(parseDay(to))}`,
                          )
                        }
                      >
                        <Share2 size={17} />
                        <span>Compartilhar</span>
                      </button>
                    </div>
                    {view === "Mês" ? (
                      <MonthGrid
                        date={date}
                        events={filtered}
                        pick={(e) => setModal({ kind: "detail", event: e })}
                        pickDate={(d) => {
                          setDate(d);
                          setView("Dia");
                        }}
                      />
                    ) : (
                      <div className="agenda-days">
                        {Array.from(
                          { length: view === "Semana" ? 7 : 1 },
                          (_, i) => {
                            let d = parseDay(from);
                            d.setDate(d.getDate() + i);
                            let items = filtered.filter(
                              (e) => e.date === dateKey(d),
                            );
                            return (
                              <section className="day-group" key={i}>
                                <div
                                  className={
                                    "day-label " +
                                    (dateKey(d) === dateKey(now)
                                      ? "is-today"
                                      : "")
                                  }
                                >
                                  <b>{fmt(d, { day: "2-digit" })}</b>
                                  <span>
                                    {fmt(d, { weekday: "long" })}
                                    {dateKey(d) === dateKey(now) && (
                                      <small>Hoje</small>
                                    )}
                                  </span>
                                </div>
                                <div>
                                  {items.length ? (
                                    items.map((e) => (
                                      <EventCard key={e.id} event={e} />
                                    ))
                                  ) : (
                                    <p className="free-slot">
                                      Sem reservas · espaço para novos encontros
                                    </p>
                                  )}
                                </div>
                              </section>
                            );
                          },
                        )}
                      </div>
                    )}
                  </section>
                </>
              )}
              {tab === "Comunidade" && (
                <Community
                  db={db}
                  key={effectiveRole}
                  profile={effectiveProfile}
                  session={session}
                  demo={demo}
                  notify={notify}
                  online={online}
                  Select={CustomSelect}
                />
              )}
              {tab === "Pessoas" && effectiveRole === "admin" && (
                <>
                  <section className="page-heading">
                    <div>
                      <p className="eyebrow">ACOLHER E ORGANIZAR</p>
                      <h1>
                        Pessoas e acessos<span className="greeting-dot">.</span>
                      </h1>
                      <p>
                        Você decide quem participa e o que cada pessoa pode
                        fazer.
                      </p>
                    </div>
                  </section>
                  <div className="access-info">
                    <ShieldCheck />
                    <div>
                      <h3>Cadastro com aprovação</h3>
                      <p>
                        Compartilhe o link do app. A pessoa se cadastra e você
                        aprova o acesso aqui. O Administrador gerencia acessos;
                        confirma recebimentos e tem acesso completo. O Agente de
                        Pastoral organiza agenda, comunicados e cadastros e
                        acompanha contribuições. O Dizimista usa a visão de app
                        e acompanha somente suas próprias contribuições.
                      </p>
                    </div>
                  </div>
                  {demo ? (
                    <div className="empty">
                      <Users />
                      <h3>Uma comunidade com acesso protegido.</h3>
                      <p>
                        Os cadastros aparecerão aqui após ativar a autenticação
                        online.
                      </p>
                    </div>
                  ) : (
                    members.map((m) => (
                      <div className="member" key={m.id}>
                        <span className="avatar">
                          {m.name?.slice(0, 1) || "U"}
                        </span>
                        <div>
                          <b>{m.name || "Novo membro"}</b>
                          <p>{m.email}</p>
                          <small>
                            {m.approved
                              ? "Acesso liberado"
                              : "Aguardando aprovação"}
                          </small>
                        </div>
                        {m.id === session.user.id ? (
                          <span className="tag">Você · administrador</span>
                        ) : (
                          <div className="member-actions">
                            <CustomSelect
                              label="Perfil"
                              value={roleLabel(m.role)}
                              options={roleKeys.map(roleLabel)}
                              onChange={(label) =>
                                changeMember(m.id, {
                                  role: roleKeys.find(
                                    (key) => roles[key] === label,
                                  ),
                                  approved: m.approved,
                                })
                              }
                            />
                            <button
                              className={m.approved ? "secondary" : "primary"}
                              onClick={() =>
                                changeMember(m.id, {
                                  role: m.role,
                                  approved: !m.approved,
                                })
                              }
                            >
                              {m.approved ? "Suspender" : "Aprovar"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
            </>
          )}
          <footer>
            <span>
              <Church size={15} /> Capela Nossa Senhora Aparecida · Bairro União
            </span>
            <span>
              Desenvolvimento <b>Douglas Araujo Gomes</b>
            </span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav">
        <Nav />
        <button onClick={newEvent}>
          <Plus size={22} />
          <span>Reservar</span>
        </button>
      </nav>
      {modal && (
        <div className="modal-backdrop" onClick={() => !busy && setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={modal.kind === "event" ? "Reserva" : "Detalhes"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close icon-btn"
              aria-label="Fechar"
              onClick={() => setModal(null)}
            >
              <X />
            </button>
            {modal.kind === "auth" && (
              <>
                <span className="modal-icon">
                  <Church />
                </span>
                <h2>
                  {modal.mode === "signup"
                    ? "Faça parte da comunidade"
                    : modal.mode === "reset"
                      ? "Recupere seu acesso"
                      : "Bem-vindo à nossa comunidade"}
                </h2>
                <p className="muted">
                  {demo
                    ? "A autenticação ainda precisa ser ativada."
                    : "Use sua conta para acessar a agenda da capela."}
                </p>
                <form onSubmit={auth}>
                  {modal.mode === "signup" && (
                    <label>
                      Seu nome
                      <input
                        name="name"
                        required
                        autoComplete="name"
                        maxLength={100}
                      />
                    </label>
                  )}
                  <label>
                    {modal.mode === "signup" ? "E-mail" : "E-mail ou usuário"}
                    <input
                      name="email"
                      type={modal.mode === "signup" ? "email" : "text"}
                      required
                      autoComplete={
                        modal.mode === "signup" ? "email" : "username"
                      }
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={
                        modal.mode === "signup"
                          ? "seu@email.com"
                          : "E-mail ou douglas"
                      }
                    />
                  </label>
                  {modal.mode !== "reset" && (
                    <label>
                      Senha
                      <input
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete={
                          modal.mode === "signup"
                            ? "new-password"
                            : "current-password"
                        }
                      />
                    </label>
                  )}
                  <button className="primary full" disabled={busy || demo}>
                    {busy
                      ? "Aguarde…"
                      : modal.mode === "signup"
                        ? "Criar cadastro"
                        : modal.mode === "reset"
                          ? "Enviar recuperação"
                          : "Entrar"}
                  </button>
                </form>
                {modal.mode === "login" && (
                  <>
                    <button
                      className="text-button full"
                      onClick={() => setModal({ ...modal, mode: "reset" })}
                    >
                      Esqueci minha senha
                    </button>
                    <div className="divider">ou continue com</div>
                    <div className="oauth">
                      <button
                        className="secondary"
                        onClick={() => oauth("google")}
                      >
                        Google
                      </button>
                      <button
                        className="secondary"
                        onClick={() => oauth("apple")}
                      >
                        Apple
                      </button>
                    </div>
                  </>
                )}
                <button
                  className="text-button full"
                  onClick={() =>
                    setModal({
                      ...modal,
                      mode: modal.mode === "signup" ? "login" : "signup",
                    })
                  }
                >
                  {modal.mode === "signup"
                    ? "Já tenho uma conta"
                    : "Criar meu cadastro"}
                </button>
                <small className="muted">
                  Novos cadastros precisam da aprovação do administrador.
                </small>
              </>
            )}
            {modal.kind === "event" && (
              <>
                <p className="eyebrow">AGENDA DA COMUNIDADE</p>
                <h2>
                  {modal.event.id ? "Editar reserva" : "Um novo encontro"}
                </h2>
                <ResponsiveForm onSubmit={save}>
                  <label>
                    Nome do encontro ou dos noivos
                    <input
                      name="title"
                      required
                      maxLength={150}
                      defaultValue={modal.event.title}
                      placeholder="Ex.: Maria & José"
                    />
                  </label>
                  <label>
                    Tipo de encontro
                    <CustomSelect
                      value={modal.event.type}
                      options={types}
                      onChange={(type) =>
                        setModal({ ...modal, event: { ...modal.event, type } })
                      }
                    />
                    <input type="hidden" name="type" value={modal.event.type} />
                  </label>
                  <DateField
                    name="date"
                    label="Data"
                    value={modal.event.date}
                    onChange={(value) =>
                      setModal({
                        ...modal,
                        event: { ...modal.event, date: value },
                      })
                    }
                  />
                  <div className="form-row">
                    <TimeField
                      name="start_time"
                      label="Início"
                      value={modal.event.start_time}
                      onChange={(v) =>
                        setModal({
                          ...modal,
                          event: { ...modal.event, start_time: v },
                        })
                      }
                    />
                    <TimeField
                      name="end_time"
                      label="Término"
                      value={modal.event.end_time}
                      onChange={(v) =>
                        setModal({
                          ...modal,
                          event: { ...modal.event, end_time: v },
                        })
                      }
                    />
                  </div>
                  {modal.event.type === "Casamento" && (
                    <div className="fee-box">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          name="contributor"
                          checked={!!modal.event.contributor}
                          onChange={(e) =>
                            setModal({
                              ...modal,
                              event: {
                                ...modal.event,
                                contributor: e.target.checked,
                              },
                            })
                          }
                        />
                        <span className="check-visual">
                          {modal.event.contributor && <Check size={15} />}
                        </span>
                        Contribuinte do dízimo na comunidade
                      </label>
                      <p>
                        Taxa do casamento{" "}
                        <b>
                          {money(fee("Casamento", modal.event.contributor))}
                        </b>
                      </p>
                      <small>
                        R$ 150 para contribuintes · R$ 350 para não
                        contribuintes
                      </small>
                    </div>
                  )}
                  <label>
                    Contato{" "}
                    <span className="muted">(opcional, acesso interno)</span>
                    <input
                      name="contact"
                      maxLength={150}
                      defaultValue={modal.event.contact}
                    />
                  </label>
                  <label>
                    Observações internas
                    <textarea
                      name="notes"
                      maxLength={2000}
                      defaultValue={modal.event.notes}
                      rows={3}
                    />
                  </label>
                  <label>
                    Situação
                    <CustomSelect
                      value={modal.event.status}
                      options={["Confirmado", "Pendente", "Cancelado"]}
                      onChange={(status) =>
                        setModal({
                          ...modal,
                          event: { ...modal.event, status },
                        })
                      }
                    />
                    <input
                      type="hidden"
                      name="status"
                      value={modal.event.status}
                    />
                  </label>
                  <button className="primary full" disabled={busy || !online}>
                    {busy ? "Salvando…" : "Salvar reserva"}
                  </button>
                </ResponsiveForm>
              </>
            )}
            {modal.kind === "detail" && (
              <>
                <span className="tag">{modal.event.type}</span>
                <h2>{modal.event.title}</h2>
                <div className="detail-line">
                  <CalendarDays />
                  {fmt(parseDay(modal.event.date), {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div className="detail-line">
                  <Clock />
                  {modal.event.start_time.slice(0, 5)} –{" "}
                  {modal.event.end_time.slice(0, 5)}
                </div>
                <div className="detail-line">
                  <MapPin />
                  Capela Nossa Senhora Aparecida
                </div>
                <span className="tag">{modal.event.status}</span>
                {modal.event.type === "Casamento" && (
                  <div className="fee-box">
                    <p>
                      Taxa do casamento <b>{money(modal.event.amount)}</b>
                    </p>
                    <small>
                      {modal.event.contributor
                        ? "Contribuinte do dízimo"
                        : "Não contribuinte do dízimo"}
                    </small>
                  </div>
                )}
                {modal.event.contact && <p>Contato: {modal.event.contact}</p>}
                {modal.event.notes && (
                  <p className="notes">{modal.event.notes}</p>
                )}
                <p className="audit">
                  Registrado por <b>{modal.event.creator_name}</b>
                  <br />
                  {new Date(modal.event.created_at).toLocaleString("pt-BR")}
                </p>
                <button
                  className="primary full"
                  onClick={() => share([modal.event], "Encontro da comunidade")}
                >
                  <Share2 size={18} />
                  Compartilhar no WhatsApp
                </button>
                {canWrite && (
                  <button
                    className="secondary full"
                    onClick={() =>
                      setModal({ kind: "event", event: modal.event })
                    }
                  >
                    Editar reserva
                  </button>
                )}
              </>
            )}
            {modal.kind === "password" && (
              <>
                <h2>Definir nova senha</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    const password = new FormData(e.currentTarget).get(
                      "password",
                    );
                    const { error } = await db.auth.updateUser({ password });
                    setBusy(false);
                    if (error) notify(error.message);
                    else {
                      setModal(null);
                      notify("Senha atualizada.");
                    }
                  }}
                >
                  <label>
                    Nova senha
                    <input
                      name="password"
                      type="password"
                      minLength={8}
                      required
                      autoComplete="new-password"
                    />
                  </label>
                  <button className="primary full" disabled={busy}>
                    Atualizar senha
                  </button>
                </form>
              </>
            )}
            {modal.kind === "account" && (
              <>
                <h2>Olá, {name}.</h2>
                <p>{session?.user?.email}</p>
                <button
                  className="secondary full"
                  onClick={async () => {
                    await db.auth.signOut();
                    setModal(null);
                    setTab("Início");
                  }}
                >
                  <LogOut size={18} /> Sair da conta
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="Fechar mensagem" onClick={() => setToast("")}>
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
function CustomSelect({ value, options, onChange, label }) {
  const [open, setOpen] = useState(false);
  const choices = options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
  return (
    <div
      className="custom-select"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={label || "Selecionar opção"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {choices.find((option) => option.value === value)?.label || value}
        <ChevronRight size={16} className="chevron" />
      </button>
      {open && (
        <div className="select-options">
          {choices.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
              {o.value === value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function MiniCalendar({ date, setDate, events, onPick }) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1),
    days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return (
    <div className="mini-calendar">
      <div className="mini-heading">
        <h3>{fmt(date, { month: "long", year: "numeric" })}</h3>
        <div>
          <button
            className="icon-btn"
            aria-label="Mês anterior"
            onClick={() =>
              setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))
            }
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="icon-btn"
            aria-label="Próximo mês"
            onClick={() =>
              setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))
            }
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="mini-grid">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((s, i) => (
          <span className="weekday" key={"h" + i}>
            {s}
          </span>
        ))}
        {Array.from({ length: first.getDay() }, (_, i) => (
          <span key={"b" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = new Date(date.getFullYear(), date.getMonth(), i + 1);
          return (
            <button
              type="button"
              className={
                (dateKey(d) === dateKey(now) ? "today " : "") +
                (events.some(
                  (e) => e.date === dateKey(d) && e.status !== "Cancelado",
                )
                  ? "has-event"
                  : "")
              }
              key={i}
              onClick={() => {
                setDate(d);
                onPick?.();
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="calendar-key">
        <i /> Dia com encontro
      </div>
    </div>
  );
}
function MonthGrid({ date, events, pick, pickDate }) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  return (
    <div className="month-grid">
      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((s) => (
        <div className="month-weekday" key={s}>
          {s}
        </div>
      ))}
      {Array.from(
        {
          length:
            Math.ceil(
              (first.getDay() +
                new Date(
                  date.getFullYear(),
                  date.getMonth() + 1,
                  0,
                ).getDate()) /
                7,
            ) * 7,
        },
        (_, i) => {
          let d = new Date(
            date.getFullYear(),
            date.getMonth(),
            i - first.getDay() + 1,
          );
          return (
            <div
              className={
                "month-cell " +
                (d.getMonth() !== date.getMonth() ? "outside" : "")
              }
              key={i}
            >
              <button
                className={dateKey(d) === dateKey(now) ? "today" : ""}
                onClick={() => pickDate(d)}
              >
                {d.getDate()}
              </button>
              {events
                .filter((e) => e.date === dateKey(d))
                .map((e) => (
                  <button
                    key={e.id}
                    className={"month-event " + e.type.toLowerCase()}
                    onClick={() => pick(e)}
                  >
                    <span>{e.start_time.slice(0, 5)}</span> {e.title}
                  </button>
                ))}
            </div>
          );
        },
      )}
    </div>
  );
}
function DateField({ name, label, value, onChange }) {
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(parseDay(value));
  return (
    <label>
      {label}
      <button
        className="date-field"
        type="button"
        onClick={() => setOpen(!open)}
      >
        <CalendarDays size={18} />
        {fmt(parseDay(value), {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
      </button>
      <input type="hidden" name={name} value={value} />
      {open && (
        <MiniCalendar
          date={month}
          events={[]}
          setDate={(d) => {
            if (
              d.getFullYear() !== month.getFullYear() ||
              d.getMonth() !== month.getMonth()
            ) {
              setMonth(d);
            } else {
              onChange(dateKey(d));
              setOpen(false);
            }
          }}
        />
      )}
    </label>
  );
}
function TimeField({ name, label, value, onChange }) {
  const [h, m] = value.split(":");
  return (
    <label>
      {label}
      <div className="time-field">
        <CustomSelect
          value={h}
          options={Array.from({ length: 24 }, (_, i) =>
            String(i).padStart(2, "0"),
          )}
          onChange={(v) => onChange(`${v}:${m}`)}
        />
        <span>:</span>
        <CustomSelect
          value={m}
          options={Array.from({ length: 60 }, (_, i) =>
            String(i).padStart(2, "0"),
          )}
          onChange={(v) => onChange(`${h}:${v}`)}
        />
      </div>
      <input type="hidden" name={name} value={value} />
    </label>
  );
}
createRoot(document.getElementById("root")).render(<App />);

if ("serviceWorker" in navigator && !localPreview)
  window.addEventListener("load", () =>
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + "sw.js")
      .catch(() => {}),
  );
