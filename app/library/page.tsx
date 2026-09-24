import Link from "next/link";
import { DownloadButton } from "@/components/customer/DownloadButton";
import { getCustomerSession } from "@/lib/customer/session";
import { getLibraryRepository } from "@/lib/library/repository";
import { getProductName } from "@/lib/delivery/product-labels";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await getCustomerSession();
  if (!session) return <main><section className="site-section"><div className="site-container"><p className="eyebrow">Customer library</p><h1>Your downloads are protected.</h1><p className="section-intro">Sign in with the customer email used at checkout to view verified orders and generate secure download links.</p><Link className="action-link action-link--primary" href="/account/login?next=%2Flibrary">SIGN IN TO LIBRARY</Link></div></section></main>;
  const repository = getLibraryRepository();
  const items = repository ? await repository.listForCustomer(session.customer.id) : [];
  return <main><section className="site-section"><div className="site-container"><p className="eyebrow">Customer library</p><h1>Your purchased files</h1><p className="section-intro">Download links are generated after your verified entitlement is checked. Links expire after one hour.</p>{items.length === 0 ? <div className="empty-state"><h2>No verified downloads yet</h2><p>Completed purchases will appear here after payment and webhook fulfillment.</p><Link className="action-link action-link--secondary" href="/shop">Browse the shop</Link></div> : <div className="customer-library-grid">{items.map((item) => <article className="checkout-status-card" key={`${item.orderId}:${item.productId}`}><p className="eyebrow">Verified entitlement</p><h2>{getProductName(item.productId)}</h2><p>Order {item.orderId}</p><DownloadButton orderId={item.orderId} productId={item.productId} /><Link className="action-link action-link--secondary" href={`/orders/${encodeURIComponent(item.orderId)}`}>View order</Link></article>)}</div>}</div></section></main>;
}
