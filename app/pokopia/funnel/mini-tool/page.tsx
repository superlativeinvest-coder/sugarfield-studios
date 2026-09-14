import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PokopiaMiniToolPage({ searchParams }: { searchParams: Promise<{ order_id?: string; funnel_session?: string }> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.order_id) query.set("order_id", params.order_id);
  if (params.funnel_session) query.set("funnel_session", params.funnel_session);
  redirect(`/pokopia/funnel/companion${query.size ? `?${query}` : ""}`);
}
