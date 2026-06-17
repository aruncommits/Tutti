// Voice command grammar (Doc 7 §11.1; Brief v5 item 1). Pure, DOM-free, exhaustively testable —
// the recognition transport (useSpeech) is separate. Small + distinctive on purpose: a tiny grammar
// is far more robust in a noisy kitchen than open-ended dictation, and ambiguity defaults to
// "unknown" so the cook is never advanced on a low-confidence guess.

export type VoiceCommand = "complete" | "next" | "status" | "howLong" | "repeat" | "pause" | "unknown";

export interface ParsedCommand {
  type: VoiceCommand;
}

/** Map a spoken transcript to a command. Order matters: specific phrases before generic words. */
export function parseVoiceCommand(transcript: string): ParsedCommand {
  const t = transcript.toLowerCase().trim();
  if (!t) return { type: "unknown" };

  if (/\b(how long|how much (time|longer)|time left)\b/.test(t)) return { type: "howLong" };
  if (/\b(what('?s| is)? next|what now|next up|status)\b/.test(t)) return { type: "status" };
  if (/\b(again|repeat|say (that|again)|read (that|it) again)\b/.test(t)) return { type: "repeat" };
  if (/\b(hold on|pause|wait|stop listening)\b/.test(t)) return { type: "pause" };
  // generic advance words last (so "what's next" is status, not complete)
  if (/\b(done|next|finished|complete|got it|that's it|thats it)\b/.test(t)) return { type: "complete" };

  return { type: "unknown" };
}
