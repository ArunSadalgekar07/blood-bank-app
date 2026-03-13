import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  bloodInventoryTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

async function ensureInventoryExists() {
  const existing = await db.select().from(bloodInventoryTable);
  if (existing.length === 0) {
    const seeded = BLOOD_TYPES.map((bt) => ({
      bloodType: bt,
      units: Math.floor(Math.random() * 50) + 5,
      minThreshold: 10,
    }));
    await db.insert(bloodInventoryTable).values(seeded);
  }
}

router.get("/", async (_req, res) => {
  await ensureInventoryExists();
  const inventory = await db.select().from(bloodInventoryTable).orderBy(bloodInventoryTable.bloodType);
  res.json(inventory.map((i) => ({
    ...i,
    updatedAt: i.updatedAt.toISOString(),
    expiryDate: i.expiryDate ?? null,
  })));
});

router.get("/:bloodType", async (req, res) => {
  await ensureInventoryExists();
  const bloodType = decodeURIComponent(req.params.bloodType);
  const [item] = await db.select().from(bloodInventoryTable).where(eq(bloodInventoryTable.bloodType, bloodType));
  if (!item) {
    res.status(404).json({ message: "Blood type not found" });
    return;
  }
  res.json({ ...item, updatedAt: item.updatedAt.toISOString() });
});

router.patch("/:bloodType", async (req, res) => {
  const bloodType = decodeURIComponent(req.params.bloodType);
  const { units, minThreshold } = req.body as { units: number; minThreshold?: number };

  const updateData: Record<string, unknown> = {
    units,
    updatedAt: new Date(),
  };
  if (minThreshold !== undefined) updateData.minThreshold = minThreshold;

  const [updated] = await db
    .update(bloodInventoryTable)
    .set(updateData)
    .where(eq(bloodInventoryTable.bloodType, bloodType))
    .returning();

  if (!updated) {
    res.status(404).json({ message: "Blood type not found" });
    return;
  }
  res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
});

router.get("/alerts/low", async (_req, res) => {
  await ensureInventoryExists();
  const inventory = await db.select().from(bloodInventoryTable);
  const alerts = inventory
    .filter((i) => i.units <= i.minThreshold)
    .map((i) => ({
      bloodType: i.bloodType,
      currentUnits: i.units,
      minThreshold: i.minThreshold,
      severity: i.units === 0 ? "critical" : i.units <= Math.floor(i.minThreshold / 2) ? "high" : "medium",
    }));
  res.json(alerts);
});

export default router;
