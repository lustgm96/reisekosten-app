import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export default async function CardStatementsPage() {
  const user = await requireUser();
  const statements = await db.cardStatement.findMany({
    where: { employeeId: user.id },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { _count: { select: { items: true } } }
  });

  const now = new Date();

  async function createStatement(formData: FormData) {
    "use server";
    const u = await requireUser();
    const year = Number(formData.get("year"));
    const month = Number(formData.get("month"));
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("Bitte Monat und Jahr auswählen.");
    }
    const statement = await db.cardStatement.upsert({
      where: { employeeId_year_month: { employeeId: u.id, year, month } },
      create: { employeeId: u.id, year, month },
      update: {}
    });
    redirect(`/card-statements/${statement.id}`);
  }

  return (
    <>
      <h1>Kreditkartenabrechnungen</h1>
      <div className="sub">Monatliche Firmenkarten-Umsätze erfassen und mit Belegen hinterlegen - unabhängig von Reisekostenabrechnungen.</div>

      <div className="card" style={{ maxWidth: 420 }}>
        <h2>Neue Abrechnung anlegen</h2>
        <form action={createStatement}>
          <div className="row">
            <div>
              <label>Monat</label>
              <select defaultValue={now.getMonth() + 1} name="month">
                {monthNames.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
              </select>
            </div>
            <div>
              <label>Jahr</label>
              <input defaultValue={now.getFullYear()} max={now.getFullYear() + 1} min={2020} name="year" required type="number" />
            </div>
          </div>
          <button>Anlegen bzw. öffnen</button>
        </form>
      </div>

      <h2 style={{ marginTop: 22 }}>Meine Abrechnungen</h2>
      {statements.length === 0 && <p className="small">Noch keine Kartenabrechnung erfasst.</p>}
      <table>
        <thead><tr><th>Monat</th><th>Positionen</th><th>Status</th><th /></tr></thead>
        <tbody>
          {statements.map(statement => (
            <tr key={statement.id}>
              <td>{monthNames[statement.month - 1]} {statement.year}</td>
              <td>{statement._count.items}</td>
              <td>{statement.isComplete ? "Vollständig" : "In Bearbeitung"}</td>
              <td><Link href={`/card-statements/${statement.id}`}>Öffnen</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
