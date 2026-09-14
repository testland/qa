import type { Page } from '@playwright/test';

interface Performable {
  performAs(page: Page): Promise<void>;
}

export function scheduler(page: Page) {
  return {
    async attemptsTo(...tasks: Performable[]) {
      for (const task of tasks) await task.performAs(page);
    },
  };
}
