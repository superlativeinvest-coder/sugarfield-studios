import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PokopiaMiniToolPage() {
  redirect("/pokopia/funnel/companion");
}
