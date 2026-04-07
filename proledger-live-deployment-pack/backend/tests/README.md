# Backend Test Plan

Recommended test coverage:

## Unit tests
- auth service
- accounting posting service
- numbering service
- period service
- inventory valuation service
- reconciliation matching service

## Integration tests
- login endpoint
- invoice posting
- bill posting
- payment posting
- inventory issue/receipt
- approval flow
- period close blocking
- bank transaction import/match/clear

## E2E tests
- user logs in
- creates invoice
- posts payment
- checks report
- imports bank statement
- matches transaction
