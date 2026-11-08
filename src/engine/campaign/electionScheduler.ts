
import type { CampaignState, Election } from "@/types/campaign";

import {
    INDIA_REGIONS,
    INDIA_ASSEMBLY_TERM_ENDS,
} from "@/data/india2026";

import { ELECTION_RULES } from "@/data/electionRules";

// --------------------------------------------------
// Date helpers
// --------------------------------------------------

function parseDate(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
}

function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
    const result = parseDate(date);
    result.setUTCDate(result.getUTCDate() + days);

    return formatDate(result);
}

function daysBetween(from: string, to: string): number {
    const milliseconds =
        parseDate(to).getTime() - parseDate(from).getTime();

    return Math.ceil(milliseconds / (1000 * 60 * 60 * 24));
}

// --------------------------------------------------
// Election helpers
// --------------------------------------------------

function hasActiveElection(
    elections: Election[],
    type: Election["type"],
    stateId: string | null,
): boolean {
    return elections.some(
        (election) =>
            election.type === type &&
            election.stateId === stateId &&
            election.status !== "completed",
    );
}

function createElection(options: {
    id: string;
    name: string;
    type: Election["type"];
    stateId: string | null;
    date: string;
}): Election {
    return {
        id: options.id,
        name: options.name,
        type: options.type,
        stateId: options.stateId,
        date: options.date,
        status: "scheduled",
        candidates: [],
        results: [],
    };
}

// --------------------------------------------------
// Main election scheduler
// --------------------------------------------------

export function runElectionScheduler(
    campaign: CampaignState,
): CampaignState {
    const today = campaign.calendar.currentDate;

    const elections: Election[] = [
        ...campaign.elections,
    ];

    // --------------------------------------------------
    // 1. Assembly election scheduling
    // --------------------------------------------------

    for (const region of INDIA_REGIONS) {
        if (
            region.assemblySeats === null ||
            region.assemblySeats === 0
        ) {
            continue;
        }

        const stateId = region.id;

        const government =
            campaign.politicalWorld.stateGovernments.find(
                (item) => item.stateId === stateId,
            );

        const termEnd =
            INDIA_ASSEMBLY_TERM_ENDS[stateId] ??
            government?.assemblyTermEnd ??
            null;

        if (!termEnd) {
            continue;
        }

        const caretaker =
            government?.governmentType === "caretaker";

        const existingIndex = elections.findIndex(
            (election) =>
                election.type === "vidhan_sabha" &&
                election.stateId === stateId &&
                election.status !== "completed",
        );

        const existingElection =
            existingIndex >= 0
                ? elections[existingIndex]
                : undefined;

        const alreadyEarly =
            existingElection?.name.startsWith(
                "Early Assembly Election",
            ) ?? false;

        const normalPollingDate = addDays(
            termEnd,
            -ELECTION_RULES.assemblyPollingBufferDays,
        );

        const pollingDate = caretaker
            ? alreadyEarly
                ? existingElection!.date
                : addDays(
                    today,
                    ELECTION_RULES.earlyElectionDelayDays,
                )
            : normalPollingDate;

        const daysUntilPolling = daysBetween(
            today,
            pollingDate,
        );

        // Ignore normal elections whose polling date has passed.
        if (!caretaker && daysUntilPolling < 0) {
            continue;
        }

        // Create a new election when it enters the notice window.
        if (existingIndex === -1) {
            if (
                daysUntilPolling >
                ELECTION_RULES.scheduleNoticeDays
            ) {
                continue;
            }

            elections.push(
                createElection({
                    id: caretaker
                        ? `early-vidhan-sabha-${stateId}-${today}`
                        : `vidhan-sabha-${stateId}-${pollingDate}`,

                    name: caretaker
                        ? `Early Assembly Election — ${region.name}`
                        : `${region.name} Legislative Assembly Election`,

                    type: "vidhan_sabha",
                    stateId,
                    date: pollingDate,
                }),
            );

            continue;
        }

        // Move an existing election forward if the government collapses.
        if (caretaker && !alreadyEarly) {
            const existing = elections[existingIndex];

            elections[existingIndex] = {
                ...existing,
                id: `early-vidhan-sabha-${stateId}-${today}`,
                name: `Early Assembly Election — ${region.name}`,
                date: pollingDate,
                status: "scheduled",
            };
        }
    }

    // --------------------------------------------------
    // 2. Lok Sabha election scheduling
    // --------------------------------------------------

    const nationalPollingDate = addDays(
        ELECTION_RULES.lokSabhaTermEnd,
        -ELECTION_RULES.lokSabhaPollingBufferDays,
    );

    const daysUntilNationalElection = daysBetween(
        today,
        nationalPollingDate,
    );

    if (
        daysUntilNationalElection >= 0 &&
        daysUntilNationalElection <=
            ELECTION_RULES.lokSabhaScheduleNoticeDays &&
        !hasActiveElection(
            elections,
            "lok_sabha",
            null,
        )
    ) {
        elections.push(
            createElection({
                id: `lok-sabha-${nationalPollingDate}`,
                name: "General Election — Lok Sabha",
                type: "lok_sabha",
                stateId: null,
                date: nationalPollingDate,
            }),
        );
    }

    // --------------------------------------------------
    // 3. Update election phases
    // --------------------------------------------------

    const updatedElections = elections.map((election) => {
        if (
            election.status === "completed" ||
            election.status === "polling" ||
            election.status === "results"
        ) {
            return election;
        }

        const remainingDays = daysBetween(
            today,
            election.date,
        );

        if (remainingDays <= 0) {
            return {
                ...election,
                status: "polling" as const,
            };
        }

        if (
            remainingDays <=
            ELECTION_RULES.campaignStartDays
        ) {
            return {
                ...election,
                status: "campaigning" as const,
            };
        }

        return {
            ...election,
            status: "scheduled" as const,
        };
    });

    // --------------------------------------------------
    // 4. Return updated campaign
    // --------------------------------------------------

    return {
        ...campaign,
        elections: updatedElections,
        metadata: {
            ...campaign.metadata,
            updatedAt: new Date().toISOString(),
        },
    };
}

