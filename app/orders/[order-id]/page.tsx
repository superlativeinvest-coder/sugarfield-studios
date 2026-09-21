import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadButton } from "@/components/customer/DownloadButton";
import { getCustomerSession } from "@/lib/customer/session";
import { getOrderRepository } from "@/lib/orders/repository";
import { getProductName } from "@/lib/delivery/product-labels";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ "order-id": string }> }) {
  const { "order-id": orderId } = await params;
  const session = await getCustomerSession();
  const repository = getOrderRepository();
  const order = session && repository ? await repository.findById(orderId) : null;
  if (!session || !order || order.status !== "paid" || order.customerId !== session.customer.id) notFound();
  const entitlements = order.entitlements.filter((entitlement, index, all) => all.findIndex((candidate) => candidate.productId === entitlement.productId) === index);
  return <main><section className="site-section"><div className="site-container"><p className="eyebrow">Verified order</p><h1>Order {order.id}</h1><p className="section-intro">Payment is verified. Generate secure, time-limited links for each product in this order.</p><div className="customer-library-grid">{entitlements.map((entitlement) => <article className="checkout-status-card" key={entitlement.productId}><p className="eyebrow">Entitlement</p><h2>{getProductName(entitlement.productId)}</h2><p>Granted {new Date(entitlement.grantedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</p><DownloadButton orderId={order.id} productId={entitlement.productId} /></article>)}</div><Link className="action-link action-link--secondary" href="/library">Back to My Library</Link></div></section></main>;
}
