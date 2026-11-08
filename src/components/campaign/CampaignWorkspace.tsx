
"use client";

import { useRef, useState } from "react";
import PartyFounding from "@/components/campaign/PartyFounding";
import { createSaveEnvelope, downloadSaveFile, readSaveFile } from "@/save/saveFormat";
import type { CampaignState } from "@/types/campaign";
import { useCampaignStore } from "@/engine/campaign/campaignStore";

const STATES = [
    { id: "west-bengal", name: "West Bengal" },
    { id: "uttar-pradesh", name: "Uttar Pradesh" },
    { id: "bihar", name: "Bihar" },
    { id: "maharashtra", name: "Maharashtra" },
    { id: "tamil-nadu", name: "Tamil Nadu" },
    { id: "jharkhand", name: "Jharkhand" },
    { id: "assam", name: "Assam" },
    { id: "delhi", name: "Delhi" },
];

export default function CampaignWorkspace() {
    const campaign = useCampaignStore((state) => state.campaign);
    const startCampaign = useCampaignStore((state) => state.startCampaign);
    const loadCampaign = useCampaignStore((state) => state.loadCampaign);
    const advanceSimulationDay = useCampaignStore(
        (state) => state.advanceSimulationDay
    );
    const markSaved = useCampaignStore((state) => state.markSaved);
    const closeCampaign = useCampaignStore((state) => state.closeCampaign);
    const hasUnsavedChanges = useCampaignStore(
        (state) => state.hasUnsavedChanges
    );

    const [campaignName, setCampaignName] = useState("My Political Journey");
    const [foundingState, setFoundingState] = useState("west-bengal");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleNewCampaign() {
        setError("");
        setMessage("");

        if (!campaignName.trim()) {
            setError("Please enter a campaign name.");
            return;
        }

        startCampaign(
            campaignName.trim(),
            foundingState
        );
    }

    function handleSave() {
        if (!campaign) return;

        try {
            const save = createSaveEnvelope(campaign);
            downloadSaveFile(save);
            markSaved();
            setMessage("Campaign saved successfully!");
            setError("");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to save campaign."
            );
        }
    }
    async function handleLoad(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) return;

        try {
            setError("");
            setMessage("");

            const save = await readSaveFile<CampaignState>(file);

            const importedCampaign = save.campaign;

            if (
                importedCampaign.schemaVersion !== 1 ||
                !importedCampaign.metadata ||
                !importedCampaign.calendar ||
                !importedCampaign.politicalWorld ||
                !Array.isArray(importedCampaign.politicalWorld.parties) ||
                !Array.isArray(importedCampaign.history?.events)
            ) {
                throw new Error("The campaign data is incomplete or invalid.");
            }

            loadCampaign(importedCampaign);
            setMessage(`Loaded campaign: ${save.campaignName}`);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to load campaign."
            );
        } finally {
            event.target.value = "";
        }
    }

    function handleCloseCampaign() {
        const confirmed = window.confirm(
            "Close this campaign? Make sure you have saved your progress."
        );

        if (!confirmed) return;

        closeCampaign();
        setMessage("Campaign closed.");
        setError("");
    }

    if (!campaign) {
        return (
            <main className="min-h-screen bg-[#F5E6C8] p-6 text-[#34495E]">
                <div className="mx-auto max-w-3xl space-y-8 py-12">
                    <header>
                        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#D96B42]">
                            LOKTANTRA
                        </p>
                        <h1 className="mt-3 text-4xl font-black">
                            Your political journey begins here.
                        </h1>
                        <p className="mt-3 text-[#8C5946]">
                            Build a party. Win people's trust. Change the nation.
                        </p>
                    </header>

                    <section className="rounded-2xl border-2 border-[#8C5946] bg-[#F8F1E3] p-6 shadow-[5px_5px_0px_#8C5946]">
                        <h2 className="text-2xl font-black">New Campaign</h2>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-2 block font-bold">
                                    Campaign name
                                </label>
                                <input
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    className="w-full rounded-lg border-2 border-[#8C5946] bg-white p-3 outline-none focus:border-[#D96B42]"
                                    placeholder="My Political Journey"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-bold">
                                    Founding state
                                </label>
                                <select
                                    value={foundingState}
                                    onChange={(e) => setFoundingState(e.target.value)}
                                    className="w-full rounded-lg border-2 border-[#8C5946] bg-white p-3"
                                >
                                    {STATES.map((state) => (
                                        <option key={state.id} value={state.id}>
                                            {state.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleNewCampaign}
                                className="w-full rounded-lg border-2 border-[#8C5946] bg-[#D96B42] p-3 font-black text-white shadow-[3px_3px_0px_#8C5946] transition hover:translate-y-0.5 hover:shadow-none"
                            >
                                START NEW CAMPAIGN
                            </button>
                        </div>
                    </section>

                    <section className="rounded-2xl border-2 border-[#8C5946] bg-[#F8F1E3] p-6">
                        <h2 className="text-xl font-black">Continue your journey</h2>
                        <p className="mt-2 text-sm text-[#8C5946]">
                            Load a previously saved .lok campaign file.
                        </p>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".lok,application/json"
                            onChange={handleLoad}
                            className="hidden"
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4 w-full rounded-lg border-2 border-[#557C55] bg-[#557C55] p-3 font-bold text-white"
                        >
                            LOAD CAMPAIGN
                        </button>
                    </section>

                    {message && (
                        <p className="rounded-lg bg-[#557C55] p-3 font-bold text-white">
                            {message}
                        </p>
                    )}

                    {error && (
                        <p className="rounded-lg bg-red-100 p-3 font-bold text-red-700">
                            {error}
                        </p>
                    )}
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F5E6C8] p-6 text-[#34495E]">
            <div className="mx-auto max-w-5xl space-y-6 py-8">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#D96B42]">
                            LOKTANTRA • CAMPAIGN
                        </p>
                        <h1 className="mt-2 text-3xl font-black">
                            {campaign.metadata.campaignName}
                        </h1>
                    </div>

                    <span
                        className={`rounded-full px-4 py-2 text-sm font-bold ${hasUnsavedChanges
                            ? "bg-[#E5B94F] text-[#34495E]"
                            : "bg-[#557C55] text-white"
                            }`}
                    >
                        {hasUnsavedChanges ? "UNSAVED CHANGES" : "ALL CHANGES SAVED"}
                    </span>
                </header>
                {!campaign.player.partyId && <PartyFounding />}

                <section className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border-2 border-[#8C5946] bg-[#F8F1E3] p-5">
                        <p className="text-sm font-bold text-[#8C5946]">CURRENT DATE</p>
                        <p className="mt-2 text-2xl font-black">
                            {campaign.calendar.currentDate}
                        </p>
                    </div>

                    <div className="rounded-xl border-2 border-[#8C5946] bg-[#F8F1E3] p-5">
                        <p className="text-sm font-bold text-[#8C5946]">TURN</p>
                        <p className="mt-2 text-2xl font-black">
                            {campaign.calendar.currentTurn}
                        </p>
                    </div>

                    <div className="rounded-xl border-2 border-[#8C5946] bg-[#F8F1E3] p-5">
                        <p className="text-sm font-bold text-[#8C5946]">PARTIES</p>
                        <p className="mt-2 text-2xl font-black">
                            {campaign.politicalWorld.parties.length}
                        </p>
                    </div>
                </section>

                <section className="rounded-2xl border-2 border-[#8C5946] bg-[#F8F1E3] p-6">
                    <h2 className="text-2xl font-black">Campaign Headquarters</h2>

                    <p className="mt-2 text-[#8C5946]">
                        Your political journey is underway. Build your organization,
                        recruit members and prepare to compete in your first election.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            onClick={() => {
                                advanceSimulationDay();
                                setMessage("Simulation advanced by one day.");
                                setError("");
                            }}
                            className="rounded-lg border-2 border-[#8C5946] bg-[#D96B42] px-5 py-3 font-bold text-white"
                        >
                            ADVANCE ONE DAY
                        </button>

                        <button
                            onClick={handleSave}
                            className="rounded-lg border-2 border-[#8C5946] bg-[#557C55] px-5 py-3 font-bold text-white"
                        >
                            SAVE CAMPAIGN
                        </button>

                        <button
                            onClick={handleCloseCampaign}
                            className="rounded-lg border-2 border-[#8C5946] bg-[#34495E] px-5 py-3 font-bold text-white"
                        >
                            CLOSE CAMPAIGN
                        </button>
                    </div>
                </section>

                <section className="rounded-2xl border-2 border-[#8C5946] bg-[#F8F1E3] p-6">
                    <h2 className="text-xl font-black">Campaign History</h2>

                    <div className="mt-4 space-y-3">
                        {[...campaign.history.events].reverse().map((event) => (
                            <div
                                key={event.id}
                                className="rounded-lg border border-[#D6B995] bg-white p-4"
                            >
                                <div className="flex flex-wrap justify-between gap-2">
                                    <strong>{event.title}</strong>
                                    <span className="text-sm text-[#8C5946]">
                                        {event.date}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-[#8C5946]">
                                    {event.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {message && (
                    <p className="rounded-lg bg-[#557C55] p-3 font-bold text-white">
                        {message}
                    </p>
                )}

                {error && (
                    <p className="rounded-lg bg-red-100 p-3 font-bold text-red-700">
                        {error}
                    </p>
                )}
            </div>
        </main>
    );
}
