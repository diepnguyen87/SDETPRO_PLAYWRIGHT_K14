#!/bin/sh

rm -rf /app/allure-results/*
rm -rf /app/playwright-report/*

yarn test:smoke

allure generate /app/allure-results -o /app/allure-report