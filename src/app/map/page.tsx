"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useCampaignStore } from "@/engine/campaign/campaignStore";

const IndiaPoliticalMap = dynamic(
  () => import("@/components/IndiaPoliticalMap"),
  {
    ssr: false,
    loading: () => (
      <main className="game-loading">
        <div className="loading-stamp">L</div>
        <h1>LOKTANTRA</h1>
        <p>Preparing the political map...</p>
      </main>
    ),
  },
);

export default function MapPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.resolve(useCampaignStore.persist.rehydrate()).finally(() => {
      if (mounted) setReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <main className="game-loading">
        <div className="loading-stamp">L</div>
        <h1>LOKTANTRA</h1>
        <p>Restoring your campaign...</p>
      </main>
    );
  }

  return <IndiaPoliticalMap />;
}
