"use client";

type ConfirmActionButtonProps = {
  label: string;
  message: string;
};

export function ConfirmActionButton({ label, message }: ConfirmActionButtonProps) {
  return (
    <button
      onClick={event => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      type="submit"
    >
      {label}
    </button>
  );
}
