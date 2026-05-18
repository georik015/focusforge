# Vanguard Clothier ERP - Enterprise Documentation

## 1. System Overview
Vanguard Clothier ERP is a production-grade retail management system designed for clothing stores. It provides a unified interface for POS, Inventory, Warehouse Management, and Financial Analytics.

## 2. Core Modules

### 2.1 POS (Point of Sale)
- **Real-time Terminal**: Supports barcode scanning and manual search.
- **Offline Mode**: Automatically queues sales if the internet connection is lost.
- **Shift Management**: Z-Reports for opening and closing cash drawers.
- **Loyalty Integration**: Customer tracking and point accumulation.

### 2.2 Inventory Management
- **Matrix Variations**: Track items by Size and Color.
- **SKU Intelligence**: Automated SKU generation and management.
- **Low Stock Alerts**: Real-time monitoring of depletion levels.

### 2.3 Warehousing
- **Multi-Store Support**: Manage multiple warehouses and transfers.
- **Movements Audit**: Every stock change is logged with a reason code.

### 2.4 Financials & Analytics
- **P&L Reporting**: Gross revenue vs. net profit.
- **Expense Tracking**: Opex and COGS management.
- **AI Intelligence**: Predictive restocking and sales forecasting.

## 3. Security Architecture
- **JWT Authentication**: Secure stateless sessions.
- **Bcrypt Hashing**: Industry-standard password protection.
- **Rate Limiting**: Brute-force protection on all API endpoints.
- **Audit Logging**: Every sensitive action (login, sales, deletions) is logged in the `ActivityLog` table.
- **Role-Based Access Control (RBAC)**:
  - `ADMIN`: Full system access.
  - `STOREKEEPER`: Inventory and Supplies only.
  - `SELLER`: POS and Dashboard only.

## 4. Technical Stack
- **Frontend**: React 18, Tailwind CSS, Framer Motion.
- **Backend**: Node.js/Express (TypeScript).
- **Database**: SQLite (Development) / PostgreSQL (Production) via Prisma ORM.
- **Localization**: Full i18next support (English, Russian).

## 5. Support & Maintenance
For system support, contact the Technical Hub at `support@vanguard.com`.
Built with 🖤 for Modern Retail.
