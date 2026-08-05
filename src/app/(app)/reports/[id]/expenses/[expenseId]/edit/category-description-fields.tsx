"use client";

import { useState } from "react";

const categories = ["Hotel", "Bewirtung", "Parken", "Taxi", "Bahn", "Flug", "Tanken", "Sonstiges"];

export function CategoryDescriptionFields({
  defaultCategory,
  defaultDescription
}: {
  defaultCategory: string;
  defaultDescription: string;
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
  </>;
}
