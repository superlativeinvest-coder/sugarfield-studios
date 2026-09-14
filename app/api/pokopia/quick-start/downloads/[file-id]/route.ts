import { cookies } from "next/headers";
import { createQuickStartSignedDownload } from "@/lib/delivery/service";
import { getQuickStartAccessRepository, hashAccessToken, QUICK_START_ACCESS_COOKIE } from "@/lib/quick-start/access";
import { QUICK_START_PRODUCT_ID, getQuickStartFile, type QuickStartFileId } from "@/lib/quick-start/manifest";

export async function GET(_request: Request, { params }: { params: Promise<{ "file-id": string }> }): Promise<Response> {
  const { "file-id": fileId } = await params;
  const file = getQuickStartFile(fileId);
  if (!file || !["letter", "a4"].includes(fileId)) return Response.json({ error: "That Quick Start file is not available." }, { status: 404 });
  const cookieStore = await cookies();
  const token = cookieStore.get(QUICK_START_ACCESS_COOKIE)?.value;
  if (!token) return Response.json({ error: "Quick Start access is required." }, { status: 401 });
  const repository = getQuickStartAccessRepository();
  if (!repository) return Response.json({ error: "Free product access storage is not configured yet." }, { status: 503 });
  try {
    const access = await repository.findByTokenHash(hashAccessToken(token));
    if (!access || access.productId !== QUICK_START_PRODUCT_ID || access.sku !== "pokopia_quick_start_pack") return Response.json({ error: "Quick Start access could not be verified." }, { status: 403 });
    const download = await createQuickStartSignedDownload(fileId as QuickStartFileId);
    if (!download) return Response.json({ error: "Secure Quick Start delivery is not configured yet." }, { status: 503 });
    await repository.touch(access.id);
    return Response.json({ url: download.url, expiresAt: download.expiresAt, filename: file.customerFilename });
  } catch { return Response.json({ error: "Secure Quick Start delivery could not be prepared." }, { status: 503 }); }
}
