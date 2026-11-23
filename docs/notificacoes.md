# Central de notificações

Acesso no app: **Comunidade > Notificações**. A interface de envio ocupa a página, não um pop-up. O fluxo tem três etapas: assunto/público, mensagem/horário e revisão/confirmação. Não há disparo apenas por abrir um formulário ou confirmar um pagamento.

## Responsabilidades

| Perfil | Assuntos que pode enviar |
| --- | --- |
| Administrador | Todos, além de pausar assuntos e vincular cadastros a contas |
| Conselho Administrativo | Comunicados, promoções/eventos e celebrações |
| Conselho Econômico | Recebimento de dízimo e oferta confirmados |
| Pastoral do Dízimo | Aniversários e lembretes de dízimo/oferta |

Todos os usuários aprovados podem configurar **Preferências**, ativar push no próprio aparelho e recusar cada assunto. O controle geral não substitui essa escolha individual. Inscrever um aparelho é uma permissão explícita solicitada pelo usuário.

## Destinatários e privacidade

- Avisos gerais podem alcançar todos os inscritos, um perfil ou uma pessoa.
- Aniversários são sempre individuais. O aniversariante precisa ter uma conta aprovada para receber push.
- Recebimentos exigem uma contribuição confirmada e são direcionados pela função SQL à conta do contribuinte, ignorando qualquer destinatário arbitrário enviado pelo navegador. O texto financeiro é fixo e sem valores ou comprovantes.
- Quando a equipe registra em nome de um dizimista, o Administrador deve vincular o cadastro à conta correta em **Controle geral**. Sem vínculo, o aviso é recusado. A equipe da Pastoral não pode alterar esse vínculo pela API.
- O serviço revalida a confirmação do pagamento, o vínculo, a aprovação das contas, as preferências e a pausa do assunto antes de processar. Se o pagamento foi reaberto, o aviso é cancelado.
- Endpoint push e chaves de dispositivo não aparecem no histórico da equipe. O worker aceita somente provedores conhecidos por HTTPS, evitando envio para URLs arbitrárias.

## Fila, horário e histórico

O usuário escolhe envio imediato ou data/horário em Palotina (America/Sao_Paulo, UTC−3). O banco rejeita datas passadas e agendamentos além de um ano. A fila não processa antes do horário solicitado.

O histórico registra autor, assunto, texto, público, horário, estado, aceites, falhas, ignorados e resultados desconhecidos. **Aceito** significa que o serviço push aceitou a solicitação, não que a pessoa recebeu ou leu. Falhas de rede sem resposta são desconhecidas e não são reenviadas às cegas. Dispositivos expirados são removidos da lista de inscrições; o resultado da tentativa é preservado.

Avisos na fila podem ser cancelados. Envios já iniciados ou aceitos não podem ser desfeitos. A pausa geral impede novos avisos do assunto e faz os pendentes serem cancelados/ignorados no processamento. Reativar um assunto não recupera avisos cancelados.

Cada dispositivo tem uma entrega única por campanha. Aquisições atômicas no PostgreSQL impedem dois processadores de dispararem a mesma entrega. Uma execução trata até 40 dispositivos por campanha e até duas campanhas; a fila continua na execução seguinte. Um processamento interrompido pode ser recuperado após dez minutos; tentativas que ficaram sem resultado são marcadas como desconhecidas, sem duplicar a notificação.

## Ativação no backend

1. Aplicar a migração 004 após as três anteriores e publicar a Edge Function `send-push`.
2. Configurar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` como segredos da função; apenas a chave pública é exposta como `VITE_VAPID_PUBLIC_KEY` no frontend.
3. Para processar agendamentos sem manter o app aberto, gerar um segredo aleatório de pelo menos 32 caracteres como `NOTIFICATION_CRON_SECRET`. Guardar a mesma chave no Vault como `capela_notification_cron_secret`, além da URL do projeto em `capela_project_url`.
4. Habilitar pg_cron e pg_net e executar o modelo `templates/notifications-cron.sql.example`. Monitorar os jobs no Dashboard Supabase.
5. Inscrever aparelhos de teste e verificar envio, recusa por assunto, cancelamento, fila e falhas antes de utilizar com a comunidade.

O `verify_jwt=false` em `supabase/config.toml` permite o caminho de cron, mas não torna o serviço aberto: a função valida o JWT com `auth.getUser()` e o perfil/assunto, ou exige a chave privada exclusiva do cron. As operações de claim no banco são restritas a `service_role`. Senhas, chave service_role, chave VAPID privada e chave do cron nunca devem ser incluídas no HTML, GitHub ou variáveis VITE.

Não foram ativadas rotinas automáticas recorrentes de aniversário, recebimento ou cobrança. A versão atual controla avisos explícitos e agendamentos individuais. Recorrência, horários de silêncio e política de frequência exigem uma etapa posterior de configuração.

Fontes oficiais: [Supabase — funções agendadas](https://supabase.com/docs/guides/functions/schedule-functions), [Supabase Cron](https://supabase.com/docs/guides/cron), [web-push](https://github.com/web-push-libs/web-push), [Web Push no iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
