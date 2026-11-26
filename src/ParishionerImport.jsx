import React, { useState } from "react";
import { parseImport } from "./parishioner-import";

export default function ParishionerImport({
  db,
  demo,
  online,
  notify,
  onImported,
}) {
  const [rows, setRows] = useState([]),
    [source, setSource] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null);
  async function read(event) {
    const file = event.target.files[0];
    setRows([]);
    setError("");
    setResult(null);
    setSource("");
    if (!file) return;
    try {
      if (!/\.csv$/i.test(file.name))
        throw Error(
          "Selecione um CSV exportado do Excel. A leitura direta de Excel e PDF será ajustada ao arquivo enviado.",
        );
      if (file.size > 2 * 1024 * 1024)
        throw Error("O arquivo deve ter até 2 MB.");
      setRows(parseImport(await file.text()));
      setSource(file.name.slice(0, 200));
    } catch (e) {
      setError(e.message);
    }
  }
  async function save() {
    if (
      busy ||
      demo ||
      !db ||
      !online ||
      !rows.length ||
      rows.some((r) => r.errors.length)
    )
      return;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await db.rpc("import_parishioners", {
        source_name: source,
        records: rows.map((r) => r.record),
      });
      if (error) throw error;
      setResult(data);
      setRows([]);
      notify(
        `${data.inserted} cadastros importados; ${data.skipped} possíveis duplicados ignorados.`,
      );
      await onImported();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="white-card import-panel" aria-labelledby="import-title">
      <h3 id="import-title">Importar dizimistas</h3>
      <p>
        Confira os dados antes de confirmar. Cadastros existentes não serão
        sobrescritos. Não cria contas nem pagamentos.
      </p>
      <p>
        Primeira etapa: CSV UTF-8 exportado do Excel, até 1.000 pessoas. Excel
        (.xlsx) e PDF serão adaptados após recebermos seu arquivo.
      </p>
      <p>
        Colunas: Nome (obrigatório), Código, E-mail, Telefone com DDD,
        Nascimento (DD/MM/AAAA), Observações. Preserve códigos e telefones como
        texto no Excel.
      </p>
      <label>
        Selecionar cadastros
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={read}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p role="status">
          Concluído: {result.inserted} incluídos e {result.skipped} possíveis
          duplicados ignorados.
        </p>
      )}
      {rows.length > 0 && (
        <>
          <p role="status">
            {source}: {rows.length} cadastros;{" "}
            {rows.filter((r) => r.errors.length).length} com erros. Prévia das
            primeiras 20 linhas.
          </p>
          <div className="import-preview">
            {rows.slice(0, 20).map((r) => (
              <article key={r.line}>
                <b>
                  Linha {r.line}: {r.record.name || "Sem nome"}
                </b>
                <p>
                  {r.record.email} {r.record.phone}
                </p>
                <small>{r.record.birthday}</small>
                {r.errors.map((e) => (
                  <p className="form-error" key={e}>
                    {e}
                  </p>
                ))}
              </article>
            ))}
          </div>
          {rows.some((r) => r.errors.length) && (
            <p role="alert">
              Corrija as linhas{" "}
              {rows
                .filter((r) => r.errors.length)
                .map((r) => r.line)
                .join(", ")}{" "}
              no arquivo e selecione-o novamente.
            </p>
          )}
          <p>
            O banco identifica possíveis duplicados por código, e-mail ou nome
            com telefone/nascimento. Nomes iguais sem telefone e nascimento
            também são ignorados para revisão manual.
          </p>
          <button
            className="primary"
            disabled={
              busy || demo || !online || rows.some((r) => r.errors.length)
            }
            onClick={save}
          >
            {busy ? "Importando…" : "Confirmar importação"}
          </button>
        </>
      )}
      {demo && (
        <p className="muted">
          Demonstração: é possível conferir o arquivo; a gravação está
          desabilitada.
        </p>
      )}
    </section>
  );
}
