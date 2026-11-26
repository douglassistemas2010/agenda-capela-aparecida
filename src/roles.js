export const roles = {
  admin: "Administrador",
  agente_pastoral: "Agente de Pastoral",
  dizimista: "Dizimista",
};
export const roleLabel = (role) => roles[role] || "Aguardando definição";
export const roleKeys = Object.keys(roles);
export const canOrganize = (role) =>
  ["admin", "agente_pastoral"].includes(role);
export const canManageContributions = canOrganize;
export const canConfirm = (role) => role === "admin";
