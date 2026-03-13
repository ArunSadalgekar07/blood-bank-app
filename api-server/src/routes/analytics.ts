import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  donorsTable,
  donationsTable,
  bloodRequestsTable,
  bloodInventoryTable,
} from "@workspace/db/schema";
import { count, sum, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/summary", async (_req, res) => {
  const [donorCount] = await db.select({ count: count() }).from(donorsTable);
  const [donationCount] = await db.select({ count: count() }).from(donationsTable);
  const inventory = await db.select().from(bloodInventoryTable);
  const requests = await db.select().from(bloodRequestsTable);

  const totalUnitsAvailable = inventory.reduce((sum, i) => sum + i.units, 0);
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const criticalAlerts = inventory.filter((i) => i.units <= Math.floor(i.minThreshold / 2)).length;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyDonations = await db.select({ count: count() })
    .from(donationsTable)
    .where(sql`${donationsTable.donatedAt} >= ${startOfMonth}`);

  res.json({
    totalDonors: donorCount.count,
    totalDonations: donationCount.count,
    totalUnitsAvailable,
    totalRequests: requests.length,
    pendingRequests,
    criticalAlerts,
    monthlyDonations: monthlyDonations[0].count,
  });
});

router.get("/trends", async (_req, res) => {
  const donations = await db.select().from(donationsTable).orderBy(donationsTable.donatedAt);

  const trendMap = new Map<string, { donations: number; units: number }>();

  for (const d of donations) {
    const date = new Date(d.donatedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = date.toLocaleString("default", { month: "short", year: "2-digit" });
    const existing = trendMap.get(key) ?? { donations: 0, units: 0 };
    trendMap.set(key, {
      donations: existing.donations + 1,
      units: existing.units + d.units,
    });
  }

  const trends = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, value]) => {
      const [year, month] = key.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return {
        month: date.toLocaleString("default", { month: "short", year: "2-digit" }),
        ...value,
      };
    });

  res.json(trends);
});

export default router;
