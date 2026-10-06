import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generalReceiptSchema, reportSchema } from "@/lib/validation";
import { redirect } from "next/navigation";
import { getPerDiemRates } from "@/lib/settings";
import { resolvePerDiemRate } from "@/lib/per-diem";
import { nextProcessNumber } from "@/lib/process-number";
import { ReportFields } from "../report-fields";

export default async function NewReport({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;

  async function create(fd: FormData) {
    "use server";
    const user = await requireUser();
    const p = reportSchema.parse(Object.fromEntries(fd));
    const rate = resolvePerDiemRate(p.countryCode, p.destination, await getPerDiemRates());
    const report = await db.$transaction(async tx => {
      const processNumber = await nextProcessNumber(tx);
      return tx.expenseReport.create({ data: { employeeId: user.id, processNumber, ...p, kind: "TRAVEL", perDiemCode: rate.code, perDiemFullDay: rate.fullDay, perDiemPartialDay: rate.partialDay, perDiemOvernight: rate.overnight, status: "DRAFT" } });
    });
    redirect(`/reports/${report.id}`);
  }

  async function createGeneral(fd: FormData) {
    "use server";
    const user = await requireUser();
    const p = generalReceiptSchema.parse(Object.fromEntries(fd));
    const now = new Date();
    const report = await db.$transaction(async tx => {
      const processNumber = await nextProcessNumber(tx);
      return tx.expenseReport.create({ data: { employeeId: user.id, processNumber, kind: "GENERAL", title: p.title, purpose: p.purpose, destination: "-", transportType: "-", accommodationMode: "PROVIDED", startAt: now, endAt: now, mealsReviewedAt: now, status: "DRAFT" } });
    });
    redirect(`/reports/${report.id}`);
  }

  if (kind === "general") {
    return <><h1>Neuer allgemeiner Beleg</h1><div className="sub">Schritt 1 von 2: Bezeichnung erfassen</div><div className="card form-card"><form action={createGeneral}>
      <div><label>Titel</label><input name="title" placeholder="z. B. Tankquittung Firmenwagen" required /></div>
      <div><label>Verwendungszweck</label><textarea name="purpose" placeholder="z. B. Tanken auf dem Arbeitsweg mit dem Firmenwagen" required /></div>
      <div className="actions"><button>Speichern und Beleg hinzufügen</button><Link className="button secondary" href="/reports/new">Zurück</Link></div>
    </form></div></>;
  }

  if (kind === "travel") {
    return <><h1>Neue Reisekostenabrechnung</h1><div className="sub">Schritt 1 von 2: Reisedaten erfassen</div><div className="card form-card"><form action={create}>
      <ReportFields />
      <div className="actions"><button>Speichern und Belege hinzufügen</button><Link className="button secondary" href="/reports/new">Zurück</Link></div>
    </form></div></>;
  }

  return <><h1>Neue Abrechnung</h1><div className="sub">Was möchtest du abrechnen?</div>
    <div className="grid choice-grid">
      <Link className="card choice-card" href="/reports/new?kind=general">
        <div className="choice-icon" aria-hidden>🧾</div>
        <h2>Allgemeiner Beleg</h2>
        <p className="small">Einzelne Quittung ohne Reise, z. B. Tankbeleg für den Arbeitsweg mit dem Firmenwagen. Keine Reisedaten, keine Pauschalen.</p>
      </Link>
      <Link className="card choice-card" href="/reports/new?kind=travel">
        <div className="choice-icon" aria-hidden>🧳</div>
        <h2>Reisekosten</h2>
        <p className="small">Komplette Reise mit Zeitraum, Ziel, Verpflegungs- und Übernachtungspauschalen, Kilometergeld und mehreren Belegen.</p>
      </Link>
    </div></>;
}
