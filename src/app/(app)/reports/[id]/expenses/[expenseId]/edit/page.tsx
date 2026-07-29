import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeStoredFiles, storeUpload } from "@/lib/storage";
import { expenseSchema } from "@/lib/validation";
import { notFound, redirect } from "next/navigation";
import { withBasePath } from "@/lib/paths";

const editableStatuses = ["DRAFT", "RETURNED"] as const;

function dateValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default async function EditExpense({
  params
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const user = await requireUser();
  const { id, expenseId } = await params;
  const expense = await db.expenseItem.findUnique({
    where: { id: expenseId },
    include: { report: true }
  });

  if (!expense || expense.reportId !== id) notFound();
  if (
    expense.report.employeeId !== user.id ||
    !editableStatuses.includes(expense.report.status as (typeof editableStatuses)[number])
  ) {
    redirect(`/reports/${id}`);
  }

  async function update(formData: FormData) {
    "use server";
    const actor = await requireUser();
    const current = await db.expenseItem.findUniqueOrThrow({
      where: { id: expenseId },
      include: { report: true }
    });

    if (
      current.reportId !== id ||
      current.report.employeeId !== actor.id ||
      !editableStatuses.includes(current.report.status as (typeof editableStatuses)[number])
    ) {
      throw new Error("Nicht erlaubt");
    }

    const values = expenseSchema.parse(Object.fromEntries(formData));
    const file = formData.get("file") as File;
    const upload = file?.size ? await storeUpload(file) : {};

    await db.expenseItem.update({
      where: { id: expenseId },
      data: { ...values, ...upload }
    });

    if (file?.size && current.storedFileName) {
      await removeStoredFiles([current.storedFileName]);
    }
    redirect(`/reports/${id}`);
  }

  return (
    <>
      <h1>Ausgabe bearbeiten</h1>
      <div className="sub">Betrag, Zahlungsart und Beleg anpassen</div>
      <div className="card" style={{ maxWidth: 850 }}>
        <form action={update}>
          <div className="row">
            <div>
              <label>Datum</label>
              <input
                name="expenseDate"
                type="date"
                defaultValue={dateValue(expense.expenseDate)}
                required
              />
            </div>
            <div>
              <label>Kategorie</label>
              <select name="category" defaultValue={expense.category}>
                <option>Hotel</option>
                <option>Bewirtung</option>
                <option>Parken</option>
                <option>Taxi</option>
                <option>Bahn</option>
                <option>Flug</option>
                <option>Tanken</option>
                <option>Sonstiges</option>
              </select>
            </div>
          </div>
          <div>
            <label>Beschreibung</label>
            <input name="description" defaultValue={expense.description} required />
          </div>
          <div className="row">
            <div>
              <label>Betrag</label>
              <input
                name="amount"
                type="number"
                step=".01"
                defaultValue={expense.amount.toString()}
                required
              />
            </div>
            <div>
              <label>enthaltene MwSt.</label>
              <input
                name="vatAmount"
                type="number"
                step=".01"
                defaultValue={expense.vatAmount.toString()}
              />
            </div>
          </div>
          <div>
            <label>Zahlungsart</label>
            <select name="paymentType" defaultValue={expense.paymentType}>
              <option value="PRIVATE">Privat ausgelegt</option>
              <option value="COMPANY_CARD">Firmenkarte</option>
              <option value="CASH">Bar</option>
            </select>
          </div>
          <div>
            <label>Beleg ersetzen</label>
            {expense.originalFileName && (
              <p className="small">Aktueller Beleg: {expense.originalFileName}</p>
            )}
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
            />
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
