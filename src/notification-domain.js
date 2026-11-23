export const notificationCategories = {
  aniversario: {
    label: "Aniversariantes",
    roles: ["admin", "pastoral_dizimo"],
    personal: true,
    title: "Um dia especial para você",
    body: "A comunidade Nossa Senhora Aparecida deseja um aniversário abençoado! Que sua vida seja sempre cercada de fé e amor.",
  },
  recebimento_dizimo: {
    label: "Recebimento de dízimo",
    roles: ["admin", "conselho_economico"],
    personal: true,
    receipt: true,
    title: "Sua contribuição foi conferida",
    body: "Agradecemos seu dízimo. Acesse o app para consultar a confirmação e os detalhes.",
  },
  recebimento_oferta: {
    label: "Recebimento de oferta",
    roles: ["admin", "conselho_economico"],
    personal: true,
    receipt: true,
    title: "Sua oferta foi conferida",
    body: "Agradecemos sua oferta. Acesse o app para consultar a confirmação e os detalhes.",
  },
  lembrete_dizimo: {
    label: "Lembrete de dízimo",
    roles: ["admin", "pastoral_dizimo"],
    title: "Um gesto de fé e partilha",
    body: "Sua generosidade ajuda a cuidar da nossa capela. Se desejar contribuir com o dízimo, acesse o app. Paz e bem!",
  },
  lembrete_oferta: {
    label: "Lembrete de oferta",
    roles: ["admin", "pastoral_dizimo"],
    title: "Juntos cuidamos da comunidade",
    body: "Cada oferta é um gesto de amor pela nossa comunidade. Conheça no app as formas de contribuir.",
  },
  promocao: {
    label: "Promoções e eventos",
    roles: ["admin", "conselho_administrativo"],
    title: "Vem aí um encontro especial",
    body: "Temos novidades para a comunidade! Acesse o app e saiba como participar.",
  },
  comunicado: {
    label: "Comunicados",
    roles: ["admin", "conselho_administrativo"],
    title: "Um aviso da nossa comunidade",
    body: "Há um novo comunicado da capela. Acesse o app para saber mais.",
  },
  celebracao: {
    label: "Missas e celebrações",
    roles: ["admin", "conselho_administrativo"],
    title: "Vamos celebrar juntos",
    body: "Confira no app os próximos horários de missas e celebrações da nossa capela.",
  },
};
export const canNotify = (role, category) =>
  notificationCategories[category]?.roles.includes(role) || false;
export const allowedCategories = (role) =>
  Object.keys(notificationCategories).filter((key) => canNotify(role, key));
export const emptyPreferences = () =>
  Object.fromEntries(
    Object.keys(notificationCategories).map((key) => [key, true]),
  );
export function trustedPushEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return false;
    return (
      ["fcm.googleapis.com", "updates.push.services.mozilla.com"].includes(
        url.hostname,
      ) ||
      url.hostname.endsWith(".push.apple.com") ||
      url.hostname.endsWith(".notify.windows.com")
    );
  } catch {
    return false;
  }
}
export function validateCampaign(value) {
  const category = notificationCategories[value.category];
  if (!category) return "Escolha um assunto válido.";
  if (!value.title?.trim() || value.title.length > 80)
    return "O título deve ter entre 1 e 80 caracteres.";
  if (!value.body?.trim() || value.body.length > 240)
    return "A mensagem deve ter entre 1 e 240 caracteres.";
  if (category.receipt && !value.contribution_id)
    return "Selecione um pagamento confirmado.";
  if (category.personal && !category.receipt && !value.recipient_id)
    return "Escolha a pessoa que receberá a mensagem.";
  if (value.audience === "pessoa" && !value.recipient_id && !category.receipt)
    return "Escolha o destinatário.";
  if (
    value.scheduled_at &&
    (!Number.isFinite(Date.parse(value.scheduled_at)) ||
      Date.parse(value.scheduled_at) <= Date.now())
  )
    return "Escolha um horário futuro para o agendamento.";
  return null;
}
