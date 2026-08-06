function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function dateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dateTimeLocalInputValue(date: Date) {
  return `${dateInputValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
