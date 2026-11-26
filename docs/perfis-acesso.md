# Perfis atuais — 25/11/2026

**Correção de escopo:** Dizimista não tem reservas nem acesso à agenda de reservas. Navegação: Início, Meu dízimo e Avisos. Removidos o botão Reservar da barra inferior, cards de encontros e celebrações derivados de reservas, acesso a detalhes e leitura de `events` pelo cliente. A migração `007_staff_reservations.sql`, depois de 001–006, restringe a leitura de reservas ao Administrador e Agente de Pastoral; ainda não aplicada ao Supabase real. Comunicados publicados no Mural continuam disponíveis. Esta correção substitui as referências à agenda para Dizimista abaixo.

## Revisão da experiência Dizimista

Início próprio em `DizimistaHome.jsx`: saudação curta, contribuição em destaque, celebração do fim de semana, reflexão, até três próximos encontros e acesso aos avisos. A página não reutiliza estatísticas administrativas nem calendário lateral do portal. Navegação inferior: Início, Agenda e Meu dízimo; este último abre diretamente Contribuir, com histórico e abas de mural/notificações. Os botões de nova reserva ficam fora da experiência Dizimista. Agenda abre na visão Dia ao usar a navegação inferior. A troca de tela volta ao topo.

Estilos em `dizimista.css`, aplicados apenas à visão Dizimista: coluna única também na agenda, cabeçalho compacto, fontes e contraste consistentes, cards com espaçamento de 20px, botões de toque, navegação com área segura e regras para telas a partir de 320px. A revisão é de implementação; inspeção visual no navegador e testes em aparelhos continuam pendentes por limitação da ferramenta de acesso ao navegador. Testes funcionais existentes e build aprovados.

Três perfis substituem a divisão anterior por conselhos:

| Perfil | Canal e experiência | Permissões |
|---|---|---|
| Administrador | Portal web responsivo | Acesso completo, aprova usuários, define perfis e confirma recebimentos |
| Agente de Pastoral | Portal web responsivo | Agenda, comunicados, cadastros/importação e acompanhamento de contribuições; sem gestão de acessos nem confirmação de recebimentos |
| Dizimista | Visão de app compacta, inclusive no navegador | Agenda e avisos da comunidade, envio e consulta das próprias contribuições, preferências de notificações; sem lista de dizimistas ou dados financeiros de terceiros |

A atribuição real acontece em Pessoas, somente pelo Administrador. Novas contas nascem como Dizimista e aguardam aprovação. Ninguém escolhe um cargo administrativo pelo cadastro. O seletor **Visualizar como** aparece somente na demonstração e não altera permissões reais. Trocar para Dizimista aplica imediatamente o layout de app, com largura máxima de 480px, navegação inferior e conteúdo em coluna. A equipe também pode usar o navegador no celular.

Aplicar `006_access_channels.sql` após 001–005 no Supabase dedicado. Não foi aplicada ao banco real nesta etapa. Administradores existentes são preservados. As contas antigas não administrativas voltam a Dizimista sem aprovação, para o ADM definir o novo acesso: consolidar funções da equipe amplia atribuições e exige revisão. As políticas e funções 001–005 reconhecem Agente de Pastoral por compatibilidade centralizada em `has_role`; o papel econômico antigo não é concedido a ele. Audiências antigas de notificações passam ao grupo Agente de Pastoral.

O layout de app é web/PWA e prepara a evolução para iOS e Android; não é um aplicativo nativo compilado nem uma publicação nas lojas. A base PWA existente foi preservada. Revisão visual em dispositivos e autenticação ponta a ponta continuam pendentes; o host de navegador da sessão estava indisponível.

Validação: 30 testes automatizados passaram, incluindo execução das migrações em PostgreSQL emulado, bloqueio de leitura de cadastros/contribuições de terceiros pelo Dizimista e impedimento de promoção de usuário pelo Agente. Build de produção e prévia HTML gerados.
