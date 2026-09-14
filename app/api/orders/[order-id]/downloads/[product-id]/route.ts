import { createSecureDownload, getDeliveryProvider } from "@/lib/delivery/service";
import { getOrderRepository } from "@/lib/orders/repository";
import { getCustomerSession } from "@/lib/customer/session";

export async function GET(_request: Request, { params }: { params: Promise<{ "order-id": string; "product-id": string }> }): Promise<Response> {
  const { "order-id": orderId, "product-id": productId } = await params;
  if (!orderId || !productId) return Response.json({ error: "An order ID and product ID are required." }, { status: 400 });
  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "Authentication is required to access downloads." }, { status: 401 });

  const repository = getOrderRepository();
  if (!repository) return Response.json({ error: "Order storage is not configured yet." }, { status: 503 });
  const order = await repository.findById(orderId);
  if (!order || order.status !== "paid") return Response.json({ error: "Verified paid order not found." }, { status: 404 });
  if (!order.customerId || order.customerId !== session.customer.id) return Response.json({ error: "You are not authorized to access this order." }, { status: 403 });
  const entitlement = order.entitlements.find((candidate) => candidate.productId === productId);
  if (!entitlement) return Response.json({ error: "This order does not include that product." }, { status: 403 });
  const provider = getDeliveryProvider();
  if (!provider) return Response.json({ error: "Secure digital delivery is not configured yet." }, { status: 503 });
  try {
    const download = await createSecureDownload({ id: `${orderId}:${productId}`, orderId, productId, customerId: order.customerId, grantedAt: order.createdAt, fulfillmentVersion: entitlement.fulfillmentVersion }, provider);
    if (!download) return Response.json({ error: "Secure digital delivery is not configured yet." }, { status: 503 });
    await repository.updateFulfillmentStatus(orderId, "fulfilled");
    return Response.json(download);
  } catch {
    await repository.updateFulfillmentStatus(orderId, "failed");
    return Response.json({ error: "Secure digital delivery could not be prepared." }, { status: 503 });
  }
}
