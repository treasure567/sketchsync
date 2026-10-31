import { hashPassword } from "../src/auth.ts";
import { migrate, pool, waitForDatabase } from "../src/db.ts";

const DEMO_PASSWORD = "sketchsync-demo";

const DEMO_USERS = [
  { email: "lecturer@sketchsync.test", name: "Dr. Ada Lovelace" },
  { email: "student@sketchsync.test", name: "Grace Hopper" },
  { email: "student2@sketchsync.test", name: "Alan Turing" },
];

await waitForDatabase();
await migrate();
const passwordHash = await hashPassword(DEMO_PASSWORD);
for (const user of DEMO_USERS) {
  await pool.query(
    `insert into users (email, name, password_hash) values ($1, $2, $3)
     on conflict (email) do update set name = excluded.name, password_hash = excluded.password_hash`,
    [user.email, user.name, passwordHash],
  );
}
console.log(
  `demo accounts ready (password "${DEMO_PASSWORD}"): ${DEMO_USERS.map(
    (user) => user.email,
  ).join(", ")}`,
);
await pool.end();
