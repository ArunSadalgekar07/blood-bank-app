import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bloodRequestsTable, hospitalsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const requests = await db.select().from(bloodRequestsTable).orderBy(desc(bloodRequestsTable.requestedAt));
  const hospitals = await db.select().from(hospitalsTable);
  const hospitalMap = new Map(hospitals.map((h) => [h.id, h]));

  res.json(requests.map((r) => ({
    ...r,
    hospitalName: r.hospitalId ? (hospitalMap.get(r.hospitalId)?.name ?? null) : null,
    requestedAt: r.requestedAt.toISOString(),
    fulfilledAt: r.fulfilledAt?.toISOString() ?? null,
  })));
});

router.post("/", async (req, res) => {
  const { patientName, bloodType, units, urgency, hospitalId, notes } = req.body as {
    patientName: string;
    bloodType: string;
    units: number;
    urgency: string;
    hospitalId?: number;
    notes?: string;
  };

  const [request] = await db.insert(bloodRequestsTable).values({
    patientName,
    bloodType,
    units,
    urgency,
    status: "pending",
    hospitalId: hospitalId ?? null,
    notes: notes ?? null,
  }).returning();

  res.status(201).json({
    ...request,
    hospitalName: null,
    requestedAt: request.requestedAt.toISOString(),
    fulfilledAt: null,
  });
});

router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, notes } = req.body as { status?: string; notes?: string };

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;
  if (status === "fulfilled") updateData.fulfilledAt = new Date();

  const [updated] = await db
    .update(bloodRequestsTable)
    .set(updateData)
    .where(eq(bloodRequestsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ message: "Request not found" });
    return;
  }

  const hospitals = await db.select().from(hospitalsTable);
  const hospitalMap = new Map(hospitals.map((h) => [h.id, h]));

  res.json({
    ...updated,
    hospitalName: updated.hospitalId ? (hospitalMap.get(updated.hospitalId)?.name ?? null) : null,
    requestedAt: updated.requestedAt.toISOString(),
    fulfilledAt: updated.fulfilledAt?.toISOString() ?? null,
  });
});

export default router;
