import type { TaskNode } from "@tutti/engine";

// The on-device pace-learning guard (Doc 10 Loop A; Brief v6 item 5), pure so it's testable.
// Learn only from: an explicit opt-in, an elastic hands-on task (chopping scales with the cook;
// fixed-physics tasks don't), and an in-band sample (rejects the cook-who-answered-the-phone
// outliers — Doc 10 §3.2 robust stats). Anything else teaches nothing — no fabrication.
export function shouldLearn(node: TaskNode, actualMins: number, learnPace: boolean): boolean {
  return (
    learnPace &&
    node.attention === "active" &&
    node.duration.elastic &&
    actualMins >= 0.3 * node.duration.minMins &&
    actualMins <= 3 * node.duration.maxMins
  );
}
