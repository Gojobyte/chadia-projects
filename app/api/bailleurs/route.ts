import { prisma } from "@/lib/prisma";
import { success } from "@/lib/utils/api-response";

export async function GET() {
  const bailleurs = await prisma.bailleur.findMany({ orderBy: { sigle: "asc" } });
  return success({ bailleurs });
}
