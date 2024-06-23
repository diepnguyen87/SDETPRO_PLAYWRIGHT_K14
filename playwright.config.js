import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: "./tests/Day25",
    timeout: 5 * 60 * 1000,
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    reporter: [
        ['html'],
        ['allure-playwright']
    ],
    // retries: process.env.CI ? 2 : 1,
    use: {
        baseURL: 'https://demowebshop.tricentis.com',
        actionTimeout: 5 * 1000,
        trace: 'on-first-retry',
        video: 'on-first-retry',
        screenshot: 'only-on-failure'
    }
})