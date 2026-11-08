"use client";

import { useState } from "react";

import { validateIndiaConstituencies } from "@/data/validateConstituencies";

export default function ConstituencyTestPage() {
  const [result] = useState(() => validateIndiaConstituencies());

  return (
    <main className="min-h-screen bg-[#F5E6C8] p-8 text-[#34495E]">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-bold">
          LOKTANTRA Constituency Database
        </h1>

        <div className="rounded-xl border border-[#8C5946] bg-[#F8F1E3] p-6">
          <h2 className="text-xl font-semibold">
            Dataset statistics
          </h2>

          <p>Assembly constituencies: {result.totals.assembly}</p>
          <p>Lok Sabha constituencies: {result.totals.lokSabha}</p>
          <p>Assembly–Lok Sabha links: {result.totals.segments}</p>

          <p className="mt-4 font-bold">
            Validation: {result.valid ? "PASSED" : "FAILED"}
          </p>
        </div>

        {result.errors.length > 0 && (
          <div className="rounded-xl border border-red-500 bg-red-50 p-6">
            <h2 className="font-bold text-red-700">
              Problems found
            </h2>

            {result.errors.map((error, index) => (
              <p key={index} className="text-sm text-red-700">
                {error}
              </p>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}