import { mealLabels, mealTypes, parseProvidedMeals, travelDateKeys } from "@/lib/provided-meals";

export function ProvidedMealsForm({
  action,
  endAt,
  legacyMealCount,
  reviewedAt,
  startAt,
  value
}: {
  action: (formData: FormData) => void | Promise<void>;
  endAt: Date;
  legacyMealCount: number;
  reviewedAt: Date | null;
  startAt: Date;
  value: string;
}) {
  const selected = new Set(parseProvidedMeals(value));
  const days = travelDateKeys(startAt, endAt);

  return <form action={action}>
    <p className="small">
      Bitte nur Mahlzeiten markieren, die vom Arbeitgeber, Hotel, Kunden oder Veranstalter bezahlt bzw. gestellt wurden.
      Selbst bezahlte Mahlzeiten gehören nicht hierher.
    </p>
    {!reviewedAt && selected.size === 0 && legacyMealCount > 0 && <div className="recognition-warnings">
      Für diese bestehende Reise waren bisher {legacyMealCount} gestellte Mahlzeit{legacyMealCount === 1 ? "" : "en"} als Anzahl hinterlegt. Bitte ordne sie jetzt den konkreten Reisetagen zu.
    </div>}
    <table>
      <thead><tr><th>Reisetag</th>{mealTypes.map(type => <th key={type}>{mealLabels[type]}</th>)}</tr></thead>
      <tbody>{days.map(day => <tr key={day}>
        <td>{new Date(`${day}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}</td>
        {mealTypes.map(type => {
          const entry = `${day}:${type}`;
          return <td key={type}><input aria-label={`${mealLabels[type]} am ${day}`} defaultChecked={selected.has(entry)} name="meals" style={{ width: "auto" }} type="checkbox" value={entry} /></td>;
        })}
      </tr>)}</tbody>
    </table>
    <div className="actions" style={{ marginTop: 12 }}>
      <button>Angaben prüfen und speichern</button>
      <span className="small">{reviewedAt ? `Zuletzt geprüft: ${reviewedAt.toLocaleString("de-DE")}` : "Noch nicht geprüft"}</span>
    </div>
  </form>;
}
