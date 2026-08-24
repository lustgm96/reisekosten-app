"use client";

import { useState } from "react";

const categories = ["Hotel", "Bewirtung", "Parken", "Taxi", "Bahn", "Flug", "Tanken", "Sonstiges"];

export function CategoryDescriptionFields({
  defaultCategory,
  defaultDescription,
  defaultNotes = "",
  defaultBewirtungKunde = "",
  defaultBewirtungTeilnehmer = "",
  defaultBewirtungAnlass = ""
}: {
  defaultCategory: string;
  defaultDescription: string;
  defaultNotes?: string;
  defaultBewirtungKunde?: string;
  defaultBewirtungTeilnehmer?: string;
  defaultBewirtungAnlass?: string;
}) {
  const [category, setCategory] = useState(defaultCategory);

  return <>
    <div>
      <label>Kategorie</label>
      <select name="category" value={category} onChange={event => setCategory(event.target.value)}>
        {categories.map(option => <option key={option}>{option}</option>)}
      </select>
    </div>
    <div>
      <label>Beschreibung</label>
      <input
        defaultValue={defaultDescription}
        name="description"
        placeholder={category === "Sonstiges" ? "z. B. Visumgebühr für Geschäftsreise" : undefined}
        required
      />
      {category === "Sonstiges" && <div className="recognition-status">
        Bitte beschreibe die Ausgabe möglichst konkret und nenne ihren geschäftlichen Anlass. Das erleichtert die Zuordnung und Prüfung.
      </div>}
    </div>
    {category === "Bewirtung" && <div className="row">
      <div>
        <label>Bewirteter Kunde</label>
        <input defaultValue={defaultBewirtungKunde} name="bewirtungKunde" placeholder="z. B. Musterfirma GmbH" required />
      </div>
      <div>
        <label>Teilnehmende Personen</label>
        <input defaultValue={defaultBewirtungTeilnehmer} name="bewirtungTeilnehmer" placeholder="z. B. Max Mustermann, Erika Musterfrau" required />
      </div>
      <div>
        <label>Anlass der Bewirtung</label>
        <input defaultValue={defaultBewirtungAnlass} name="bewirtungAnlass" placeholder="z. B. Vertragsverhandlung" required />
      </div>
    </div>}
    <div>
      <label>Kommentar / Hinweis</label>
      <textarea defaultValue={defaultNotes} name="notes" placeholder="Optionale Anmerkung zu diesem Beleg" rows={2} />
    </div>
  </>;
}
