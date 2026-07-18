import { test, expect, _android as android } from '@playwright/test';

test.describe('Real Android Chrome', () => {
  test('open Demo Web Shop on a real Android device', async () => {
    const devices = await android.devices();

    expect(
      devices.length,
      'No authenticated Android device was found through ADB'
    ).toBeGreaterThan(0);

    const device = devices[0];

    console.log(`Android model: ${device.model()}`);
    console.log(`Android serial: ${device.serial()}`);

    try {
      const context = await device.launchBrowser({
        baseURL: 'https://demowebshop.tricentis.com',
      });

      const pages = context.pages();
      const page = pages[0] ?? await context.newPage();

      await page.goto('/');

      await expect(page).toHaveTitle(/Demo Web Shop/i);
      await expect(page.locator('body')).toBeVisible();
    } finally {
      await device.close();
    }
  });
});