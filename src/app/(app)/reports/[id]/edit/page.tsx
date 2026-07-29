import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportSchema } from "@/lib/validation";
import { notFound, redirect } from "next/navigation";
import { withBasePath } from "@/lib/paths";

const editableStatuses = ["DRAFT", "RETURNED"] as const;

function dateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  ].join("T");
}

export default async function EditReport({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const report = await db.expenseReport.findUnique({ where: { id } });

  if (!report) notFound();
  if (
    report.employeeId !== user.id ||
    !editableStatuses.includes(report.status as (typeof editableStatuses)[number])
  ) {
    redirect(`/reports/${id}`);
  }

  async function update(formData: FormData) {
    "use server";
    const actor = await requireUser();
    const current = await db.expenseReport.findUniqueOrThrow({ where: { id } });

    if (
      current.employeeId !== actor.id ||
      !editableStatuses.includes(current.status as (typeof editableStatuses)[number])
    ) {
      throw new Error("Nicht erlaubt");
    }

    const values = reportSchema.parse(Object.fromEntries(formData));
    await db.expenseReport.update({
      where: { id },
      data: values
    });
    redirect(`/reports/${id}`);
  }

  return (
    <>
      <h1>Abrechnung bearbeiten</h1>
      <div className="sub">Reisedaten und Pauschalangaben anpassen</div>
      <div className="card" style={{ maxWidth: 850 }}>
        <form action={update}>
          <div>
            <label>Titel</label>
            <input name="title" defaultValue={report.title} required />
          </div>
          <div>
            <label>Reisezweck</label>
            <textarea name="purpose" defaultValue={report.purpose} required />
          </div>
          <div>
            <label>Zielort</label>
            <input name="destination" defaultValue={report.destination} required />
          </div>
          <div className="row">
            <div>
              <label>Beginn</label>
              <input
                name="startAt"
                type="datetime-local"
                defaultValue={dateTimeLocalValue(report.startAt)}
                required
              />
            </div>
            <div>
              <label>Ende</label>
              <input
                name="endAt"
                type="datetime-local"
                defaultValue={dateTimeLocalValue(report.endAt)}
                required
              />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Verkehrsmittel</label>
              <select name="transportType" defaultValue={report.transportType}>
                <option>Firmenwagen</option>
                <option>Privat-Pkw</option>
                <option>Bahn</option>
                <option>Flug</option>
                <option>Sonstiges</option>
              </select>
            </div>
            <div>
              <label>Privat gefahrene Kilometer</label>
              <input
                name="privateKilometers"
                type="number"
                min="0"
                step="1"
                defaultValue={report.privateKilometers}
              />
            </div>
          </div>
          <div className="row3">
            <div>
              <label>Frühstücke</label>
              <input
                name="breakfasts"
                type="number"
                min="0"
                defaultValue={report.breakfasts}
              />
            </div>
            <div>
              <label>Mittagessen</label>
              <input name="lunches" type="number" min="0" defaultValue={report.lunches} />
            </div>
            <div>
              <label>Abendessen</label>
              <input name="dinners" type="number" min="0" defaultValue={report.dinners} />
            </div>
          </div>
          <div className="actions">
            <button>Änderungen speichern</button>
            <a className="button secondary" href={withBasePath(`/reports/${id}`)}>
              Abbrechen
            </a>
          </div>
        </form>
      </div>
    </>
  );
}
