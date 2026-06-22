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
  {
    // Casing matches the live row exactly — upserts onto the existing
    // university/department rather than creating a duplicate.
    name: "Imo state university",
    shortName: "ISU",
    state: "Imo",
    website: "https://isu.edu.ng",
    departments: [
      { name: "Psychology", code: "PSY", faculty: "Faculty of Social Sciences" },
    ],
  },
] as const;

// ─────────────────────────────────────────────
// Psychology pilot: second-semester courses only.
// Source of truth: official IMSU Psychology department handbook.
// One-time hardcoded catalogue — no admin UI, no import.
// ─────────────────────────────────────────────

const PILOT_SEMESTER = 2;

const PSYCHOLOGY_COURSES = [
  // 100 Level
  { code: "PSY102", title: "Determinants of Behaviour", level: 100 },
  { code: "PSY104", title: "Quantitative Method in Psychology", level: 100 },
  { code: "GST112", title: "Nigerian Peoples and Culture", level: 100 },
  { code: "PSY116", title: "History and Systems", level: 100 },
  { code: "PSY108", title: "Psychology of Ethnicity and Ethnic Groups", level: 100 },
  { code: "PSY106", title: "Basic Concepts in Psychology", level: 100 },
  { code: "ELS112", title: "Writing Skills in English Language", level: 100 },
  { code: "SCI104", title: "History and Philosophy of Science", level: 100 },
  { code: "ICT100", title: "Information and Communication Technology", level: 100 },
  { code: "CSD102", title: "Career Development", level: 100 },
  { code: "SGB112", title: "Readings in Igbo", level: 100 },
  // 200 Level
  { code: "PSY202", title: "Physiological Psychology", level: 200 },
  { code: "PSY204", title: "Introduction to Social Psychology", level: 200 },
  { code: "PSY206", title: "Developmental Psychology: Adulthood and Aging II", level: 200 },
  { code: "PSY208", title: "Positive Psychology", level: 200 },
  { code: "PSY210", title: "Consumer Psychology", level: 200 },
  { code: "PSY214", title: "Psychology of Crime and Delinquency", level: 200 },
  { code: "GST212", title: "Philosophy, Logic and Human Existence", level: 200 },
  { code: "SSC202", title: "Introduction to Computer and its Application", level: 200 },
  { code: "PSY212", title: "Introduction to Counselling Psychology", level: 200 },
  { code: "PSY216", title: "Sensory Processes", level: 200 },
  // 300 Level
  { code: "PSY302", title: "Psychology of Mental Challenges", level: 300 },
  { code: "PSY310", title: "Field Experience", level: 300 },
  { code: "PSY304", title: "Psychology of Substance Use and Disorder", level: 300 },
  { code: "PSY306", title: "Research Methods in Psychology", level: 300 },
  { code: "PSY308", title: "Environmental Psychology", level: 300 },
  { code: "SSC302", title: "Research Method I", level: 300 },
  { code: "PSY312", title: "Psychology of Rehabilitation", level: 300 },
  { code: "PSY314", title: "Psychology of Suicide and Prevention", level: 300 },
  { code: "ENT312", title: "Venture Creation", level: 300 },
  { code: "GST312", title: "Peace and Conflict Resolution", level: 300 },
  // 400 Level
  { code: "PSY402", title: "Advanced Psychobiological Study and Psychopharmacology", level: 400 },
  { code: "PSY404", title: "Advanced Clinical Psychology", level: 400 },
  { code: "PSY412", title: "Addiction Counselling", level: 400 },
  { code: "PSY406", title: "Research Project", level: 400 },
  { code: "PSY410", title: "Behaviour Modification", level: 400 },
  { code: "PSY414", title: "Advanced Counselling Psychology", level: 400 },
  { code: "PSY418", title: "Psychology of Vocational Behaviour", level: 400 },
  { code: "PSY420", title: "Psychology of Technology and Digital Behavior", level: 400 },
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

  // 1b. Psychology pilot: second-semester course catalogue
  const psychologyDept = await db.department.findFirstOrThrow({
    where: { name: "Psychology", university: { name: "Imo state university" } },
  });

  for (const course of PSYCHOLOGY_COURSES) {
    await db.course.upsert({
      where: { departmentId_code: { departmentId: psychologyDept.id, code: course.code } },
      update: { title: course.title, level: course.level, semester: PILOT_SEMESTER },
      create: {
        departmentId: psychologyDept.id,
        code: course.code,
        title: course.title,
        level: course.level,
        semester: PILOT_SEMESTER,
      },
    });
  }

  // Retire any previously-seeded course code that the official handbook no
  // longer lists — Course.code is the matching key now, so a stale code left
  // behind would silently keep matching old/wrong textbooks. Textbook.courseId
  // is an optional FK (default onDelete: SetNull), so any textbook still
  // linked to a retired course just loses that link — it is not deleted.
  const officialCodes = PSYCHOLOGY_COURSES.map((c) => c.code);
  const { count: retiredCount } = await db.course.deleteMany({
    where: {
      departmentId: psychologyDept.id,
      semester: PILOT_SEMESTER,
      code: { notIn: officialCodes },
    },
  });

  console.log(`  ✓  Psychology pilot — ${PSYCHOLOGY_COURSES.length} second-semester courses`);
  if (retiredCount > 0) {
    console.log(`  ✓  Retired ${retiredCount} course code(s) no longer in the official handbook`);
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
        emailVerifiedAt: new Date(),
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
        emailVerifiedAt: verifiedAt,
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
