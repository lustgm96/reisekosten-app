"use client";

export function ConfirmDeleteButton() {
  return (
    <button
      className="danger"
      onClick={event => {
        if (!window.confirm("Abrechnung einschließlich aller Ausgaben und Kommentare löschen?")) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      Löschen
    </button>
  );
}
