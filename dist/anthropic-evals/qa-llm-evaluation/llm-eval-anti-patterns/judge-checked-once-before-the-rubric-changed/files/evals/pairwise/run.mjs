import { pathToFileURL } from 'node:url';

export const SUT = 'openai:gpt-4o-mini';
export const GRADER = 'openai:gpt-4o';

export const RUBRIC =
  'Which reply is more helpful to the customer? Consider accuracy, tone and whether the next step is clear.';

export function buildJudgePrompt(rubric, baselineReply, candidateReply) {
  return [
    `Rubric: ${rubric}`,
    '',
    `Response 1:`,
    baselineReply,
    '',
    `Response 2:`,
    candidateReply,
    '',
    'Which response is better? Answer exactly "1" or "2" and nothing else.',
  ].join('\n');
}

export function winnerFromVerdict(verdict) {
  return String(verdict).trim() === '2' ? 'candidate' : 'baseline';
}

export function tally(verdicts) {
  let baseline = 0;
  let candidate = 0;
  for (const v of verdicts) {
    if (winnerFromVerdict(v) === 'candidate') candidate += 1;
    else baseline += 1;
  }
  return { baseline, candidate };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`grader=${GRADER} sut=${SUT}`);
}
