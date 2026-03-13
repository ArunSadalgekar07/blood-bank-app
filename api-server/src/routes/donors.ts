import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  donorsTable,
  donationsTable,
  bloodInventoryTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDonor(d: typeof donorsTable.$inferSelect, distanceKm?: number) {
  return {
    ...d,
    createdAt: d.createdAt.toISOString(),
    lastDonationDate: d.lastDonationDate ?? null,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    address: d.address ?? null,
    distanceKm: distanceKm ?? null,
  };
}

router.get("/", async (_req, res) => {
  const donors = await db.select().from(donorsTable).orderBy(desc(donorsTable.createdAt));
  res.json(donors.map((d) => formatDonor(d)));
});

router.get("/nearby", async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);
  const radiusKm = parseFloat((req.query.radius as string) ?? "50");
  const bloodType = req.query.bloodType as string | undefined;

  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({ message: "lat and lon query params are required" });
    return;
  }

  const donors = await db.select().from(donorsTable);
  const nearby = donors
    .filter((d) => d.latitude != null && d.longitude != null)
    .map((d) => ({
      ...d,
      distanceKm: haversineKm(lat, lon, d.latitude!, d.longitude!),
    }))
    .filter((d) => d.distanceKm <= radiusKm)
    .filter((d) => (!bloodType || d.bloodType === bloodType))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json(nearby.map((d) => formatDonor(d, d.distanceKm)));
});

router.post("/", async (req, res) => {
  const { name, bloodType, phone, email, age, latitude, longitude, address } = req.body as {
    name: string;
    bloodType: string;
    phone: string;
    email?: string;
    age?: number;
    latitude?: number;
    longitude?: number;
    address?: string;
  };

  const [donor] = await db.insert(donorsTable).values({
    name,
    bloodType,
    phone,
    email: email ?? null,
    age: age ?? null,
    isEligible: true,
    totalDonations: 0,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    address: address ?? null,
  }).returning();

  res.status(201).json(formatDonor(donor));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [donor] = await db.select().from(donorsTable).where(eq(donorsTable.id, id));
  if (!donor) {
    res.status(404).json({ message: "Donor not found" });
    return;
  }
  res.json(formatDonor(donor));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(donorsTable).where(eq(donorsTable.id, id));
  res.json({ message: "Donor deleted" });
});

router.post("/:id/donate", async (req, res) => {
  const donorId = parseInt(req.params.id);
  const { units, hospitalId, notes } = req.body as {
    units: number;
    hospitalId?: number;
    notes?: string;
  };

  const [donor] = await db.select().from(donorsTable).where(eq(donorsTable.id, donorId));
  if (!donor) {
    res.status(404).json({ message: "Donor not found" });
    return;
  }

  const [donation] = await db.insert(donationsTable).values({
    donorId,
    bloodType: donor.bloodType,
    units,
    hospitalId: hospitalId ?? null,
    notes: notes ?? null,
  }).returning();

  await db.update(donorsTable).set({
    totalDonations: donor.totalDonations + 1,
    lastDonationDate: new Date().toISOString().split("T")[0],
    isEligible: false,
  }).where(eq(donorsTable.id, donorId));

  const [inv] = await db.select().from(bloodInventoryTable).where(eq(bloodInventoryTable.bloodType, donor.bloodType));
  if (inv) {
    await db.update(bloodInventoryTable).set({
      units: inv.units + units,
      updatedAt: new Date(),
    }).where(eq(bloodInventoryTable.bloodType, donor.bloodType));
  }

  res.status(201).json({
    ...donation,
    donorName: donor.name,
    hospitalName: null,
    donatedAt: donation.donatedAt.toISOString(),
  });
});

export default router;
