import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportSchema } from "@/lib/validation";
import { notFound, redirect } from "next/navigation";
import { withBasePath } from "@/lib/paths";
import { getPerDiemRates } from "@/lib/settings";
import { resolvePerDiemRate } from "@/lib/per-diem";
import { canEmployeeEditReport } from "@/lib/report-editing";
import { ReportFields } from "../../report-fields";

export default async function EditReport({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const report = await db.expenseReport.findUnique({ where: { id } });

  if (!report) notFound();
  if (!canEmployeeEditReport(user.id, report.employeeId, report.status)) {
    redirect(`/reports/${id}`);
  }

  async function update(formData: FormData) {
    "use server";
    const actor = await requireUser();
    const current = await db.expenseReport.findUniqueOrThrow({ where: { id } });

    if (!canEmployeeEditReport(actor.id, current.employeeId, current.status)) {
      throw new Error("Nicht erlaubt");
    }

    const values = reportSchema.parse(Object.fromEntries(formData));
    const rate = resolvePerDiemRate(
      values.countryCode,
      values.destination,
      await getPerDiemRates()
    );
    if (
      values.accommodationMode === "PER_DIEM" &&
      (await db.expenseItem.count({ where: { reportId: id, category: "Hotel" } })) > 0
    ) {
      throw new Error(
        "Für die Übernachtungspauschale müssen vorhandene Hotelbelege zuerst entfernt werden."
      );
    }
    await db.expenseReport.update({
      where: { id },
      data: {
        ...values,
        perDiemCode: rate.code,
        perDiemFullDay: rate.fullDay,
        perDiemPartialDay: rate.partialDay,
        perDiemOvernight: rate.overnight,
        breakfasts: current.startAt.getTime() === values.startAt.getTime() && current.endAt.getTime() === values.endAt.getTime() ? current.breakfasts : 0,
        lunches: current.startAt.getTime() === values.startAt.getTime() && current.endAt.getTime() === values.endAt.getTime() ? current.lunches : 0,
        dinners: current.startAt.getTime() === values.startAt.getTime() && current.endAt.getTime() === values.endAt.getTime() ? current.dinners : 0,
        providedMealsJson: current.startAt.getTime() === values.startAt.getTime() && current.endAt.getTime() === values.endAt.getTime() ? current.providedMealsJson : "[]",
        mealsReviewedAt: current.startAt.getTime() === values.startAt.getTime() && current.endAt.getTime() === values.endAt.getTime() ? current.mealsReviewedAt : null
      }
    });
    redirect(`/reports/${id}`);
  }

  return (
    <>
      <h1>Abrechnung bearbeiten</h1>
      <div className="sub">Reisedaten und Pauschalangaben anpassen</div>
      <div className="card" style={{ maxWidth: 850 }}>
        <form action={update}>
          <ReportFields defaults={report}/>
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
