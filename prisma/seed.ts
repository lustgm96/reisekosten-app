import { PrismaClient, Role, ReportStatus, PaymentType } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("dev1234!", 12);

  const employee = await db.user.upsert({
    where: { email: "mitarbeiter@example.local" },
    update: {},
    create: { email: "mitarbeiter@example.local", passwordHash, name: "Max Mustermann", role: Role.EMPLOYEE }
  });

  await db.user.upsert({
    where: { email: "pruefer@example.local" },
    update: {},
    create: { email: "pruefer@example.local", passwordHash, name: "Vertriebsleitung", role: Role.APPROVER }
  });

  await db.user.upsert({
    where: { email: "admin@example.local" },
    update: {},
    create: { email: "admin@example.local", passwordHash, name: "Administration", role: Role.ADMIN }
  });

  const settings = {
    companyName: "Muster GmbH",
    mileageRate: "0.30",
    mealFullDay: "28.00",
    mealArrivalDeparture: "14.00",
    breakfastDeduction: "5.60",
    lunchDeduction: "11.20",
    dinnerDeduction: "11.20"
  };

  for (const [id, value] of Object.entries(settings)) {
    await db.appSetting.upsert({ where: { id }, update: { value }, create: { id, value } });
  }

  if (!(await db.expenseReport.findFirst({ where: { employeeId: employee.id } }))) {
    await db.expenseReport.create({
      data: {
        employeeId: employee.id,
        title: "Kundenbesuch Nord",
        purpose: "Kundentermine und Produktvorstellung",
        destination: "Hamburg",
        startAt: new Date("2026-07-06T06:30:00"),
        endAt: new Date("2026-07-08T18:00:00"),
        transportType: "Firmenwagen",
        breakfasts: 1,
        status: ReportStatus.SUBMITTED,
        submittedAt: new Date(),
        expenses: {
          create: [
            { expenseDate: new Date("2026-07-06"), category: "Hotel", description: "Übernachtung Hotel Hafen", amount: 149, vatAmount: 9.75, paymentType: PaymentType.COMPANY_CARD },
            { expenseDate: new Date("2026-07-07"), category: "Parken", description: "Parkhaus Innenstadt", amount: 18, vatAmount: 2.87, paymentType: PaymentType.PRIVATE }
          ]
        }
      }
    });
  }
}

main().finally(() => db.$disconnect());
