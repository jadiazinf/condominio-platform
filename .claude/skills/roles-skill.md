Role and permission definitions for La Torre App, a condominium management SaaS platform. Use this skill whenever working on authorization, access control, UI rendering by role, API route protection, middleware, or any feature that depends on user roles. Triggers include any mention of roles, permissions, SUPERADMIN, ADMIN, ACCOUNTANT, USER, SUPPORT, RBAC, or access control in the context of La Torre App.

# La Torre App — Role & Permission System

## Architecture Overview

La Torre App operates on TWO distinct levels. Never mix them.

### Level 1: Platform (La Torre App company)

- Managed by: SUPERADMIN
- Scope: the entire SaaS platform
- Concerns: onboarding management companies, subscriptions, billing, platform health, support tickets from admins

### Level 2: Condominium (Client organizations)

- Managed by: ADMIN, ACCOUNTANT, SUPPORT
- Used by: USER (residents)
- Scope: a single condominium or management company
- Concerns: fees, payments, properties, residents, common areas, maintenance, financials

## Role Definitions

### SUPERADMIN

**Level:** Platform
**Who:** La Torre App team (the developer/owner of the SaaS)
**Purpose:** Platform administration and support

**Can do:**

- Manage management companies (CRUD, activate/deactivate)
- Manage platform subscriptions and billing
- View platform-wide metrics and analytics (MRR, churn, active users, total condominiums)
- Access support dashboard (tickets from ADMIN users)
- Manage platform configuration (plans, pricing, feature flags)
- Impersonate ADMIN users for debugging (with audit log)
- View system logs and health monitoring

**Cannot do:**

- View or manage condominium-specific data (fees, payments, expenses, amenities, reservations)
- Create fees or charges
- Register payments
- Manage properties or residents directly
- Access financial reports of a specific condominium
- Manage amenities or common areas

**UI:** Platform dashboard with: management companies list, subscription status, platform metrics, support tickets, system health. NO condominium operational modules.

---

### ADMIN

**Level:** Condominium
**Who:** The management company administrator or condominium board president
**Purpose:** Full operational management of one or more condominiums

**Can do:**

- Manage properties (apartments, houses, parking, storage units)
- Manage residents and owners (CRUD, assign to properties)
- Create and manage fee structures (ordinary, extraordinary, special assessments)
- Generate fee periods and charges
- Register and verify payments (manual and bank integration)
- Reconcile payments with bank (C2P integration)
- Manage expenses and suppliers
- Manage common areas and amenities
- Configure reservation rules for amenities
- View and generate financial reports (income, expenses, balance, delinquency)
- Manage announcements and communications to residents
- Handle support requests from residents
- Manage condominium settings and configuration
- Invite and manage ACCOUNTANT and SUPPORT users

**Cannot do:**

- Access platform-level settings
- Manage other management companies
- Modify subscription or billing
- Access platform metrics

**UI:** Condominium dashboard with: properties, residents, fees, payments, expenses, amenities, reports, announcements, settings.

---

### ACCOUNTANT

**Level:** Condominium
**Who:** Accountant or financial manager hired by the management company
**Purpose:** Financial operations and reporting

**Can do:**

- View properties and residents (read-only)
- Create and manage fee structures
- Generate fee periods and charges
- Register and verify payments
- Reconcile payments with bank
- Manage expenses and suppliers
- View and generate financial reports
- Export financial data

**Cannot do:**

- Manage properties or residents (create, edit, delete)
- Manage amenities or common areas
- Send announcements
- Manage condominium settings
- Invite or manage other users

**UI:** Financial-focused dashboard with: fees, payments, expenses, reports, bank reconciliation. Properties and residents visible as read-only reference.

---

### SUPPORT

**Level:** Condominium
**Who:** Staff member of the management company or condominium (receptionist, maintenance coordinator)
**Purpose:** Resident support and operational requests

**Can do:**

- View properties and residents (read-only)
- View fee status per property (read-only, to answer resident inquiries)
- Manage support tickets and requests from residents
- Manage maintenance requests
- Manage amenity reservations
- Send announcements and notifications
- View common areas and amenities

**Cannot do:**

- Create or modify fees
- Register or modify payments
- Manage expenses
- View financial reports
- Manage properties or residents (create, edit, delete)
- Manage condominium settings
- Invite or manage other users

**UI:** Support dashboard with: tickets, maintenance requests, reservations, announcements. Fee status visible as read-only for answering resident questions.

---

### USER

**Level:** Condominium
**Who:** Resident, owner, or tenant of a property
**Purpose:** View personal financial status, make payments, interact with management

**Can do:**

- View own property information
- View own fees and payment history
- Make payments (through integrated payment methods)
- View payment receipts
- Reserve amenities (subject to rules set by ADMIN)
- Submit support tickets and requests
- View announcements
- Update own profile information

**Cannot do:**

- View other residents' information or financial data
- Manage any condominium settings
- Create fees or charges
- View condominium-wide financial reports
- Manage properties

**UI:** Resident portal with: my fees, my payments, my property, amenity reservations, support tickets, announcements, profile.

## Implementation Rules

1. **Route protection:** Every API route must check role before executing. Use middleware, not inline checks.
2. **UI rendering:** Show/hide navigation items and UI sections based on role. Never show a module the role cannot access.
3. **SUPERADMIN isolation:** SUPERADMIN routes and UI are completely separate from condominium routes. They share NO operational modules. The SUPERADMIN dashboard is a different app section, not a "super version" of the ADMIN dashboard.
4. **Data scoping:** ADMIN, ACCOUNTANT, SUPPORT, and USER only see data from their assigned condominium(s). Never leak cross-condominium data.
5. **Role hierarchy within condominium:** ADMIN > ACCOUNTANT/SUPPORT > USER. ADMIN can do everything ACCOUNTANT and SUPPORT can do, plus more.
6. **SUPERADMIN is NOT above ADMIN in the condominium context.** SUPERADMIN operates at platform level. ADMIN operates at condominium level. They are parallel, not hierarchical.
