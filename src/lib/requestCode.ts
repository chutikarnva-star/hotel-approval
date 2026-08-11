import { prisma } from "./prisma";

export async function nextRequestCode(): Promise<string> {
  const count = await prisma.request.count();
  let n = count + 1;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `REQ-${String(n).padStart(4, "0")}`;
    const exists = await prisma.request.findUnique({ where: { requestCode: code } });
    if (!exists) return code;
    n++;
  }

  return `REQ-${Date.now()}`;
}
