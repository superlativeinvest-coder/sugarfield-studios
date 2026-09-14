import { PlaceholderPage } from "@/components/catalog/PlaceholderPage";

export default async function OrderOffersPage({ params }: { params: Promise<{ "order-id": string }> }) {
  const orderId = (await params)["order-id"];
  return <main><PlaceholderPage eyebrow="Keep exploring" title="Related tools will appear after your purchase." description={`Order ${orderId} must be verified before any related product or bundle offer is shown. Offers will come only from explicit product relationships—never random recommendations or preselected add-ons.`} href="/shop" label="Continue shopping" /></main>;
}
