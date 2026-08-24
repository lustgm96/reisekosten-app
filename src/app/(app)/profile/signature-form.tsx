"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { withBasePath } from "@/lib/paths";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";

type SignatureFormProps = {
  hasSignature: boolean;
};

export function SignatureForm({ hasSignature }: SignatureFormProps) {
  const router = useRouter();
  const signatureRef = useRef<SignaturePadHandle>(null);
  const [editing, setEditing] = useState(!hasSignature);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setError("");
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError("Bitte mit der Maus, dem Finger oder dem Stift unterschreiben.");
      return;
    }
    const signatureBlob = await signatureRef.current.toBlob();
    if (!signatureBlob) {
      setError("Die Unterschrift konnte nicht erfasst werden.");
      return;
    }
    const formData = new FormData();
    formData.set("signature", signatureBlob, "unterschrift.png");
    setSaving(true);
    try {
      const response = await fetch(withBasePath("/api/profile/signature"), { method: "POST", body: formData });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Die Unterschrift konnte nicht gespeichert werden.");
      setEditing(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Die Unterschrift konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setError("");
    setSaving(true);
    try {
      const response = await fetch(withBasePath("/api/profile/signature"), { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Die Unterschrift konnte nicht entfernt werden.");
      setEditing(true);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Die Unterschrift konnte nicht entfernt werden.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Hinterlegte Unterschrift"
          src={withBasePath(`/api/profile/signature?t=${Date.now()}`)}
          style={{ background: "#fff", border: "1px solid #c9d1d9", borderRadius: 6, maxWidth: 420, width: "100%" }}
        />
        {error && <div className="error">{error}</div>}
        <div className="actions">
          <button className="secondary compact" disabled={saving} onClick={() => setEditing(true)} type="button">Neu unterschreiben</button>
          <button className="secondary compact" disabled={saving} onClick={remove} type="button">Unterschrift entfernen</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SignaturePad ref={signatureRef} />
      <div className="actions">
        <button className="secondary compact" disabled={saving} onClick={() => signatureRef.current?.clear()} type="button">Löschen</button>
        <button disabled={saving} onClick={save} type="button">{saving ? "Wird gespeichert …" : "Unterschrift speichern"}</button>
        {hasSignature && (
          <button className="secondary compact" disabled={saving} onClick={() => setEditing(false)} type="button">Abbrechen</button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
