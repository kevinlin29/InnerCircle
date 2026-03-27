import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const { rows: users } = await pool.query('SELECT id, name, email FROM "User"');
  console.log("Users:", users);

  if (users.length < 2) {
    console.log("Need at least 2 users to create friendships");
    await pool.end();
    return;
  }

  // Create ACCEPTED friendships between all user pairs
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const a = users[i];
      const b = users[j];
      const [requesterId, addresseeId] = [a.id, b.id].sort();

      await pool.query(
        `INSERT INTO "Friendship" (id, "requesterId", "addresseeId", status, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'ACCEPTED', NOW(), NOW())
         ON CONFLICT ("requesterId", "addresseeId") DO UPDATE SET status = 'ACCEPTED', "updatedAt" = NOW()`,
        [requesterId, addresseeId]
      );
      console.log(`  Friends: ${a.name} <-> ${b.name}`);
    }
  }

  console.log("Done! All users are now friends.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
