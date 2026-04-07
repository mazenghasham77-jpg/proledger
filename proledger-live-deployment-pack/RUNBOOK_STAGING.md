# Staging Runbook

## 1. Prepare
- create staging database
- set backend and frontend environment variables
- build containers
- deploy frontend and backend
- run migrations

## 2. Bootstrap
- create first admin user
- seed chart of accounts and company settings
- confirm numbering sequences
- confirm accounting period exists

## 3. Functional checks
- login works
- dashboard loads
- invoice can be created
- bill can be created
- inventory movement updates balances
- report endpoints load
- approval endpoints work
- bank import works
- health endpoint returns ok

## 4. Exit criteria
- no blocking errors
- accounting entries balanced
- no broken routes
- PDFs and emails either configured or intentionally disabled
