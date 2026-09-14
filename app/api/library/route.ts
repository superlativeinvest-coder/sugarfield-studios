import { getCustomerSession } from "@/lib/customer/session";
import { getLibraryRepository } from "@/lib/library/repository";

export async function GET(): Promise<Response> {
  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "Authentication is required to view your library." }, { status: 401 });

  const repository = getLibraryRepository();
  if (!repository) return Response.json({ error: "Customer library storage is not configured yet." }, { status: 503 });
  return Response.json({ items: await repository.listForCustomer(session.customer.id) });
}
