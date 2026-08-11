import { prisma } from "./prisma";
import type { AuthUser } from "./auth";

export async function getCurrentEmployee(auth: AuthUser) {
  return prisma.employee.findFirst({
    where: { OR: [{ email: auth.email }, { firebaseUid: auth.id }] },
    include: { storeCenterBranch: true },
  });
}
