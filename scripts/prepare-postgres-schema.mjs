// Erzeugt aus prisma/schema.prisma (SQLite, lokal) das Postgres-Schema für Vercel.
// Die Modelle bleiben die einzige Quelle der Wahrheit in schema.prisma.
// Variablennamen hängen von der Vercel-/Neon-Integration ab, daher wird die erste gesetzte genommen.
import fs from "node:fs";

const pick = names => names.find(name => process.env[name]);
const urlVar = pick(["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"]);
const directVar = pick(["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"]);

if (!urlVar) {
  throw new Error("Keine Datenbank-URL gefunden. DATABASE_URL (oder POSTGRES_URL) in Vercel setzen / Neon mit dem Projekt verbinden.");
}
console.log(`Datenbank-URL aus ${urlVar}, direkte URL aus ${directVar ?? "(keine, nutze gepoolte URL)"}.`);

const source = fs.readFileSync("prisma/schema.prisma", "utf8");
const target = source.replace(
  /datasource db \{[\s\S]*?\n\}/,
  `datasource db {
  provider  = "postgresql"
  url       = env("${urlVar}")${directVar ? `\n  directUrl = env("${directVar}")` : ""}
}`
);

if (target === source) throw new Error("datasource-Block in prisma/schema.prisma nicht gefunden.");
fs.writeFileSync("prisma/schema.postgres.prisma", target);
console.log("prisma/schema.postgres.prisma erzeugt.");
