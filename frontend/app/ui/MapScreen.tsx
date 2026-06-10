"use client";

import dynamic from "next/dynamic";

const EmpyrMap = dynamic(() => import("./EmpyrMap"), {
  ssr: false,
  loading: () => (
    <main className="loading-shell">
      <div className="loading-panel">Loading Empyr map</div>
    </main>
  )
});

export default function MapScreen() {
  return <EmpyrMap />;
}
