# Importação de dizimistas

Estado em 25/11/2026: implementação local. Migração 005 preparada e testada em PostgreSQL emulado; não aplicada a um Supabase real.

## Operação

1. Aplicar `005_parishioner_import.sql` depois das migrações 001–004 no projeto Supabase dedicado.
2. Em Comunidade > Dizimistas, selecionar CSV UTF-8 exportado do Excel, separado por vírgula ou ponto e vírgula. Limites: 2 MB e 1.000 registros por lote. O arquivo é lido localmente; somente os registros são enviados ao confirmar.
3. Conferir a prévia, corrigir erros e confirmar a importação com conta aprovada de Administrador, Conselho Econômico ou Pastoral do Dízimo. Na demonstração, apenas a prévia funciona.

Colunas reconhecidas: Nome, Código, E-mail, Telefone, Nascimento, Observações, Endereço, Cidade, Telefone secundário e Última contribuição. Nome obrigatório. Nascimento aceita DD/MM/AAAA ou AAAA-MM-DD; última contribuição aceita AAAA-MM-DD. Telefones principais precisam de DDD; não inferir DDD. Códigos devem ser texto para preservar zeros iniciais. Colunas desconhecidas são ignoradas; verificar o arquivo antes de confirmar.

Gravação atômica: qualquer erro reverte o lote inteiro. O histórico registra autor, data, arquivo e contagens. Cada pessoa recebe vínculo ao lote e número sequencial do registro. Possíveis duplicados são ignorados por código, e-mail ou nome com telefone/nascimento. Nome idêntico sem telefone e nascimento também é ignorado para revisão manual. Não há atualização automática de cadastros existentes; homônimos exigem conferência. Importações concorrentes são serializadas no banco.

O cadastro importado não cria login, vínculo automático de conta, contribuições ou recebimentos. A data de última contribuição do relatório é somente uma referência histórica, sem valores e sem efeitos nos gráficos ou pagamentos.

## PDF recebido

O conversor `scripts/convert-parishioners-pdf.py` foi ajustado ao relatório Cúria Online em paisagem. Requer PyMuPDF; execução local, sem rede e sem gravação no banco:

```powershell
& 'C:/Douglas_Desenv/.tools/Python311-embed/python.exe' scripts/convert-parishioners-pdf.py 'RELATORIO DIZIMISTAS BAIRRO UNIAO.pdf' dados-privados
```

Resultado corrigido após conferência visual das nove páginas: **170 cadastros e 170 códigos distintos**, coincidindo com o total declarado no PDF. Distribuição: 19 na primeira página, 20 em cada página de 2 a 8 e 11 na última. A extração anterior de 163 estava incorreta: pulava a primeira linha de páginas subsequentes e incluía o total como pessoa. A versão anterior está preservada como `dados-privados/dizimistas-preliminar-v1-incompleto.csv` e não deve ser importada.

CSV atual em `dados-privados/dizimistas-revisao.csv`; relatório técnico com hash do PDF em `dados-privados/validacao-importacao.json`. A extração usa blocos de texto por coluna para preservar nomes que ultrapassam visualmente a coluna, sem misturar nascimento ou telefone.

São **54 ocorrências para revisão: 30 nascimentos zerados e 24 telefones principais incompletos/sem DDD**, listadas em `dados-privados/pendencias-importacao.json`. Datas zeradas viraram ausência; telefones incompletos foram preservados nas observações, sem presumir DDD. A validação sintática dos 170 registros passou. A conferência visual cobre estrutura e distribuição nas nove páginas; não equivale a certificação manual de cada caractere de cada campo. Não importar sem resolver ou aceitar explicitamente as ausências. Nenhum cadastro gravado no banco.

Teste de regressão da primeira linha e da exclusão do total: `C:/Douglas_Desenv/.tools/Python311-embed/python.exe tests/test_pdf_conversion.py` (passou). O conversor agora interrompe se a contagem divergir do total declarado no documento.

O conversor usa posições de colunas específicas desse relatório; outro layout exige adaptação. Telefones incompletos são preservados nas observações. A segunda linha telefônica é preservada como referência textual. Não dividir cadastros com casais sem decisão sobre a organização original.

PDFs e `dados-privados/` estão ignorados no Git e fora de `public/`/`dist/`. Não mover para os arquivos publicados. Leitura direta de XLSX ou PDF no navegador ainda não implementada; o fluxo atual usa CSV, incluindo conversão local do relatório recebido.

## Responsividade

Regras comuns a navegador e PWA: campos de 16px no celular, alvos de toque de 44px, margens para áreas seguras, quebra de contatos longos, formulários e prévia em coluna em telas estreitas. A estrutura PWA existente foi preservada. Revisão visual em 320, 375, 390, 768 e 1280px, paisagem, teclado aberto e zoom de 200% permanece pendente: o host de navegador desta sessão estava indisponível. Testes de banco e build não substituem essa verificação.
