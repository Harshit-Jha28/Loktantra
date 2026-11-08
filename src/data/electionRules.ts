
/**
 * LOKTANTRA - Election Simulation Rules
 *
 * These are gameplay scheduling rules, not statutory ECI deadlines.
 */

export const ELECTION_RULES = {
  // Create an election record this many days before polling.
  scheduleNoticeDays: 60,

  // Begin the campaign phase this many days before polling.
  campaignStartDays: 30,

  // Normal Assembly polling is scheduled before the term expires.
  assemblyPollingBufferDays: 7,

  // Early elections caused by government collapse.
  earlyElectionDelayDays: 90,

  // National election scheduling window.
  lokSabhaScheduleNoticeDays: 180,

  // The 18th Lok Sabha's five-year term is used as the
  // starting national term reference for this game snapshot.
  lokSabhaTermEnd: "2029-06-23",

  // Polling is scheduled before the term-end date.
  lokSabhaPollingBufferDays: 7,
} as const;
