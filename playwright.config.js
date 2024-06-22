import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: "./tests",
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    reporter:  [
        ['html'],
        ['allure-playwright']
    ],
        // retries: process.env.CI ? 2 : 1,
    use: {
        actionTimeout: 5 * 1000,
        trace: 'on-first-retry',
        video: 'on-first-retry',
        screenshot: 'only-on-failure'
    }
})