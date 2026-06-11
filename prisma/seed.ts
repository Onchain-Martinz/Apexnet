/**
 * Apex — Seed Strategy
 *
 * This file seeds REFERENCE DATA only — the stable lookup values the app
 * needs to function (universities, departments, and an initial admin user).
 *
 * Run:  npx prisma db seed
 * Docs: https://www.prisma.io/docs/guides/database/seed-database
 *
 * Rules:
 * - Idempotent: safe to run multiple times (upsert, not create)
 * - No user-generated content (textbooks, purchases, etc.)
 * - Passwords are hashed via bcryptjs before storage
 * - Real sensitive values (admin email) come from env vars
 */

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// ─────────────────────────────────────────────
// Reference data: Nigerian universities
// Extend this list as the platform grows.
// ─────────────────────────────────────────────

const UNIVERSITIES = [
  {
    name: "University of Lagos",
    shortName: "UNILAG",
    state: "Lagos",
    website: "https://unilag.edu.ng",
    departments: [
      { name: "Computer Science", code: "CSC", faculty: "Faculty of Science" },
      { name: "Electrical Engineering", code: "EEE", faculty: "Faculty of Engineering" },
      { name: "Medicine and Surgery", code: "MED", faculty: "College of Medicine" },
      { name: "Law", code: "LAW", faculty: "Faculty of Law" },
      { name: "Economics", code: "ECO", faculty: "Faculty of Social Sciences" },
    ],
  },
  {
    name: "Ahmadu Bello University",
    shortName: "ABU",
    state: "Kaduna",
    website: "https://abu.edu.ng",
    departments: [
      { name: "Computer Science", code: "CSC", faculty: "Faculty of Science" },
      { name: "Mechanical Engineering", code: "MEE", faculty: "Faculty of Engineering" },
      { name: "Agricultural Economics", code: "AEC", faculty: "Faculty of Agriculture" },
    ],
  },
  {
    name: "Obafemi Awolowo University",
    shortName: "OAU",
    state: "Osun",
    website: "https://oauife.edu.ng",
    departments: [
      { name: "Computer Science", code: "CSC", faculty: "Faculty of Science" },
      { name: "Civil Engineering", code: "CVE", faculty: "Faculty of Technology" },
      { name: "Accounting", code: "ACC", faculty: "Faculty of Administration" },
    ],
  },
  {
    name: "University of Nigeria",
    shortName: "UNN",
    state: "Enugu",
    website: "https://unn.edu.ng",
    departments: [
      { name: "Computer Science", code: "CSC", faculty: "Faculty of Physical Sciences" },
      { name: "Pharmacy", code: "PHM", faculty: "Faculty of Pharmaceutical Sciences" },
      { name: "Mass Communication", code: "MAC", faculty: "Faculty of Social Sciences" },
    ],
  },
] as const;

// ─────────────────────────────────────────────
// Seed runner
// ─────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding Apex database…\n");

  // 1. Universities + Departments
  for (const uni of UNIVERSITIES) {
    const university = await db.university.upsert({
      where: { name_country: { name: uni.name, country: "Nigeria" } },
      update: { shortName: uni.shortName, state: uni.state, website: uni.website },
      create: {
        name: uni.name,
        shortName: uni.shortName,
        state: uni.state,
        country: "Nigeria",
        website: uni.website,
        isActive: true,
      },
    });

    for (const dept of uni.departments) {
      await db.department.upsert({
        where: { universityId_name: { universityId: university.id, name: dept.name } },
        update: { code: dept.code, faculty: dept.faculty },
        create: {
          universityId: university.id,
          name: dept.name,
          code: dept.code,
          faculty: dept.faculty,
        },
      });
    }

    console.log(`  ✓  ${uni.shortName} — ${uni.departments.length} departments`);
  }

  // 2. Admin user
  // Store the admin email and password in environment variables.
  // Never hardcode credentials here.
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const admin = await db.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        name: "Apex Admin",
        role: Role.ADMIN,
        emailVerified: new Date(),
      },
    });

    // Store hashed password via the credentials Account record
    await db.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "credentials",
          providerAccountId: admin.id,
        },
      },
      update: { access_token: hashedPassword },
      create: {
        userId: admin.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: admin.id,
        access_token: hashedPassword,
      },
    });

    console.log(`\n  ✓  Admin user created: ${adminEmail}`);
  } else {
    console.log("\n  ⚠  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin user.");
  }

  // 3. Pilot lecturer (verified = true)
  // Used to onboard manually vetted lecturers during the pilot phase.
  // Set SEED_PILOT_LECTURER_EMAIL + SEED_PILOT_LECTURER_PASSWORD in .env.local.
  // Optional: SEED_PILOT_LECTURER_NAME (defaults to "Pilot Lecturer").
  const pilotEmail    = process.env.SEED_PILOT_LECTURER_EMAIL;
  const pilotPassword = process.env.SEED_PILOT_LECTURER_PASSWORD;
  const pilotName     = process.env.SEED_PILOT_LECTURER_NAME ?? "Pilot Lecturer";

  if (pilotEmail && pilotPassword) {
    const hashedPassword = await bcrypt.hash(pilotPassword, 12);
    const verifiedAt = new Date();

    const lecturer = await db.user.upsert({
      where: { email: pilotEmail },
      update: { name: pilotName },
      create: {
        email: pilotEmail,
        name: pilotName,
        role: Role.LECTURER,
        hashedPassword,
        emailVerified: verifiedAt,
        isActive: true,
      },
    });

    await db.lecturerProfile.upsert({
      where: { userId: lecturer.id },
      update: { verified: true, verifiedAt },
      create: { userId: lecturer.id, verified: true, verifiedAt },
    });

    console.log(`\n  ✓  Pilot lecturer created (verified): ${pilotEmail}`);
  } else {
    console.log("\n  ℹ  SEED_PILOT_LECTURER_EMAIL not set — skipping pilot lecturer.");
  }

  console.log("\n✅  Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
