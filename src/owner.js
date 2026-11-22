export const owner = {
  name: "Douglas Araujo Gomes",
  username: "douglas",
  email: "douglas_sistemas2010@hotmail.com",
};
// Um apelido para login; a autenticação e as permissões continuam no Supabase.
export function loginEmail(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === owner.username ? owner.email : normalized;
}
