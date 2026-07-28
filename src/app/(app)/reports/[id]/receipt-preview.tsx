"use client";

import { useEffect, useState } from "react";

type ReceiptPreviewProps = {
  fileName: string;
  mimeType: string | null;
  url: string;
};

export function ReceiptPreview({ fileName, mimeType, url }: ReceiptPreviewProps) {
  const [open, setOpen] = useState(false);
  const isImage = mimeType?.startsWith("image/") ?? false;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        aria-label={`Beleg ${fileName} ansehen`}
        className={`receipt-trigger ${isImage ? "receipt-thumbnail" : ""}`}
        onClick={() => setOpen(true)}
        type="button"
      >
        {isImage ? <img alt="" src={url} /> : <span>PDF</span>}
        <span>Vorschau</span>
      </button>
      {open && (
        <div
          aria-label={`Belegvorschau ${fileName}`}
          aria-modal="true"
          className="receipt-modal"
          role="dialog"
        >
          <div className="receipt-modal-card">
            <div className="receipt-modal-header">
              <div>
                <strong>{fileName}</strong>
                <div className="small">{mimeType || "Datei"}</div>
              </div>
              <div className="actions">
                <a className="button secondary" href={url} rel="noreferrer" target="_blank">
                  In neuem Tab öffnen
                </a>
                <button className="secondary" onClick={() => setOpen(false)} type="button">
                  Schließen
                </button>
              </div>
            </div>
            {isImage ? (
              <img className="receipt-image" src={url} alt={`Beleg ${fileName}`} />
            ) : (
              <iframe className="receipt-frame" src={url} title={`Beleg ${fileName}`} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
