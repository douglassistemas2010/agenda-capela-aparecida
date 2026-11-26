# Perfis atuais — 25/11/2026

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
