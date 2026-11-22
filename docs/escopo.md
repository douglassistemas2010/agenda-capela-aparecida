# Escopo e próximos passos

## Organização

- Capela Nossa Senhora Aparecida, Bairro União, Palotina.
- Administrador: aprovar/suspender acesso, perfis, reservas, financeiro e Pix.
- Conselho Administrativo: agenda, celebrações, mural e envio de comunicados.
- Conselho Econômico: dizimistas, dados pessoais, contribuições, gráficos e conferência de comprovantes.
- Pastoral do Dízimo: cadastro de dizimistas, aniversariantes e registro/acompanhamento das contribuições; sem confirmar pagamentos ou gerenciar acessos.
- Todos os perfis aprovados podem consultar a agenda e o mural e registrar suas próprias contribuições.

## Fluxos disponíveis no código

1. Cadastro → confirmação do e-mail → aprovação → acesso conforme perfil.
2. Reserva → validação de horário → cálculo de taxa → gravação com autor → compartilhamento pelo WhatsApp.
3. Contribuição → Pix no banco do fiel → registro com comprovante → pendente → conferência do Conselho Econômico → confirmado → gráfico.
4. Comunicado → publicação no mural → compartilhamento ou envio manual de push.

## Evoluções planejadas, não entregues como operacionais

- Lembretes automáticos com execução agendada, categorias de consentimento, horário e deduplicação.
- Preferências e cancelamento de notificações no app.
- Integração bancária para Pix dinâmico, vencimento e confirmação por webhook, se houver contratação autorizada.
- Aniversários compartilhados com consentimento individual. Atualmente a lista fica restrita à equipe financeira.
- Liturgia oficial do dia, com fonte confiável e atualização monitorada. Atualmente existe um ciclo editorial de sete reflexões.
- Recorrência de missas e cultos, reservas com vários dias, vários espaços, edição completa de dizimistas e exportação de relatórios.
- Contribuição vinculada à conta do dizimista por convite validado e conciliação do histórico anterior.
- Auditoria histórica completa de alterações (atualmente são preservados o criador e os dados da última alteração/conferência).

## Antes de usar com dados reais

Provisionar backend dedicado; validar RLS com usuários de todos os perfis; configurar provedores e e-mails; validar comprovantes e restauração de backup; conferir o titular bancário do Pix; testar Android e iOS reais. Nenhum custo pago foi autorizado ou contratado.
