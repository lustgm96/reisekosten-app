"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

export function ItemReceiptUpload({ uploadUrl }: { uploadUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(uploadUrl, { method: "POST", body: formData });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Der Beleg konnte nicht hochgeladen werden.");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Der Beleg konnte nicht hochgeladen werden.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div>
      <input accept="image/jpeg,image/png,image/webp,application/pdf" disabled={uploading} onChange={handleChange} type="file" />
      {uploading && <span className="small">Wird hochgeladen …</span>}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
