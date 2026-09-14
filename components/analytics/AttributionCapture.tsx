"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution/capture";

export function AttributionCapture() {
  useEffect(() => { captureAttribution(window.location.search, window.sessionStorage); }, []);
  return null;
}
