"use client";

type ConfirmDeleteButtonProps = {
  label?: string;
  message?: string;
};

export function ConfirmDeleteButton({
  label = "Löschen",
  message = "Abrechnung einschließlich aller Ausgaben und Kommentare löschen?"
}: ConfirmDeleteButtonProps) {
  return (
    <button
      className="danger"
      onClick={event => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {label}
    </button>
  );
}
