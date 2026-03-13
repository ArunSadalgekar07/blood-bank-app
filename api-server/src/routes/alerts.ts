import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bloodInventoryTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const inventory = await db.select().from(bloodInventoryTable);
  const alerts = inventory
    .filter((i) => i.units <= i.minThreshold)
    .map((i) => ({
      bloodType: i.bloodType,
      currentUnits: i.units,
      minThreshold: i.minThreshold,
      severity: i.units === 0 ? "critical" : i.units <= Math.floor(i.minThreshold / 2) ? "high" : "medium",
    }))
    .sort((a, b) => a.currentUnits - b.currentUnits);

  res.json(alerts);
});

export default router;
