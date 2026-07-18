import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: "./tests/real-android",
    testMatch: '**/*.spec.ts',
    timeout: 5 * 60 * 1000,
    workers: 3,
    projects: [
          {
            name: 'Real Android',
        },
    ],
    reporter: [
        ['html'],
        ['allure-playwright']
    ],
    retries: process.env.CI ? 1 : 0,
    use: {
        baseURL: 'https://demowebshop.tricentis.com',
        actionTimeout: 5 * 1000,
        trace: 'on-first-retry',
        video: 'on-first-retry',
        screenshot: 'only-on-failure'
    }
})