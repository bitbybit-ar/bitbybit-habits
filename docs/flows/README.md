# BitByBit Habits - Application Flows

Visual documentation of every major flow in the application using Mermaid diagrams.
Organized by domain for easy navigation.

## Lightning & Payments

| Flow | Description |
|------|-------------|
| [Payment Cascade](./payment-cascade.md) | The core flow: sponsor approves habit, 3-tier payment (WebLN, NWC, QR) |
| [Lightning Basics](./lightning-basics.md) | What are invoices, BOLT11, preimages, NWC, and how BitByBit uses them |
| [Wallet Connection](./wallet-connection.md) | How users connect wallets and how NWC URLs are encrypted (AES-256-GCM) |
| [Invoice Modal](./invoice-modal.md) | QR code fallback with 4-second polling for payment settlement |
| [Payment Retry](./payment-retry.md) | Retry logic for failed payments, expired invoice detection |

## Authentication

| Flow | Description |
|------|-------------|
| [Registration & Login](./auth.md) | Rate limiting, password hashing, account lockout, role detection |
| [Two-Factor Auth](./two-factor-auth.md) | TOTP setup, QR code, recovery codes, validation flow |

## Families & Habits

| Flow | Description |
|------|-------------|
| [Family Management](./family-management.md) | Create family, join with invite code, leave, change roles |
| [Habit Lifecycle](./habit-lifecycle.md) | Create habits, assign to kids, schedule types, verification types |
| [Habit Completion](./habit-completion.md) | Kid completes habit, self-verify vs sponsor approval, notifications |

## Dashboard & Data

| Flow | Description |
|------|-------------|
| [Notifications](./notifications.md) | Event-driven notifications, types, read/unread management |
| [Stats & Streaks](./stats-and-streaks.md) | Sats earned, streak calculation, pending completions |

## Overview

| Flow | Description |
|------|-------------|
| [Complete User Journey](./user-journey.md) | End-to-end overview from registration to earning sats |
