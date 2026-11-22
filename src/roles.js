export const roles = {
  admin: "Administrador",
  conselho_administrativo: "Conselho Administrativo",
  conselho_economico: "Conselho Econômico",
  pastoral_dizimo: "Pastoral do Dízimo",
};
export const roleLabel = (role) => roles[role] || "Aguardando definição";
export const roleKeys = Object.keys(roles);
export const canOrganize = (role) =>
  ["admin", "conselho_administrativo"].includes(role);
export const canManageContributions = (role) =>
  ["admin", "conselho_economico", "pastoral_dizimo"].includes(role);
export const canConfirm = (role) =>
  ["admin", "conselho_economico"].includes(role);
