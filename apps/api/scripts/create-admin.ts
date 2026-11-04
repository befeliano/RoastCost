/**
 * First admin is created ONLY from the server CLI (spec §17) — never via app registration.
 *   pnpm --filter @roastcost/api create-admin -- --email burak@ornek.com
 * Password is read from the terminal (or ADMIN_PASSWORD env var for automation).
 */
import { createInterface } from 'node:readline/promises';
import { emailSchema, passwordSchema } from '@roastcost/shared';
import { SYSTEM, createDb, withCtx } from '../src/db';
import { hashPassword } from '../src/lib/crypto';

try {
  process.loadEnvFile?.();
} catch {
  /* no .env */
}

const args = process.argv.slice(2);
const email = emailSchema.parse(args[args.indexOf('--email') + 1] ?? '');
let password = process.env.ADMIN_PASSWORD;
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question('Parola (en az 10 karakter): ');
  rl.close();
}
const pw = passwordSchema.parse(password);
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const db = createDb({ connectionString: url, max: 1 });
const hash = await hashPassword(pw);
const id = await withCtx(db, SYSTEM, async (tx) => {
  const existing = await tx
    .selectFrom('users')
    .select('id')
    .where('email', '=', email)
    .executeTakeFirst();
  if (existing) {
    await tx
      .updateTable('users')
      .set({ role: 'admin', password_hash: hash, email_verified_at: new Date(), deleted_at: null })
      .where('id', '=', existing.id)
      .execute();
    return existing.id;
  }
  const u = await tx
    .insertInto('users')
    .values({ email, password_hash: hash, role: 'admin', email_verified_at: new Date() })
    .returning('id')
    .executeTakeFirstOrThrow();
  return u.id;
});
await db.destroy();
console.log(`admin ready: ${email} (${id})`);
