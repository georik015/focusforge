# Vanguard Clothier ERP - Developer Guide

This is an Enterprise-Grade Operational Platform for Tier-1 Retail.

## Operational Philosophy
The system is built for high-density, real-time retail operations. It prioritizes data integrity, keyboard-driven POS speed, and strict warehouse audit trails.

## Tech Stack
- **Frontend**: React 18, Tailwind CSS 4, Lucide Icons, Recharts, Framer Motion.
- **Backend**: Node.js/Express with TypeScript.
- **Database**: Prisma ORM with SQLite (Current) / PostgreSQL ready.
- **Security**: JWT-based Authentication with Bcrypt password hashing.

## Production Credentials
- **Admin Email**: `admin@vanguard.com`
- **Admin Password**: `admin123`

## Architecture Highlights
1. **Transaction Integrity**: Sales are processed within Prisma `$transaction` blocks to ensure atomic stock updates. All fiscal events are logged to the `ActivityLog`.
2. **Industrial UX**: Uses a high-density "Retail Grid" design for performance in high-volume environments.
3. **Role Based Access**:
   - `ADMIN`: Global Audit, Financial Reporting, System Configurations.
   - `SELLER`: Standard POS Operations, Shift Management.
   - `STOREKEEPER`: Logistics, Inventory Audit, Supplier Movements.

## Performance
- **Dashboard**: Real-time sales aggregation using indexed Prisma queries.
- **POS**: Optimized for keyboard input and barcode scanners.
- **Audit**: Every action that modifies financial or stock state is immutably logged.
