# Deals by Anas — Dealership Management System

A full-stack dealership management application designed to manage the daily operations of a second-hand two-wheeler business.

## Overview

Deals by Anas is a web application built to organize vehicle inventory, purchases, sales, customer records, expenses, documentation, and dealership reporting in one place.

The project demonstrates the development of a database-backed business management system using modern web technologies.

## Features

* **Dashboard:** View dealership information and operational summaries.
* **Inventory Management:** Maintain vehicle records, specifications, purchase prices, and status.
* **Customer Management:** Organize buyer and seller information.
* **Purchase Management:** Record vehicle purchases and seller details.
* **Sales Management:** Track vehicle sales, amounts received, outstanding balances, and estimated profit.
* **Expense Management:** Record and categorize dealership expenses.
* **Spare Parts:** Manage stock quantities and low-stock alerts.
* **Invoices and Receipts:** Create and print vehicle sales invoices.
* **Documents:** Track vehicle-related documents and their statuses.
* **RC & NOC Tracking:** Monitor registration certificate and no-objection certificate progress.
* **Leads and Follow-ups:** Manage potential customers and follow-up activities.
* **Reports:** Review dealership activity and export report data.
* **Authentication:** Protect application pages behind a login.
* **Business Settings:** Configure dealership information and invoice preferences.

## Technology Stack

* **Frontend:** Next.js, React, TypeScript
* **Styling:** Tailwind CSS
* **Backend and Database:** Supabase, PostgreSQL
* **Authentication:** Supabase Auth
* **Version Control:** Git and GitHub
* **Deployment:** Vercel (planned or deployed, depending on current status)

## Getting Started

### Prerequisites

* Node.js
* npm
* A Supabase project

### Installation

Clone the repository:

```bash
git clone https://github.com/himanshujitjai-ds/deals-by-anas.git
cd deals-by-anas
```

Install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root and add your own Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Replace the placeholder values with credentials from your own Supabase project.

### Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Security Notes

* Never commit `.env.local` or other files containing secrets.
* Use appropriate Supabase Row Level Security (RLS) policies.
* Do not use real customer information or production credentials in public demonstrations.
* Review access controls before deploying the application for business use.

## Project Status

The core dealership management modules have been implemented and tested by the developer. Deployment and production readiness should be verified against the target environment.

## Author

**Himanshu Thakur**

Developed as a practical full-stack project focused on solving operational problems in a second-hand vehicle dealership.
