export async function launch() {
  const { chromium } = await import('playwright');
  return chromium.launch({ headless: true });
}
