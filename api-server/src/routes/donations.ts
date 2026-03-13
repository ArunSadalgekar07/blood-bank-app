import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { donationsTable, donorsTable, hospitalsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const donations = await db.select().from(donationsTable).orderBy(desc(donationsTable.donatedAt));

  const donorIds = [...new Set(donations.map((d) => d.donorId))];
  const hospitalIds = [...new Set(donations.map((d) => d.hospitalId).filter(Boolean))] as number[];

  const donors = await db.select().from(donorsTable);
  const hospitals = hospitalIds.length > 0 ? await db.select().from(hospitalsTable) : [];

  const donorMap = new Map(donors.map((d) => [d.id, d]));
  const hospitalMap = new Map(hospitals.map((h) => [h.id, h]));

  res.json(donations.map((d) => ({
    ...d,
    donorName: donorMap.get(d.donorId)?.name ?? "Unknown",
    hospitalName: d.hospitalId ? (hospitalMap.get(d.hospitalId)?.name ?? null) : null,
    donatedAt: d.donatedAt.toISOString(),
  })));
});

export default router;
