// Erzeugt aus prisma/schema.prisma (SQLite, lokal) das Postgres-Schema für Vercel.
// Die Modelle bleiben die einzige Quelle der Wahrheit in schema.prisma.
import fs from "node:fs";

const source = fs.readFileSync("prisma/schema.prisma", "utf8");
const target = source.replace(
  /datasource db \{[\s\S]*?\n\}/,
  `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}`
);

if (target === source) throw new Error("datasource-Block in prisma/schema.prisma nicht gefunden.");
fs.writeFileSync("prisma/schema.postgres.prisma", target);
console.log("prisma/schema.postgres.prisma erzeugt.");
