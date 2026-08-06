"use client";

import { useState } from "react";
import { parseTransportSelection, serializeTransportSelection, transportOptions, type TransportOption } from "@/lib/transport";
import "./transport-fields.css";

export function TransportFields({ defaultKilometers = 0, defaultValue = "Firmenwagen" }: { defaultKilometers?: number; defaultValue?: string }) {
  const initial = parseTransportSelection(defaultValue);
  const [types, setTypes] = useState<TransportOption[]>(initial.types);
  const [notes, setNotes] = useState(initial.notes);
  const usesPrivateCar = types.includes("Privat-Pkw");

  function toggle(type: TransportOption) {
    setTypes(current => current.includes(type) ? current.filter(value => value !== type) : [...current, type]);
  }

  return <>
    <div>
      <label>Genutzte Verkehrsmittel</label>
      <div className="transport-options">{transportOptions.map(type => <label className="transport-option" key={type}>
        <input checked={types.includes(type)} onChange={() => toggle(type)} style={{ width: "auto" }} type="checkbox"/><span>{type}</span>
      </label>)}</div>
      {!types.length && <div className="error">Bitte mindestens ein Verkehrsmittel auswählen.</div>}
      <input name="transportType" type="hidden" value={serializeTransportSelection({ types, notes })}/>
    </div>
    <div><label>Hinweise zu Verkehrsmitteln (optional)</label><textarea maxLength={500} onChange={event => setNotes(event.target.value)} placeholder="z. B. Firmenwagen zum Flughafen, Flug nach Dublin, dort Mietwagen" value={notes}/></div>
    {usesPrivateCar ? <div><label>Privat gefahrene Kilometer</label><input defaultValue={defaultKilometers} min="0" name="privateKilometers" step="1" type="number"/></div> : <input name="privateKilometers" type="hidden" value="0"/>}
  </>;
}
