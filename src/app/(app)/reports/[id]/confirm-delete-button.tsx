"use client";

type ConfirmDeleteButtonProps = {
  label?: string;
  message?: string;
  className?: string;
};

export function ConfirmDeleteButton({
  label = "Löschen",
  message = "Abrechnung einschließlich aller Ausgaben und Kommentare löschen?",
  className = "danger"
}: ConfirmDeleteButtonProps) {
  return (
    <button
      className={className}
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
