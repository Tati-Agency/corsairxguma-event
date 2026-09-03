"use client";

import { useEffect } from "react";
import { trackPageView } from "@/lib/track";

/** Mounts once on the landing page to record the visit. */
export default function Tracker() {
  useEffect(() => {
    trackPageView();
  }, []);
  return null;
}
