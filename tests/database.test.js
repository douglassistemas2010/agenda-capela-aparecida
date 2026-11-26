import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  econ: "00000000-0000-4000-8000-000000000002",
  pastoral: "00000000-0000-4000-8000-000000000003",
  administrativo: "00000000-0000-4000-8000-000000000004",
  person: "00000000-0000-4000-8000-000000000005",
};
test("PostgreSQL: migrações, RLS, confirmação e fila de notificações", async (t) => {
  const db = new PGlite({ extensions: { btree_gist } });
  try {
    // Emula somente os schemas da plataforma. Todas as migrações do app são executadas sem alterações.
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create schema storage;
   create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',email_confirmed_at timestamptz);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets,name text);
   create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
   alter table storage.objects enable row level security;
   grant usage on schema public,auth,storage to authenticated,anon,service_role;
   grant all on storage.objects to authenticated,service_role;
   alter default privileges in schema public grant all on tables to authenticated,service_role;`);
    for (const name of [
      "001_community.sql",
      "002_profiles.sql",
      "003_owner.sql",
      "004_notifications.sql",
      "005_parishioner_import.sql",
    ])
      await db.exec(
        readFileSync(
          new URL("../supabase/migrations/" + name, import.meta.url),
          "utf8",
        ),
      );
    await t.test(
      "Proprietário só recebe administração após confirmar o e-mail",
      async () => {
        await db.query("insert into auth.users(id,email) values($1,$2)", [
          ids.admin,
          "douglas_sistemas2010@hotmail.com",
        ]);
        assert.deepEqual(
          (
            await db.query("select role,approved from profiles where id=$1", [
              ids.admin,
            ])
          ).rows[0],
          { role: "pastoral_dizimo", approved: false },
        );
        await db.query(
          "update auth.users set email_confirmed_at=now() where id=$1",
          [ids.admin],
        );
        assert.deepEqual(
          (
            await db.query(
              "select name,role,approved from profiles where id=$1",
              [ids.admin],
            )
          ).rows[0],
          { name: "Douglas Araujo Gomes", role: "admin", approved: true },
        );
      },
    );
    for (const [key, role] of [
      ["econ", "conselho_economico"],
      ["pastoral", "pastoral_dizimo"],
      ["administrativo", "conselho_administrativo"],
    ]) {
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,now())",
        [
          ids[key],
          `${key}@example.test`,
          { full_name: key, role: "admin", approved: true },
        ],
      );
      await db.query("update profiles set role=$1,approved=true where id=$2", [
        role,
        ids[key],
      ]);
    }
    async function as(key, callback, role = "authenticated") {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        ids[key] || key,
      ]);
      await db.exec(`set role ${role}`);
      try {
        return await callback();
      } finally {
        await db.exec("reset role");
      }
    }
    async function queue(category, extra = {}) {
      const v = {
        title: "Aviso de teste",
        body: "Mensagem de teste",
        audience: "todos",
        target: null,
        payment: null,
        when: null,
        request: crypto.randomUUID(),
        ...extra,
      };
      return (
        await db.query(
          "select public.queue_notification($1,$2,$3,$4,$5,$6,$7,$8) as id",
          [
            category,
            v.title,
            v.body,
            v.audience,
            v.target,
            v.payment,
            v.when,
            v.request,
          ],
        )
      ).rows[0].id;
    }
    await t.test(
      "Conselho Administrativo não envia avisos financeiros nem se promove",
      async () => {
        await as("administrativo", async () => {
          await assert.rejects(
            () => queue("recebimento_dizimo"),
            /não pode enviar/,
          );
          assert.equal(
            (
              await db.query(
                "update profiles set role='admin' where id=$1 returning id",
                [ids.administrativo],
              )
            ).rows.length,
            0,
          );
          await assert.rejects(
            () =>
              db.query("select * from claim_notification($1)", [
                crypto.randomUUID(),
              ]),
            /permission denied/,
          );
        });
      },
    );
    let payment;
    await as("administrativo", async () => {
      payment = (
        await db.query(
          "insert into contributions(kind,amount,paid_on,competence,user_id) values('Dízimo',150,current_date,'2026-11',$1) returning id",
          [ids.administrativo],
        )
      ).rows[0].id;
    });
    await t.test(
      "Pastoral registra mas não confirma o recebimento",
      async () => {
        await as("pastoral", async () =>
          assert.equal(
            (
              await db.query(
                "update contributions set status='Confirmado' where id=$1 returning id",
                [payment],
              )
            ).rows.length,
            0,
          ),
        );
        await as("econ", async () =>
          db.query("update contributions set status='Confirmado' where id=$1", [
            payment,
          ]),
        );
      },
    );
    let campaign;
    await t.test(
      "Aviso financeiro força o destinatário correto e omite valores",
      async () => {
        campaign = await as("econ", () =>
          queue("recebimento_dizimo", {
            payment,
            target: ids.admin,
            title: "Valor secreto",
            body: "R$ 150 CONFIDENCIAL",
          }),
        );
        const row = (
          await db.query(
            "select audience,recipient_id,title,body from notification_campaigns where id=$1",
            [campaign],
          )
        ).rows[0];
        assert.equal(row.audience, "pessoa");
        assert.equal(row.recipient_id, ids.administrativo);
        assert.ok(!row.body.includes("150"));
        assert.ok(!row.title.includes("secreto"));
      },
    );
    await t.test(
      "Aniversário não vira divulgação em massa e pedido repetido é idempotente",
      async () => {
        await as("pastoral", async () => {
          await assert.rejects(() => queue("aniversario"), /conta aprovada/);
          const request = crypto.randomUUID();
          const first = await queue("aniversario", {
            request,
            target: ids.administrativo,
          });
          const second = await queue("aniversario", {
            request,
            target: ids.administrativo,
          });
          assert.equal(first, second);
          assert.equal(
            (
              await db.query(
                "select audience from notification_campaigns where id=$1",
                [first],
              )
            ).rows[0].audience,
            "pessoa",
          );
        });
      },
    );
    await t.test(
      "Só o Administrador pode vincular uma pessoa à conta",
      async () => {
        await as("pastoral", async () =>
          db.query(
            "insert into parishioners(id,name,created_by) values($1,$2,$3)",
            [ids.person, "Dizimista", ids.pastoral],
          ),
        );
        await as("pastoral", () =>
          assert.rejects(
            () =>
              db.query(
                "update parishioners set linked_user_id=$1 where id=$2",
                [ids.admin, ids.person],
              ),
            /Somente o Administrador/,
          ),
        );
        await as("admin", () =>
          db.query("select link_parishioner_account($1,$2)", [
            ids.person,
            ids.administrativo,
          ]),
        );
      },
    );
    await t.test(
      "Preferência individual impede envio e claim não duplica trabalho",
      async () => {
        const subscription = (
          await db.query(
            "insert into push_subscriptions(user_id,endpoint,subscription) values($1,$2,$3) returning id",
            [
              ids.administrativo,
              "https://fcm.googleapis.com/abc",
              { endpoint: "https://fcm.googleapis.com/abc" },
            ],
          )
        ).rows[0].id;
        await as("administrativo", () =>
          db.query(
            "insert into notification_preferences(user_id,category,enabled) values($1,'recebimento_dizimo',false)",
            [ids.administrativo],
          ),
        );
        const claim = await as(
          "admin",
          () => db.query("select * from claim_notification($1)", [campaign]),
          "service_role",
        );
        assert.equal(claim.rows.length, 1);
        const again = await as(
          "admin",
          () => db.query("select * from claim_notification($1)", [campaign]),
          "service_role",
        );
        assert.equal(again.rows.length, 0);
        const delivery = (
          await db.query(
            "insert into notification_deliveries(campaign_id,subscription_id,user_id) values($1,$2,$3) returning id",
            [campaign, subscription, ids.administrativo],
          )
        ).rows[0].id;
        const result = await as(
          "admin",
          () =>
            db.query("select claim_notification_delivery($1) as status", [
              delivery,
            ]),
          "service_role",
        );
        assert.equal(result.rows[0].status, "skipped");
      },
    );
    await t.test("Pausa global bloqueia enfileirar novos avisos", async () => {
      await as("admin", () =>
        db.query(
          "update notification_controls set enabled=false where category='comunicado'",
        ),
      );
      await as("administrativo", () =>
        assert.rejects(() => queue("comunicado"), /pausado/),
      );
    });
    await t.test(
      "Agendamento futuro não é disparado antes da hora e pode ser cancelado",
      async () => {
        const future = new Date(Date.now() + 3600000).toISOString();
        const id = await as("pastoral", () =>
          queue("lembrete_oferta", { when: future }),
        );
        assert.equal(
          (
            await as(
              "admin",
              () => db.query("select * from claim_notification($1)", [id]),
              "service_role",
            )
          ).rows.length,
          0,
        );
        await as("pastoral", () =>
          db.query("select cancel_notification($1)", [id]),
        );
        assert.equal(
          (
            await db.query(
              "select status from notification_campaigns where id=$1",
              [id],
            )
          ).rows[0].status,
          "cancelled",
        );
      },
    );
    await t.test(
      "Cada entrega só é adquirida uma vez e o histórico financeiro fica restrito",
      async () => {
        await as("administrativo", () =>
          db.query(
            "update notification_preferences set enabled=true where user_id=$1 and category='recebimento_dizimo'",
            [ids.administrativo],
          ),
        );
        const id = await as("econ", () =>
          queue("recebimento_dizimo", { payment }),
        );
        await as(
          "admin",
          () => db.query("select * from claim_notification($1)", [id]),
          "service_role",
        );
        const sub = (
          await db.query("select id from push_subscriptions where user_id=$1", [
            ids.administrativo,
          ])
        ).rows[0].id;
        const delivery = (
          await db.query(
            "insert into notification_deliveries(campaign_id,subscription_id,user_id) values($1,$2,$3) returning id",
            [id, sub, ids.administrativo],
          )
        ).rows[0].id;
        assert.equal(
          (
            await as(
              "admin",
              () =>
                db.query("select claim_notification_delivery($1) as status", [
                  delivery,
                ]),
              "service_role",
            )
          ).rows[0].status,
          "sending",
        );
        assert.equal(
          (
            await as(
              "admin",
              () =>
                db.query("select claim_notification_delivery($1) as status", [
                  delivery,
                ]),
              "service_role",
            )
          ).rows[0].status,
          "skipped",
        );
        assert.equal(
          (
            await as("administrativo", () =>
              db.query("select id from notification_campaigns where id=$1", [
                id,
              ]),
            )
          ).rows.length,
          0,
        );
      },
    );
    await t.test(
      "Banco aplica a taxa e impede horários sobrepostos",
      async () => {
        await as("admin", async () => {
          const event = (
            await db.query(
              "insert into events(title,type,date,start_time,end_time,contributor,amount) values('Casamento','Casamento','2027-01-02','09:00','10:00',true,1) returning amount,created_by",
            )
          ).rows[0];
          assert.equal(Number(event.amount), 150);
          assert.equal(event.created_by, ids.admin);
          await assert.rejects(
            () =>
              db.query(
                "insert into events(title,type,date,start_time,end_time) values('Outro','Missa','2027-01-02','09:30','10:30')",
              ),
            /exclusion constraint/,
          );
        });
      },
    );
    await t.test(
      "Importação protege permissões, duplicados e atomicidade",
      async () => {
        const records = [
          {
            name: "Pessoa Importada",
            external_code: "teste-001",
            phone: "44999999999",
            birthday: "1980-01-02",
            address: "Rua de teste",
            city: "Palotina",
            legacy_last_contribution: "2026-10-01",
          },
        ];
        await assert.rejects(
          () =>
            as("administrativo", () =>
              db.query("select import_parishioners($1,$2)", [
                "teste.csv",
                JSON.stringify(records),
              ]),
            ),
          /Acesso negado/,
        );
        const first = await as("pastoral", () =>
          db.query("select import_parishioners($1,$2) as result", [
            "teste.csv",
            JSON.stringify(records),
          ]),
        );
        assert.equal(first.rows[0].result.inserted, 1);
        const saved = (
          await db.query(
            "select address,city,legacy_last_contribution::text as last_date from parishioners where external_code='teste-001'",
          )
        ).rows[0];
        assert.deepEqual(saved, {
          address: "Rua de teste",
          city: "Palotina",
          last_date: "2026-10-01",
        });
        const repeated = await as("pastoral", () =>
          db.query("select import_parishioners($1,$2) as result", [
            "teste.csv",
            JSON.stringify(records),
          ]),
        );
        assert.equal(repeated.rows[0].result.skipped, 1);
        await assert.rejects(
          () =>
            as("econ", () =>
              db.query("select import_parishioners($1,$2)", [
                "erro.csv",
                JSON.stringify([{ name: "Pessoa Revertida" }, { name: "X" }]),
              ]),
            ),
          /Dados inválidos/,
        );
        assert.equal(
          (
            await db.query(
              "select id from parishioners where name='Pessoa Revertida'",
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await as("administrativo", () =>
              db.query("select * from parishioner_imports"),
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await db.query(
              "select id from parishioner_imports where source_name='erro.csv'",
            )
          ).rows.length,
          0,
        );
      },
    );
    await t.test(
      "Três perfis: equipe web e dizimista com dados restritos",
      async () => {
        await db.exec(
          readFileSync(
            new URL(
              "../supabase/migrations/006_access_channels.sql",
              import.meta.url,
            ),
            "utf8",
          ),
        );
        assert.equal(
          (
            await db.query("select role from profiles where id=$1", [
              ids.pastoral,
            ])
          ).rows[0].role,
          "dizimista",
        );
        assert.equal(
          (
            await db.query("select approved from profiles where id=$1", [
              ids.pastoral,
            ])
          ).rows[0].approved,
          false,
        );
        await db.query(
          "update profiles set role='agente_pastoral',approved=true where id=$1",
          [ids.pastoral],
        );
        await db.query(
          "update profiles set role='dizimista',approved=true where id=$1",
          [ids.econ],
        );
        const access = async (key) =>
          as(key, () =>
            db.query(
              "select is_member() as member,has_role(array['admin','pastoral_dizimo']) as cadastros,has_role(array['admin','conselho_administrativo']) as agenda,has_role(array['admin','conselho_economico']) as confirma",
            ),
          );
        assert.deepEqual((await access("pastoral")).rows[0], {
          member: true,
          cadastros: true,
          agenda: true,
          confirma: false,
        });
        assert.deepEqual((await access("econ")).rows[0], {
          member: true,
          cadastros: false,
          agenda: false,
          confirma: false,
        });
        assert.equal(
          (await as("econ", () => db.query("select * from parishioners"))).rows
            .length,
          0,
        );
        assert.equal(
          (
            await as("econ", () =>
              db.query("select * from contributions where user_id<>auth.uid()"),
            )
          ).rows.length,
          0,
        );
        await assert.rejects(
          () =>
            as("econ", () =>
              db.query(
                "select import_parishioners('teste.csv','[{\"name\":\"Pessoa Teste\"}]')",
              ),
            ),
          /Acesso negado/,
        );
        await assert.rejects(
          () =>
            as("pastoral", () =>
              db.query("select manage_member($1,$2,true)", [ids.econ, "admin"]),
            ),
          /Acesso negado/,
        );
      },
    );
    await t.test(
      "Dizimista não lê nem cria reservas; equipe mantém acesso",
      async () => {
        await db.exec(
          readFileSync(
            new URL(
              "../supabase/migrations/007_staff_reservations.sql",
              import.meta.url,
            ),
            "utf8",
          ),
        );
        assert.equal(
          (await as("econ", () => db.query("select * from events"))).rows
            .length,
          0,
        );
        assert.ok(
          (await as("admin", () => db.query("select id from events"))).rows
            .length > 0,
        );
        assert.ok(
          (await as("pastoral", () => db.query("select id from events"))).rows
            .length > 0,
        );
        await assert.rejects(
          () =>
            as("econ", () =>
              db.query(
                "insert into events(title,type,date,start_time,end_time) values('Teste','Missa','2028-02-01','09:00','10:00')",
              ),
            ),
          /row-level security/,
        );
      },
    );
  } finally {
    await db.close();
  }
});
