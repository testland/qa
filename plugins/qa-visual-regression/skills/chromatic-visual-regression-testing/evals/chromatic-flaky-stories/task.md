# We raised the diff threshold and missed a real regression

## Problem Description

Our Chromatic builds report changes on every run for a few stories, so we raised the diff threshold, and then we missed a real regression (`docs/notes.md`). Fix the stories, components and config.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/RecentActivity.stories.tsx ===============
import type { Meta, StoryObj } from '@storybook/react';
import { RecentActivity } from './RecentActivity';

const meta: Meta<typeof RecentActivity> = { component: RecentActivity };
export default meta;

export const Default: StoryObj<typeof RecentActivity> = {
  args: {
    items: [
      { user: 'Ana', action: 'commented', at: new Date() },               // renders "just now", "3 minutes ago"...
      { user: 'Ben', action: 'merged a PR', at: new Date(Date.now() - 36e5) },
    ],
    avatarColor: () => `hsl(${Math.floor(Math.random() * 360)} 70% 50%)`,
  },
};

=============== FILE: src/CountUp.tsx ===============
import { useEffect, useState } from 'react';
// Animates a number from 0 to `value` with requestAnimationFrame over 2 seconds.
export function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let id = requestAnimationFrame(function tick(t) {
      const p = Math.min((t - start) / 2000, 1);
      setN(Math.round(value * p));
      if (p < 1) id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <span className="count">{n}</span>;
}

=============== FILE: chromatic.config.json ===============
{
  "projectId": "Project:64f0c0ffee",
  "diffThreshold": 0.3
}

=============== FILE: docs/notes.md ===============
- RecentActivity and the Dashboard stories (which use CountUp) show changes on almost every build.
- We raised diffThreshold to 0.3 to stop the noise. Last week a 6 px padding regression on Button passed unnoticed.
