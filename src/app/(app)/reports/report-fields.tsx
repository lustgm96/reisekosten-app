import { countryOptions } from "@/lib/per-diem";
import { dateTimeLocalInputValue } from "@/lib/date-input";
import { TransportFields } from "./transport-fields";

type ReportFieldDefaults = {
  accommodationMode: "ACTUAL" | "PER_DIEM" | "PROVIDED";
  countryCode: string;
  destination: string;
  endAt: Date;
  privateKilometers: number;
  purpose: string;
  startAt: Date;
  title: string;
  transportType: string;
};

export function ReportFields({ defaults }: { defaults?: ReportFieldDefaults }) {
  return <>
    <div><label>Titel</label><input name="title" defaultValue={defaults?.title} placeholder="z. B. Kundenbesuch Hamburg" required/></div>
    <div><label>Reisezweck</label><textarea name="purpose" defaultValue={defaults?.purpose} required/></div>
    <div className="row">
      <div><label>Reiseland</label><select name="countryCode" defaultValue={defaults?.countryCode ?? "DE"}>{countryOptions.map(country => <option key={country.code} value={country.code}>{country.label}</option>)}</select></div>
      <div><label>Zielort</label><input name="destination" defaultValue={defaults?.destination} placeholder="z. B. Dublin, Mumbai oder Madrid" required/></div>
    </div>
    <div><label>Übernachtung abrechnen</label><select name="accommodationMode" defaultValue={defaults?.accommodationMode ?? "ACTUAL"}>
      <option value="ACTUAL">Tatsächliche Hotelkosten laut Beleg</option>
      <option value="PER_DIEM">Übernachtungspauschale ohne Hotelbeleg</option>
      <option value="PROVIDED">Vom Arbeitgeber gestellt / keine Erstattung</option>
    </select></div>
    <div className="row">
      <div><label>Beginn</label><input name="startAt" type="datetime-local" defaultValue={defaults ? dateTimeLocalInputValue(defaults.startAt) : undefined} required/></div>
      <div><label>Ende</label><input name="endAt" type="datetime-local" defaultValue={defaults ? dateTimeLocalInputValue(defaults.endAt) : undefined} required/></div>
    </div>
    <TransportFields defaultKilometers={defaults?.privateKilometers} defaultValue={defaults?.transportType}/>
  </>;
}
