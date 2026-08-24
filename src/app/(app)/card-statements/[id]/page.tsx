import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeStoredFiles } from "@/lib/storage";
import { withBasePath } from "@/lib/paths";
import { getCompletionError, isItemDocumented } from "@/lib/card-statement-workflow";
import { ConfirmDeleteButton } from "../../reports/[id]/confirm-delete-button";
import { StatementImportForm } from "./statement-import-form";
import { ItemReceiptUpload } from "./item-receipt-upload";
import { SelfDeclarationForm } from "./self-declaration-form";

export const dynamic = "force-dynamic";
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export default async function CardStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const statement = await db.cardStatement.findUnique({
    where: { id },
    include: { employee: true, items: { include: { selfDeclaration: true }, orderBy: { transactionDate: "asc" } } }
  });
  if (!statement) notFound();
  if (statement.employeeId !== user.id) redirect("/card-statements");

  const total = statement.items.reduce((sum, item) => sum + Number(item.amount), 0);
  const completionError = getCompletionError(statement.items);

  async function removeItem(formData: FormData) {
    "use server";
    const u = await requireUser();
    const itemId = String(formData.get("itemId"));
    const item = await db.cardStatementItem.findUniqueOrThrow({ where: { id: itemId }, include: { statement: true, selfDeclaration: true } });
    if (item.statement.employeeId !== u.id) throw new Error("Nicht erlaubt");
    await db.cardStatementItem.delete({ where: { id: itemId } });
    await removeStoredFiles([item.receiptStoredFileName, item.selfDeclaration?.signatureStoredFileName ?? null, item.selfDeclaration?.generatedPdfFileName ?? null]);
    revalidatePath(`/card-statements/${id}`);
  }

  async function markComplete() {
    "use server";
    const u = await requireUser();
    const current = await db.cardStatement.findUniqueOrThrow({ where: { id }, include: { items: { include: { selfDeclaration: true } } } });
    if (current.employeeId !== u.id) throw new Error("Nicht erlaubt");
    const error = getCompletionError(current.items);
    if (error) throw new Error(error);
    await db.cardStatement.update({ where: { id }, data: { isComplete: true } });
    revalidatePath(`/card-statements/${id}`);
  }

  async function reopen() {
    "use server";
    const u = await requireUser();
    const current = await db.cardStatement.findUniqueOrThrow({ where: { id } });
    if (current.employeeId !== u.id) throw new Error("Nicht erlaubt");
    await db.cardStatement.update({ where: { id }, data: { isComplete: false } });
    revalidatePath(`/card-statements/${id}`);
  }

  return (
    <>
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>{monthNames[statement.month - 1]} {statement.year}</h1>
          <div className="sub">{statement.employee.name} · {statement.isComplete ? "Vollständig" : "In Bearbeitung"}</div>
        </div>
        <div className="actions">
          {statement.items.length > 0 && <a className="button secondary" href={withBasePath(`/api/card-statements/${id}/pdf`)}>PDF</a>}
          {statement.isComplete
            ? <form action={reopen}><button className="secondary">Wieder öffnen</button></form>
            : <form action={markComplete}><button disabled={Boolean(completionError)}>Als vollständig markieren</button></form>}
        </div>
      </div>
      {!statement.isComplete && completionError && <p className="small">{completionError}</p>}

      <div className="card" style={{ maxWidth: 700 }}>
        <h2>Positionen aus Sammelabrechnung erfassen</h2>
        <StatementImportForm analyzeUrl={withBasePath("/api/card-statements/analyze")} importUrl={withBasePath(`/api/card-statements/${id}/import`)} />
      </div>

      <h2 style={{ marginTop: 22 }}>Positionen</h2>
      {statement.items.length === 0 && <p className="small">Noch keine Positionen erfasst.</p>}
      <table>
        <thead><tr><th>Datum</th><th>Kategorie</th><th>Beschreibung</th><th>Betrag</th><th>Beleg</th><th /></tr></thead>
        <tbody>
          {statement.items.map(item => {
            const documented = isItemDocumented(item);
            return (
              <tr key={item.id}>
                <td>{item.transactionDate.toLocaleDateString("de-DE")}</td>
                <td>{item.category}</td>
                <td>{item.description}</td>
                <td>{eur.format(Number(item.amount))}</td>
                <td>
                  {item.receiptType === "UPLOADED" ? (
                    item.receiptStoredFileName ? (
                      <a href={withBasePath(`/api/card-statement-items/${item.id}/receipt`)} rel="noreferrer" target="_blank">Beleg ansehen</a>
                    ) : (
                      <ItemReceiptUpload uploadUrl={withBasePath(`/api/card-statement-items/${item.id}/receipt`)} />
                    )
                  ) : item.selfDeclaration?.generatedPdfFileName ? (
                    <a href={withBasePath(`/api/card-statement-items/${item.id}/self-declaration-pdf`)} rel="noreferrer" target="_blank">Eigenbeleg ansehen</a>
                  ) : <span className="small">Eigenbeleg unvollständig</span>}
                  {!documented && item.receiptType === "UPLOADED" && (
                    <SelfDeclarationForm itemId={item.id} submitUrl={withBasePath(`/api/card-statement-items/${item.id}/self-declaration`)} />
                  )}
                </td>
                <td>
                  <form action={removeItem}>
                    <input name="itemId" type="hidden" value={item.id} />
                    <ConfirmDeleteButton label="Entfernen" message="Diese Position und zugehörige Belege löschen?" />
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
        {statement.items.length > 0 && (
          <tfoot><tr><th colSpan={3}>Summe</th><th>{eur.format(total)}</th><th /><th /></tr></tfoot>
        )}
      </table>
    </>
  );
}
