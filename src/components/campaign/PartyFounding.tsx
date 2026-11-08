
"use client";

import { useState } from "react";
import { useCampaignStore } from "@/engine/campaign/campaignStore";
import {
  createPlayerParty,
  type PartyIdeology,
} from "@/engine/party/createPlayerParty";

const IDEOLOGIES: {
  id: PartyIdeology;
  title: string;
  description: string;
  symbol: string;
}[] = [
  {
    id: "Progressive",
    title: "Progressive",
    description: "Welfare, equality, education and inclusion.",
    symbol: "🌱",
  },
  {
    id: "Centrist",
    title: "Centrist",
    description: "Balanced policies and pragmatic development.",
    symbol: "⚖️",
  },
  {
    id: "Nationalist",
    title: "Nationalist",
    description: "National identity, sovereignty and security.",
    symbol: "🛡️",
  },
  {
    id: "Regionalist",
    title: "Regionalist",
    description: "Regional identity and state autonomy.",
    symbol: "🗺️",
  },
];

const SYMBOLS = ["🪔", "🌾", "🌞", "🌳", "🦁", "🐘", "⭐", "✋"];

export default function PartyFounding() {
  const campaign = useCampaignStore((state) => state.campaign);
  const updateCampaign = useCampaignStore((state) => state.updateCampaign);

  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [ideology, setIdeology] = useState<PartyIdeology>("Centrist");
  const [description, setDescription] = useState("");
  const [slogan, setSlogan] = useState("");
  const [symbol, setSymbol] = useState("🪔");
  const [primaryColor, setPrimaryColor] = useState("#D96B42");
  const [secondaryColor, setSecondaryColor] = useState("#F5E6C8");
  const [error, setError] = useState("");

  if (!campaign || campaign.player.partyId) {
    return null;
  }

  function handleFoundParty() {
    if (!campaign) return;

    try {
      setError("");

      updateCampaign((current) =>
        createPlayerParty(current, {
          name,
          abbreviation,
          ideology,
          description,
          slogan,
          symbol,
          primaryColor,
          secondaryColor,
        })
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to establish your party."
      );
    }
  }

  return (
    <section className="space-y-6 rounded-2xl border-2 border-[#8C5946] bg-[#F8F1E3] p-6 shadow-[5px_5px_0px_#8C5946]">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-[#D96B42]">
          Chapter One • The Beginning
        </p>

        <h2 className="mt-2 text-3xl font-black">
          Found your political party
        </h2>

        <p className="mt-2 text-[#8C5946]">
          Every political movement begins with an idea. Give yours an identity.
        </p>
      </div>

      <div className="rounded-xl border-2 border-[#D6B995] bg-white p-5">
        <p className="mb-3 text-sm font-bold text-[#8C5946]">
          PARTY EMBLEM PREVIEW
        </p>

        <div
          className="flex min-h-36 flex-col items-center justify-center rounded-xl border-4 p-5"
          style={{
            backgroundColor: primaryColor,
            borderColor: secondaryColor,
            color: secondaryColor,
          }}
        >
          <span className="text-5xl">{symbol}</span>
          <h3 className="mt-2 text-xl font-black text-center">
            {name || "YOUR PARTY NAME"}
          </h3>
          <p className="text-sm font-bold">
            {abbreviation || "ABBREVIATION"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block font-bold">Party name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="Enter your party name"
          className="w-full rounded-lg border-2 border-[#8C5946] bg-white p-3"
        />
      </div>

      <div className="space-y-2">
        <label className="block font-bold">Party abbreviation</label>
        <input
          value={abbreviation}
          onChange={(e) => setAbbreviation(e.target.value.toUpperCase())}
          maxLength={8}
          placeholder="e.g. NPP"
          className="w-full rounded-lg border-2 border-[#8C5946] bg-white p-3 uppercase"
        />
      </div>

      <div className="space-y-3">
        <h3 className="font-bold">Choose your ideology</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          {IDEOLOGIES.map((item) => {
            const selected = ideology === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setIdeology(item.id)}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  selected
                    ? "border-[#D96B42] bg-[#F5E6C8] shadow-[3px_3px_0px_#8C5946]"
                    : "border-[#D6B995] bg-white hover:border-[#8C5946]"
                }`}
              >
                <span className="text-2xl">{item.symbol}</span>
                <p className="mt-2 font-black">{item.title}</p>
                <p className="mt-1 text-sm text-[#8C5946]">
                  {item.description}
                </p>
                {selected && (
                  <p className="mt-2 text-xs font-black text-[#D96B42]">
                    SELECTED
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block font-bold">Party description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="What does your political movement stand for?"
          className="w-full rounded-lg border-2 border-[#8C5946] bg-white p-3"
        />
      </div>

      <div className="space-y-2">
        <label className="block font-bold">Party slogan</label>
        <input
          value={slogan}
          onChange={(e) => setSlogan(e.target.value)}
          maxLength={100}
          placeholder="Your movement's motto"
          className="w-full rounded-lg border-2 border-[#8C5946] bg-white p-3"
        />
      </div>

      <div className="space-y-3">
        <h3 className="font-bold">Choose your election symbol</h3>

        <div className="flex flex-wrap gap-3">
          {SYMBOLS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSymbol(item)}
              className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 text-3xl ${
                symbol === item
                  ? "border-[#D96B42] bg-[#F5E6C8]"
                  : "border-[#D6B995] bg-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#8C5946]">
          These are provisional game symbols, not official ECI allocations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block font-bold">Primary colour</label>
          <div className="flex items-center gap-3 rounded-lg border-2 border-[#8C5946] bg-white p-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 cursor-pointer"
            />
            <span className="text-sm font-bold">{primaryColor}</span>
          </div>
        </div>

        <div>
          <label className="mb-2 block font-bold">Secondary colour</label>
          <div className="flex items-center gap-3 rounded-lg border-2 border-[#8C5946] bg-white p-2">
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="h-10 w-14 cursor-pointer"
            />
            <span className="text-sm font-bold">{secondaryColor}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#D6B995] bg-white p-4">
        <p className="font-bold">Founding headquarters</p>
        <p className="mt-1 text-[#8C5946]">
          {campaign.player.foundingStateId}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-100 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleFoundParty}
        disabled={!name.trim() || !abbreviation.trim()}
        className="w-full rounded-lg border-2 border-[#8C5946] bg-[#D96B42] p-4 font-black text-white shadow-[3px_3px_0px_#8C5946] transition hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        ESTABLISH MY POLITICAL PARTY
      </button>

      <p className="text-center text-xs text-[#8C5946]">
        Starting treasury: ₹2,50,000 • Initial organization strength: 1
      </p>
    </section>
  );
}
