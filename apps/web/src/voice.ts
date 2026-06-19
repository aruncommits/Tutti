// Voice command grammar (Doc 7 §11.1; Brief v5 item 1). Pure, DOM-free, exhaustively testable —
// the recognition transport (useSpeech) is separate. Small + distinctive on purpose: a tiny grammar
// is far more robust in a noisy kitchen than open-ended dictation, and ambiguity defaults to
// "unknown" so the cook is never advanced on a low-confidence guess.

export type VoiceCommand = "complete" | "next" | "status" | "howLong" | "repeat" | "pause" | "setTimer" | "readStep" | "unknown";

export interface ParsedCommand {
  type: VoiceCommand;
  /** minutes for a setTimer command. */
  minutes?: number;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, "forty-five": 45, sixty: 60,
};

/** Extract a minute count from a timer phrase ("set a 12 minute timer", "timer for five minutes"). */
function timerMinutes(t: string): number | undefined {
  const digits = t.match(/(\d+)\s*(?:min|minute|minutes|m)\b/);
  if (digits) return Math.min(180, Math.max(1, parseInt(digits[1]!, 10)));
  for (const [word, n] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b\\s*(?:min|minute|minutes)`).test(t)) return n;
  }
  return undefined;
}

/** Map a spoken transcript to a command. Order matters: specific phrases before generic words. */
export function parseVoiceCommand(transcript: string): ParsedCommand {
  const t = transcript.toLowerCase().trim();
  if (!t) return { type: "unknown" };

  if (/\b(set|start|add)\b.*\btimer\b|\btimer\b.*\b(for|of)\b/.test(t)) {
    const minutes = timerMinutes(t);
    if (minutes) return { type: "setTimer", minutes };
  }
  if (/\b(read (the )?step|read it|read this|read the recipe)\b/.test(t)) return { type: "readStep" };
  if (/\b(how long|how much (time|longer)|time left)\b/.test(t)) return { type: "howLong" };
  if (/\b(what('?s| is)? next|what now|next up|status)\b/.test(t)) return { type: "status" };
  if (/\b(again|repeat|say (that|again)|read (that|it) again)\b/.test(t)) return { type: "repeat" };
  if (/\b(hold on|pause|wait|stop listening)\b/.test(t)) return { type: "pause" };
  // generic advance words last (so "what's next" is status, not complete)
  if (/\b(done|next|finished|complete|got it|that's it|thats it)\b/.test(t)) return { type: "complete" };

  return { type: "unknown" };
}
