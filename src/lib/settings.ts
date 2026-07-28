import { db } from "./db";

export async function getNumericSettings() {
  const rows = await db.appSetting.findMany();
  return Object.fromEntries(rows.map(row => [row.id, Number(row.value)]));
}

export async function getCompanyName() {
  return (await db.appSetting.findUnique({ where: { id: "companyName" } }))?.value || "Unternehmen";
}
