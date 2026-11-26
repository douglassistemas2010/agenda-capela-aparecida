import React from "react";
import { Heart, Bell, CalendarDays, BookOpen, Clock } from "lucide-react";
import WeekendCard from "./WeekendCard";
import { parseDay } from "./domain";

export default function DizimistaHome({
  name,
  events,
  reflection,
  onContribute,
  onNotices,
  onAgenda,
  onEvent,
}) {
  const today = new Date();
  const upcoming = events
    .filter(
      (e) =>
        e.status !== "Cancelado" &&
        e.date >=
          `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    )
    .sort((a, b) =>
      `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`),
    )
    .slice(0, 3);
  return (
    <div className="faith-home">
      <section className="faith-welcome">
        <p className="faith-kicker">SUA COMUNIDADE, PERTO DE VOCÊ</p>
        <h1>Olá, {name.trim().split(" ")[0]}.</h1>
        <p>Que a fé faça parte do seu dia.</p>
      </section>
      <section className="faith-giving">
        <span className="faith-icon">
          <Heart size={22} />
        </span>
        <div>
          <h2>Um gesto que faz bem.</h2>
          <p>Seu dízimo ajuda a cuidar da nossa comunidade.</p>
        </div>
        <button className="primary" onClick={onContribute}>
          Contribuir com amor
        </button>
        <button className="faith-history" onClick={onContribute}>
          Consultar minhas contribuições
        </button>
      </section>
      <WeekendCard events={events} onOpen={onAgenda} />
      <section className="faith-reflection">
        <span className="faith-kicker">
          <BookOpen size={16} /> UM MOMENTO DE FÉ
        </span>
        <h2>{reflection[1]}</h2>
        <p>{reflection[2]}</p>
        <small>{reflection[0]} · Reflexão inspirada na Bíblia</small>
      </section>
      <section className="faith-events">
        <div className="faith-section-title">
          <h2>Vamos nos encontrar</h2>
          <button onClick={() => onAgenda()}>Ver agenda</button>
        </div>
        {upcoming.length ? (
          upcoming.map((e) => (
            <button
              className="faith-event"
              key={e.id}
              onClick={() => onEvent(e)}
            >
              <span className="faith-date">
                <b>{parseDay(e.date).getDate()}</b>
                <small>
                  {parseDay(e.date)
                    .toLocaleDateString("pt-BR", { month: "short" })
                    .replace(".", "")}
                </small>
              </span>
              <span className="faith-event-copy">
                <small>{e.type}</small>
                <b>{e.title}</b>
                <span>
                  <Clock size={13} />
                  {e.start_time.slice(0, 5)}
                </span>
              </span>
            </button>
          ))
        ) : (
          <p className="faith-empty">Os próximos encontros aparecerão aqui.</p>
        )}
      </section>
      <button className="faith-notices" onClick={onNotices}>
        <span className="faith-icon">
          <Bell size={20} />
        </span>
        <span>
          <b>A vida da comunidade</b>
          <small>Confira os avisos e novidades</small>
        </span>
      </button>
    </div>
  );
}
