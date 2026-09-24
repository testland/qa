import { expect, type Page } from '@playwright/test';

export class SchedulePage {
  constructor(private readonly page: Page) {}

  async goto(day: string) {
    await this.page.goto(`/schedule/${day}`);
  }

  async dragAppointment(id: string, toTime: string) {
    const target = this.page.getByTestId(`slot-${toTime.replace(':', '-')}`);
    await this.page.getByTestId(`appt-${id}`).dragTo(target);
  }

  async expectSlotBooked(time: string) {
    await expect(this.page.getByTestId(`slot-${time.replace(':', '-')}`)).toHaveText('Booked');
  }
}
