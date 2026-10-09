import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: "./tests/web",
    testMatch: '**/*.spec.ts',
    timeout: 60 * 1000,
    workers: 5,
    projects: [
        {
            name: 'Desktop Chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'Desktop Firefox',
            use: { ...devices['Desktop Firefox'] },
            default: false,
        },
        {
            name: 'Desktop Webkit',
            use: { ...devices['Desktop Safari'] },
            default: false,
        },
        {
            name: 'Mobile Safari',
            use: {
              ...devices['iPhone 14'],
            },
            default: false,
          },
          {
            name: 'Mobile Chrome',
            use: {
              ...devices['Pixel 6'],
            },
            default: false,
          }
    ],
    reporter: [
        ['html'],
        ['allure-playwright']
    ],
    retries: process.env.CI ? 1 : 0,
    use: {
        baseURL: 'https://demowebshop.tricentis.com',
        actionTimeout: 5 * 1000,
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure'
    }
})