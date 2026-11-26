import React from "react";
import { Heart, Bell, BookOpen } from "lucide-react";

export default function DizimistaHome({
  name,
  reflection,
  onContribute,
  onNotices,
}) {
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
      <section className="faith-reflection">
        <span className="faith-kicker">
          <BookOpen size={16} /> UM MOMENTO DE FÉ
        </span>
        <h2>{reflection[1]}</h2>
        <p>{reflection[2]}</p>
        <small>{reflection[0]} · Reflexão inspirada na Bíblia</small>
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
