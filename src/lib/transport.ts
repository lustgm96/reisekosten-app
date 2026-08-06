export const transportOptions = ["Firmenwagen", "Privat-Pkw", "Bahn", "Flug", "Mietwagen", "Taxi", "ÖPNV", "Sonstiges"] as const;
export type TransportOption = (typeof transportOptions)[number];
export type TransportSelection = { types: TransportOption[]; notes: string };

const legacyTransportOptions: Record<string, TransportOption> = {
  "Privater Pkw": "Privat-Pkw",
  "Privat-PKW": "Privat-Pkw"
};

export function parseTransportSelection(value: string): TransportSelection {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      const candidate = parsed as { types?: unknown; notes?: unknown };
      const types = Array.isArray(candidate.types)
        ? candidate.types.filter((type): type is TransportOption => typeof type === "string" && transportOptions.includes(type as TransportOption))
        : [];
      return { types: [...new Set(types)], notes: typeof candidate.notes === "string" ? candidate.notes : "" };
    }
  } catch {
    // Bestehende Reisen enthalten ein einzelnes Verkehrsmittel als Klartext.
  }
  const legacy = legacyTransportOptions[value] ?? (transportOptions.includes(value as TransportOption) ? value as TransportOption : "Sonstiges");
  return { types: [legacy], notes: legacy === "Sonstiges" && value !== "Sonstiges" ? value : "" };
}

export function serializeTransportSelection(selection: TransportSelection) {
  return JSON.stringify({ types: selection.types, notes: selection.notes.trim() });
}

export function isValidTransportSelection(value: string) {
  const selection = parseTransportSelection(value);
  return selection.types.length > 0 && selection.notes.length <= 500;
}

export function formatTransportSelection(value: string) {
  const selection = parseTransportSelection(value);
  const types = selection.types.join(", ");
  return selection.notes ? `${types} – ${selection.notes}` : types;
}
