import { boolean, doublePrecision, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bloodInventoryTable = pgTable("blood_inventory", {
  id: serial("id").primaryKey(),
  bloodType: text("blood_type").notNull().unique(),
  units: integer("units").notNull().default(0),
  minThreshold: integer("min_threshold").notNull().default(10),
  expiryDate: text("expiry_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBloodInventorySchema = createInsertSchema(bloodInventoryTable).omit({ id: true, updatedAt: true });
export type InsertBloodInventory = z.infer<typeof insertBloodInventorySchema>;
export type BloodInventory = typeof bloodInventoryTable.$inferSelect;

export const donorsTable = pgTable("donors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bloodType: text("blood_type").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  age: integer("age"),
  lastDonationDate: text("last_donation_date"),
  totalDonations: integer("total_donations").notNull().default(0),
  isEligible: boolean("is_eligible").notNull().default(true),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDonorSchema = createInsertSchema(donorsTable).omit({ id: true, createdAt: true, totalDonations: true });
export type InsertDonor = z.infer<typeof insertDonorSchema>;
export type Donor = typeof donorsTable.$inferSelect;

export const donationsTable = pgTable("donations", {
  id: serial("id").primaryKey(),
  donorId: integer("donor_id").notNull(),
  bloodType: text("blood_type").notNull(),
  units: integer("units").notNull().default(1),
  hospitalId: integer("hospital_id"),
  notes: text("notes"),
  donatedAt: timestamp("donated_at").notNull().defaultNow(),
});

export const insertDonationSchema = createInsertSchema(donationsTable).omit({ id: true, donatedAt: true });
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donationsTable.$inferSelect;

export const bloodRequestsTable = pgTable("blood_requests", {
  id: serial("id").primaryKey(),
  patientName: text("patient_name").notNull(),
  bloodType: text("blood_type").notNull(),
  units: integer("units").notNull(),
  urgency: text("urgency").notNull().default("normal"),
  status: text("status").notNull().default("pending"),
  hospitalId: integer("hospital_id"),
  notes: text("notes"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  fulfilledAt: timestamp("fulfilled_at"),
});

export const insertBloodRequestSchema = createInsertSchema(bloodRequestsTable).omit({ id: true, requestedAt: true, fulfilledAt: true });
export type InsertBloodRequest = z.infer<typeof insertBloodRequestSchema>;
export type BloodRequest = typeof bloodRequestsTable.$inferSelect;

export const hospitalsTable = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHospitalSchema = createInsertSchema(hospitalsTable).omit({ id: true, createdAt: true });
export type InsertHospital = z.infer<typeof insertHospitalSchema>;
export type Hospital = typeof hospitalsTable.$inferSelect;
