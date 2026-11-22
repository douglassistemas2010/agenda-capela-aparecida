# Comunidade Nossa Senhora Aparecida

App online da Capela Nossa Senhora Aparecida, Bairro União, Palotina. Desenvolvimento: **Douglas Araujo Gomes**.

[Abrir o app](https://douglassistemas2010.github.io/agenda-capela-aparecida/) · [Repositório](https://github.com/douglassistemas2010/agenda-capela-aparecida)

## Estado desta entrega

Interface implementada e publicável no GitHub Pages. Sem configuração Supabase, abre uma **demonstração explicitamente identificada**, com dados ilustrativos e gravação desabilitada. Nenhum dado de reserva ou contribuição é salvo no navegador.

O backend deste app está em `supabase/`, separado dos outros projetos. A migração se destina a **um novo projeto Supabase dedicado**. Não a execute sobre um banco de outro sistema: ela cria tabelas no schema `public`, gatilho de cadastro e políticas de acesso.

### Implementado

- Identidade mariana em azul, branco e dourado, tipografias Inter e Plus Jakarta Sans, ícones Lucide, ilustração vetorial de Nossa Senhora, navegação flutuante para celular e animações que respeitam a preferência de movimento reduzido. Layout próprio em CSS e visualizações da agenda por dia, semana e mês.
- Reservas: casamento, palestra, retiro, celebração, missa, culto da Palavra, promoção, evento e encontro.
- Criação/edição/cancelamento, autor e data do registro, taxas calculadas também no banco e bloqueio transacional de sobreposição de horários.
- Casamento: R$ 150 para contribuintes do dízimo da comunidade; R$ 350 para não contribuintes.
- Compartilhamento intencional via WhatsApp, sem contatos e observações internas.
- Login por senha, recuperação e cadastro com aprovação; integrações Google e Apple aguardam configuração das contas dos provedores.
- Perfis: Administrador, Conselho Administrativo, Conselho Econômico e Pastoral do Dízimo. Ninguém se promove pelo próprio cadastro.
- Conselho Administrativo: agenda, celebrações e comunicados. Conselho Econômico: financeiro e conferência de pagamentos. Pastoral do Dízimo: dizimistas e registro/acompanhamento de contribuições, sem confirmar pagamentos. Administrador: acesso completo e aprovação de usuários.
- Cadastro de dizimistas, aniversário, contato e observações reservado ao Administrador, Conselho Econômico e Pastoral do Dízimo.
- Registro de dízimos e ofertas por competência, comprovantes JPG/PNG/PDF privados, conferência manual e histórico do usuário.
- Gráficos semanais e mensais, somente de contribuições confirmadas; cada usuário comum acessa apenas suas próprias contribuições.
- Mural de comunicados, promoções e eventos e lembrete compartilhável no WhatsApp.
- Base PWA instalável, service worker **sem cache**, inscrição em push e função de envio de comunicados para dispositivos autorizados.
- Reflexão diária editorial inspirada em referências bíblicas. Não é uma integração com o lecionário/liturgia oficial do dia.

### Ativar operação real

1. Criar um projeto Supabase dedicado, sem contratar plano pago por este procedimento.
2. Executar `supabase/migrations/001_community.sql` e depois `supabase/migrations/002_profiles.sql` no SQL Editor desse projeto. Se a primeira já foi aplicada, executar somente a segunda. A segunda mantém antigos usuários da Secretaria no Conselho Administrativo; antigos perfis de Tesouraria e Consulta precisam de nova aprovação para revisar as novas permissões.
3. Em Authentication > URL Configuration, definir a URL do GitHub Pages como Site URL e redirect permitido.
4. Configurar envio de e-mails/SMTP, confirmação de e-mail e limites do Auth no Supabase.
5. Copiar `.env.example` para `.env` local e preencher a URL e a chave **pública** anon/publishable. Nunca colocar senha de banco, service_role ou segredos OAuth em variáveis VITE.
6. Para publicação direta, configurar essas variáveis no `.env` local e compilar. Ao ativar GitHub Actions futuramente, cadastrar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em Settings > Secrets and variables > Actions > Variables.
7. Cadastrar e confirmar o e-mail do proprietário. Promovê-lo via SQL Editor usando o comando comentado ao final da migração. Os demais usuários serão aprovados pela tela Pessoas.
8. Habilitar Google e Apple no Supabase e configurar os apps/redirects nos respectivos consoles. A configuração Apple exige credenciais e manutenção do segredo do provedor.

### Pix

Chave informada: **uniao.mitra@hotmail.com**. Cidade: **Palotina**. O nome bancário do beneficiário ainda precisa ser confirmado.

Em Comunidade > Contribuir > Configurar Pix, o administrador cadastra chave, nome e cidade. O código segue o payload Pix estático com CRC. Não se cobra nem se confirma pagamento automaticamente. O fiel abre o app do banco, confere o destinatário e paga; o Conselho Econômico confere o recebimento. Integração bancária com webhook é uma evolução separada, ainda não implementada.

### Push e lembretes

- Gerar um par VAPID e guardar a chave privada somente como segredo da função Supabase.
- Configurar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` no backend e `VITE_VAPID_PUBLIC_KEY` como variável pública de build.
- Publicar `supabase/functions/send-push/index.ts` com a CLI Supabase. A função exige sessão de Administrador ou Conselho Administrativo e distribui apenas notificações genéricas de comunicados já existentes.
- O usuário ativa a permissão no próprio dispositivo. No iPhone/iPad compatível, instalar na tela inicial e abrir o app instalado antes de ativar push.
- O botão **Notificar** no mural envia o comunicado aos dispositivos inscritos. Não há disparos nesta demonstração.
- Lembretes automáticos agendados de dízimos/ofertas, aniversários e celebrações ainda precisam de agenda de execução, consentimento por categoria, deduplicação e preferências de horário. Nesta versão, há lembrete manual no WhatsApp e envio manual de push de comunicados.

### Privacidade e limites

O repositório e a interface podem ser públicos; os dados reais exigem autenticação e aprovação no Supabase. Comprovantes ficam em bucket privado com links temporários. Não fazer upload de dados reais para o GitHub. Não há cartão, débito automático, integração bancária, conciliação automática ou aplicativo publicado na App Store/Play Store.

Reservas representam o uso de um único espaço da capela e devem começar e terminar no mesmo dia. Retiros de vários dias devem ter uma reserva por dia. O cadastro de dizimista não determina automaticamente a taxa do casamento: o vínculo de contribuição é conferido pelo Conselho Administrativo.

## Desenvolvimento

Node.js 22 ou superior.

```sh
npm ci
npm run dev
npm test
npm run build
```

A publicação atual usa a branch `gh-pages`, com o app compilado. Para atualizar: `npm test`, `npm run build` e `node scripts/deploy-pages.mjs`. O modelo `templates/github-pages.yml.example` permite ativar GitHub Actions futuramente, quando a autorização GitHub incluir o escopo `workflow`; mova-o para `.github/workflows/pages.yml`. O banco e o serviço de push são serviços separados do GitHub Pages.

## Verificação

Testes automatizados de taxas, limites de períodos, colisões, privacidade do resumo WhatsApp e CRC Pix. Build Vite validado. A autenticação, as políticas SQL, os comprovantes, o Pix bancário e o push precisam ser testados de ponta a ponta após provisionar o Supabase e os provedores. A revisão visual no navegador não pôde ser concluída nesta sessão por indisponibilidade do acesso ao navegador.

Documentação oficial: [Supabase Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Apple](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple), [Web Push no iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
