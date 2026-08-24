import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfileSchema } from "@/lib/validation";
import { SignatureForm } from "./signature-form";

export const dynamic = "force-dynamic";

const feedbackUrl = (kind: "success" | "error", message: string) =>
  `/profile?${kind}=${encodeURIComponent(message)}`;

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function ProfilePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const feedback = await searchParams;

  async function updateProfile(formData: FormData) {
    "use server";
    const actor = await requireUser();
    const parsed = userProfileSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      redirect(feedbackUrl("error", "Bitte die Angaben prüfen, z. B. IBAN oder BIC."));
    }

    const values = parsed.data;
    await db.user.update({
      where: { id: actor.id },
      data: {
        employeeNumber: values.employeeNumber || null,
        department: values.department || null,
        phone: values.phone || null,
        dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth) : null,
        street: values.street || null,
        postalCode: values.postalCode || null,
        city: values.city || null,
        iban: values.iban || null,
        bic: values.bic || null,
        accountHolder: values.accountHolder || null
      }
    });
    revalidatePath("/profile");
    redirect(feedbackUrl("success", "Profil wurde gespeichert."));
  }

  return (
    <>
      <h1>Mein Profil</h1>
      <div className="sub">Persönliche Daten, Abteilung, Bankverbindung und Unterschrift für Reisekostenabrechnungen</div>

      {feedback.error && <div className="callout error-callout">{feedback.error}</div>}
      {feedback.success && <div className="callout success-callout">{feedback.success}</div>}

      <div className="card">
        <h2>Zugangsdaten</h2>
        <p className="small">Name, E-Mail und Rolle werden vom Administrator in der Benutzerverwaltung gepflegt.</p>
        <div className="row3">
          <div><label>Name</label><input disabled value={user.name} /></div>
          <div><label>E-Mail</label><input disabled value={user.email} /></div>
        </div>
      </div>

      <div className="card">
        <h2>Persönliche Daten</h2>
        <form action={updateProfile}>
          <div className="row3">
            <div>
              <label htmlFor="employeeNumber">Personalnummer</label>
              <input defaultValue={user.employeeNumber ?? ""} id="employeeNumber" maxLength={40} name="employeeNumber" />
            </div>
            <div>
              <label htmlFor="department">Abteilung</label>
              <input defaultValue={user.department ?? ""} id="department" maxLength={120} name="department" />
            </div>
            <div>
              <label htmlFor="phone">Telefonnummer</label>
              <input defaultValue={user.phone ?? ""} id="phone" maxLength={40} name="phone" />
            </div>
          </div>
          <div className="row3">
            <div>
              <label htmlFor="dateOfBirth">Geburtsdatum</label>
              <input defaultValue={toDateInputValue(user.dateOfBirth)} id="dateOfBirth" name="dateOfBirth" type="date" />
            </div>
            <div>
              <label htmlFor="street">Straße und Hausnummer</label>
              <input defaultValue={user.street ?? ""} id="street" maxLength={160} name="street" />
            </div>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 2fr" }}>
              <div>
                <label htmlFor="postalCode">PLZ</label>
                <input defaultValue={user.postalCode ?? ""} id="postalCode" maxLength={20} name="postalCode" />
              </div>
              <div>
                <label htmlFor="city">Ort</label>
                <input defaultValue={user.city ?? ""} id="city" maxLength={120} name="city" />
              </div>
            </div>
          </div>

          <h3>Bankverbindung für die Erstattung</h3>
          <div className="row3">
            <div>
              <label htmlFor="accountHolder">Kontoinhaber</label>
              <input defaultValue={user.accountHolder ?? ""} id="accountHolder" maxLength={120} name="accountHolder" placeholder={user.name} />
            </div>
            <div>
              <label htmlFor="iban">IBAN</label>
              <input defaultValue={user.iban ?? ""} id="iban" maxLength={34} name="iban" placeholder="DE00 0000 0000 0000 0000 00" />
            </div>
            <div>
              <label htmlFor="bic">BIC</label>
              <input defaultValue={user.bic ?? ""} id="bic" maxLength={11} name="bic" placeholder="XXXXXXXX" />
            </div>
          </div>

          <div className="actions"><button>Angaben speichern</button></div>
        </form>
      </div>

      <div className="card">
        <h2>Unterschrift</h2>
        <p className="small">Wird auf den PDF-Reisekostenabrechnungen als Bestätigung der Angaben hinterlegt.</p>
        <SignatureForm hasSignature={Boolean(user.signatureStoredFileName)} />
      </div>
    </>
  );
}
