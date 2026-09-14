import { test, expect } from '@playwright/test';
import { SchedulePage } from './pages/SchedulePage';
import { BookAppointment } from './tasks/BookAppointment';
import { scheduler } from './actors/scheduler';

test('front desk books a follow-up into the next open slot', async ({ page }) => {
  const schedulePage = new SchedulePage(page);
  await schedulePage.goto('2026-10-01');
  await scheduler(page).attemptsTo(BookAppointment.forPatient('P-4417').at('10:20'));
  await expect(page.getByTestId('slot-10-20')).toHaveText('Booked');
});

test('reschedule moves the appointment and frees the old slot', async ({ page }) => {
  await page.goto('/schedule/2026-10-01');
  await page.evaluate(() =>
    window.__ardent.store.dispatch({
      type: 'appointments/seed',
      payload: [{ id: 'A-91', patientId: 'P-4417', at: '10:20' }],
    }),
  );
  const schedulePage = new SchedulePage(page);
  await schedulePage.dragAppointment('A-91', '11:00');
  await schedulePage.expectSlotBooked('11:00');
});
