import React from "react";
import { Church, CalendarDays, Clock, BookOpen, Sparkles } from "lucide-react";
import { weekendEvent } from "./weekend";
import { parseDay } from "./domain";
export default function WeekendCard({ events, onOpen }) {
  const { event, from, to } = weekendEvent(events);
  const title = event
    ? event.type === "Missa"
      ? "Santa Missa"
      : "Celebração da Palavra"
    : "Programação a confirmar";
  const Icon = event?.type === "Missa" ? Church : BookOpen;
  const date = event
    ? parseDay(event.date).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      })
    : `${parseDay(from).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} e ${parseDay(to).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
  return (
    <section className="weekend-card">
      <div className="weekend-heading">
        <span className="eyebrow">
          <Sparkles size={13} /> NOSSO FIM DE SEMANA
        </span>
        <span className="weekend-icon">
          <Icon size={22} />
        </span>
      </div>
      <h2>{title}</h2>
      <div className="weekend-schedule">
        <span>
          <CalendarDays size={15} />
          {date}
        </span>
        {event && (
          <b>
            <Clock size={15} />
            {event.start_time.slice(0, 5)}
          </b>
        )}
      </div>
      {!event && (
        <p>A celebração e o horário serão exibidos assim que cadastrados.</p>
      )}
      <button
        onClick={() => onOpen(event?.date || from)}
        className="text-button"
      >
        {event ? "Ver celebração na agenda" : "Consultar a agenda"}
      </button>
      <span className="weekend-glow" aria-hidden="true" />
    </section>
  );
}
