"use client";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { AttributionCapture } from "@/components/analytics/AttributionCapture";
export function SiteChrome({ children }: { children: React.ReactNode }) { const pathname = usePathname(); const focused = pathname.startsWith("/pokopia/funnel/"); return <><AttributionCapture />{!focused && <SiteHeader />}{children}{!focused && <SiteFooter />}</>; }
