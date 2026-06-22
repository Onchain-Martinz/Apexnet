import { cache } from "react";
import { db } from "@/lib/db";

export const getLecturerProfile = cache(async (userId: string) =>
  db.lecturerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      verified: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountName: true,
    },
  })
);
