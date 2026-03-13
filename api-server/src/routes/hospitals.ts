import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { hospitalsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const hospitals = await db.select().from(hospitalsTable).orderBy(desc(hospitalsTable.createdAt));
  res.json(hospitals.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const { name, address, city, phone, email } = req.body as {
    name: string;
    address: string;
    city: string;
    phone: string;
    email?: string;
  };

  const [hospital] = await db.insert(hospitalsTable).values({
    name,
    address,
    city,
    phone,
    email: email ?? null,
    isActive: true,
  }).returning();

  res.status(201).json({ ...hospital, createdAt: hospital.createdAt.toISOString() });
});

export default router;