// --------------------------------------------------
// Manually trigger an early Assembly election
// --------------------------------------------------

export function scheduleEarlyAssemblyElection(
    campaign: CampaignState,
    stateId: string,
): CampaignState {
    const region = INDIA_REGIONS.find(
        (item) => item.id === stateId,
    );

    if (!region) {
        throw new Error(
            `Unknown region: ${stateId}`,
        );
    }

    if (
        region.assemblySeats === null ||
        region.assemblySeats === 0
    ) {
        throw new Error(
            `${region.name} does not have a legislative assembly.`,
        );
    }

    const today = campaign.calendar.currentDate;

    const pollingDate = addDays(
        today,
        ELECTION_RULES.earlyElectionDelayDays,
    );

    const existingIndex = campaign.elections.findIndex(
        (election) =>
            election.type === "vidhan_sabha" &&
            election.stateId === stateId &&
            election.status !== "completed",
    );

    const elections = [
        ...campaign.elections,
    ];

    if (existingIndex >= 0) {
        const existing = elections[existingIndex];

        elections[existingIndex] = {
            ...existing,
            id: `early-vidhan-sabha-${stateId}-${today}`,
            name: `Early Assembly Election — ${region.name}`,
            date: pollingDate,
            status: "scheduled",
        };
    } else {
        elections.push(
            createElection({
                id: `early-vidhan-sabha-${stateId}-${today}`,
                name: `Early Assembly Election — ${region.name}`,
                type: "vidhan_sabha",
                stateId,
                date: pollingDate,
            }),
        );
    }

    return {
        ...campaign,
        elections,
        metadata: {
            ...campaign.metadata,
            updatedAt: new Date().toISOString(),
        },
    };
}
