const key = (s) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ _-]/g, "");
const aliases = {
  endereco: "address",
  cidade: "city",
  telefonesecundario: "secondary_phone",
  ultimacontribuicao: "legacy_last_contribution",
  nome: "name",
  name: "name",
  email: "email",
  telefone: "phone",
  celular: "phone",
  phone: "phone",
  nascimento: "birthday",
  datadenascimento: "birthday",
  birthday: "birthday",
  observacoes: "notes",
  notes: "notes",
  codigo: "external_code",
  externalcode: "external_code",
};
export function parseImport(text) {
  text = text.replace(/^\uFEFF/, "");
  const separator = text.split(/\r?\n/)[0].includes(";") ? ";" : ",";
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell) throw Error("Aspas inválidas no CSV.");
      else quoted = !quoted;
    } else if (!quoted && (c === separator || c === "\n")) {
      row.push(cell.trim());
      cell = "";
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else if (c !== "\r" || quoted) cell += c;
  }
  if (quoted) throw Error("Aspas não fechadas no CSV.");
  row.push(cell.trim());
  rows.push(row);
  const headers = rows.shift().map((h) => aliases[key(h)]);
  if (!headers.includes("name")) throw Error("Inclua uma coluna Nome.");
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length)
    throw Error("Há colunas repetidas.");
  const records = rows
    .filter((r) => r.some(Boolean))
    .map((r, i) => {
      if (r.length !== headers.length)
        throw Error(`Quantidade de colunas inválida na linha ${i + 2}.`);
      const p = Object.fromEntries(
        headers.flatMap((h, j) => (h ? [[h, r[j]]] : [])),
      );
      if (p.birthday && /^\d{2}\/\d{2}\/\d{4}$/.test(p.birthday))
        p.birthday = p.birthday.split("/").reverse().join("-");
      const errors = [];
    if (Object.values(p).some((value) => value.includes('\ufffd')))
      errors.push('Caractere não reconhecido: confira o documento original');
      if (!p.name || p.name.length < 2 || p.name.length > 150)
        errors.push("Nome deve ter de 2 a 150 caracteres");
      if (
        p.email &&
        (!/^[^ @]+@[^ @]+\.[^ @]+$/.test(p.email) || p.email.length > 254)
      )
        errors.push("E-mail inválido");
      if (p.phone && !/^\d{10,15}$/.test(p.phone.replace(/\D/g, "")))
        errors.push("Telefone deve incluir DDD");
      if (
        p.birthday &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(p.birthday) ||
          !Number.isFinite(Date.parse(p.birthday)) ||
          new Date(p.birthday).toISOString().slice(0, 10) !== p.birthday ||
          p.birthday > new Date().toISOString().slice(0, 10))
      )
        errors.push("Nascimento inválido");
      if (
        p.address?.length > 500 ||
        p.city?.length > 150 ||
        p.secondary_phone?.length > 80
      )
        errors.push("Endere?o ou contato muito longo");
      if (
        p.legacy_last_contribution &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(p.legacy_last_contribution) ||
          !Number.isFinite(Date.parse(p.legacy_last_contribution)) ||
          new Date(p.legacy_last_contribution).toISOString().slice(0, 10) !==
            p.legacy_last_contribution)
      )
        errors.push("Data da ?ltima contribui??o inv?lida");
      if (p.external_code?.length > 80 || p.notes?.length > 2000)
        errors.push("Código ou observações muito longos");
      return { record: p, line: i + 2, errors };
    });
  if (!records.length || records.length > 1000)
    throw Error("Envie entre 1 e 1000 cadastros por arquivo.");
  return records;
}
