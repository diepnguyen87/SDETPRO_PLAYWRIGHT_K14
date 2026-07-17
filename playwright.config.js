import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: "./tests",
    testMatch: '**/*.spec.ts',
    timeout: 5 * 60 * 1000,
    workers: 3,
    projects: [
        {
            name: 'Desktop Chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'Desktop Firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'Desktop Webkit',
            use: { ...devices['Desktop Safari'] },
        },
        {
            name: 'Mobile Safari',
            use: {
              ...devices['iPhone 14'],
            },
          },
          {
            name: 'Mobile Chrome',
            use: {
              ...devices['Pixel 6'],
            },
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