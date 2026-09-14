import type { Page } from '@playwright/test';

export class BookAppointment {
  private constructor(
    private readonly patientId: string,
    private readonly time: string,
  ) {}

  static forPatient(patientId: string) {
    return { at: (time: string) => new BookAppointment(patientId, time) };
  }

  async performAs(page: Page) {
    await page.getByTestId('new-appointment').click();
    await page.getByLabel('Patient').fill(this.patientId);
    await page.getByLabel('Time').selectOption(this.time);
    await page.getByRole('button', { name: 'Book' }).click();
  }
}
