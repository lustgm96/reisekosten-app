"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";

type SelfDeclarationFormProps = {
  itemId: string;
  submitUrl: string;
};

export function SelfDeclarationForm({ itemId, submitUrl }: SelfDeclarationFormProps) {
  const router = useRouter();
  const signatureRef = useRef<SignaturePadHandle>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setError("");
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError("Bitte mit der Maus oder dem Finger unterschreiben.");
      return;
    }
    const signatureBlob = await signatureRef.current.toBlob();
    if (!signatureBlob) {
      setError("Die Unterschrift konnte nicht erfasst werden.");
      return;
    }
    formData.set("signature", signatureBlob, "unterschrift.png");
    setSaving(true);
    try {
      const response = await fetch(submitUrl, { method: "POST", body: formData });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Der Eigenbeleg konnte nicht gespeichert werden.");
      setOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Der Eigenbeleg konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return <button className="secondary compact" onClick={() => setOpen(true)} type="button">Eigenbeleg erstellen</button>;
  }

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <h3>Eigenbeleg (Position {itemId.slice(-6)})</h3>
      <p className="small">Eigenbeleg ersetzt keinen Originalbeleg, kein Vorsteuerabzug.</p>
      <form action={submit}>
        <div><label>Name und Adresse des Zahlungsempfängers</label><input maxLength={160} name="payeeName" placeholder="Name" required /></div>
        <div><input maxLength={300} name="payeeAddress" placeholder="Adresse" required /></div>
        <div><label>Gegenstand und geschäftlicher Zusammenhang</label><textarea maxLength={500} name="businessContext" required /></div>
        <div><label>Glaubhaftmachung (optional, z. B. Verweis auf Kontoauszug)</label><input maxLength={200} name="proofReference" /></div>
        <div><label>Ihr Name (Ersteller des Eigenbelegs)</label><input maxLength={120} name="declarantName" required /></div>
        <div>
          <label>Unterschrift</label>
          <SignaturePad ref={signatureRef} />
          <button className="secondary compact" onClick={() => signatureRef.current?.clear()} style={{ marginTop: 6 }} type="button">Unterschrift löschen</button>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="actions">
          <button disabled={saving}>{saving ? "Wird gespeichert …" : "Eigenbeleg speichern"}</button>
          <button className="secondary" disabled={saving} onClick={() => setOpen(false)} type="button">Abbrechen</button>
        </div>
      </form>
    </div>
  );
}
