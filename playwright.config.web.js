import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import { testEnv, envConfig } from './config/environment.config.js'

dotenv.config({ path: `.env.${testEnv}`, quiet: true });

export default defineConfig({
    testDir: "./tests/web",
    testMatch: '**/*.spec.ts',
    timeout: 60 * 1000,
    workers: 5,
    projects: [
        {
            name: 'Desktop Chromium',
            use: { ...devices['Desktop Chrome'] },
            workers: 1,
        },
        {
            name: 'Desktop Firefox',
            use: { ...devices['Desktop Firefox'] },
            default: false,
            workers: 1,
        },
        {
            name: 'Desktop Webkit',
            use: { ...devices['Desktop Safari'] },
            default: false,
            workers: 1,
        },
        {
            name: 'Mobile Safari',
            use: {
              ...devices['iPhone 14'],
            },
            default: false,
            workers: 1,
          },
          {
            name: 'Mobile Chrome',
            use: {
              ...devices['Pixel 6'],
            },
            default: false,
            workers: 1,
          }
    ],
    reporter: [
        ['html'],
        ['allure-playwright']
    ],
    retries: process.env.CI ? 1 : 0,
    use: {
        baseURL: envConfig.baseURL,
        actionTimeout: 5 * 1000,
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure'
    }
})