# Tenant Management Module -- Feature Inventory

**Date extracted**: 2026-04-15
**Source files**:
- `src/pages/super-admin/TenantManagement.jsx` (main component, 913 lines)
- `src/pages/super-admin/TenantManagement.backup.jsx` (backup, not routed)
- `src/data/mockData.js` (mock tenant data, subscription plans)
- `src/components/StatCard.jsx`, `Badge.jsx`, `Table.jsx`, `Modal.jsx`, `PageHeader.jsx`, `Toast.jsx` (shared components)
- `backend/src/routes/tenants.ts` (backend API routes)
- `src/pages/super-admin/Dashboard.jsx` (cross-references tenant data)
- `src/components/Sidebar.jsx` (navigation entry)
- `src/pages/org-admin/ClientsPage.jsx` (org-admin-level client management, separate module)

---

## SUPER ADMIN TENANT MANAGEMENT

### Tenant List / Overview -- `/super-admin/tenants`
**File**: `src/pages/super-admin/TenantManagement.jsx` (lines 325-398)

**UI Elements**:
- Page header: Building2 icon + "Tenant Management" title (DM Serif Display serif font, 22px)
- Subtitle text: "Manage organisations, plans, and access across the platform" (13px, muted)
- "Add Tenant" button (navy bg, white text, UserPlus icon, top-right)
- Horizontal divider line below header
- 4x StatCard row (grid-cols-4 gap-4):
  - StatCard: Building2 icon, `totalOrgs` value, "Total Orgs" label
  - StatCard: CheckCircle icon, `activeOrgs` value, "Active" label
  - StatCard: AlertTriangle icon, `suspendedOrgs` value, "Suspended" label
  - StatCard: DollarSign icon, `$${totalMRR.toLocaleString()}` value, "MRR" label, gold accent border
- Filter bar (flex row, gap-4):
  - Search input: text input, placeholder "Search organisations...", flex-1 width
  - Plan dropdown: options "All", "Free", "Professional", "Team", "Enterprise"
  - Status dropdown: options "All", "Active", "Suspended"
  - "Export CSV" button (Download icon, border style, disabled when filtered.length === 0, opacity 0.6 when disabled)
  - "Showing {n} organisations" count label (text-muted)
- Table component with columns: Organisation, Plan, Users, Workspaces, Documents, Status, Created, Actions
  - Each row: clickable (opens org detail slide-over), hover highlight (ice-warm bg)
  - Organisation: text, font-medium
  - Plan: Badge component with plan name variant
  - Users: plain number
  - Workspaces: plain number
  - Documents: plain number
  - Status: Badge component (Active = green, Suspended = red)
  - Created: date string, text-muted
  - Actions column (click stopPropagation):
    - View button (Eye icon, opens detail slide-over)
    - Edit button (Edit3 icon, opens edit modal)
    - Suspend/Reactivate toggle button (Ban icon red if Active, CheckCircle icon green if Suspended)
- Empty state when filtered.length === 0: Search icon (24px, opacity 0.4), "No organisations found", "Try adjusting your search or filters."

**User Actions**:
- Type in search input to filter by org name (case-insensitive substring match)
- Select plan filter dropdown to filter by plan
- Select status filter dropdown to filter by status
- Click "Export CSV" to download CSV file of all tenants (not just filtered)
- Click "Add Tenant" button to open Add Tenant slide-over
- Click any table row to open Org Detail slide-over
- Click Eye icon to open Org Detail slide-over
- Click Edit3 icon to open Edit Tenant modal
- Click Ban/CheckCircle icon to toggle tenant status inline (no confirmation)
- Focus/blur on search input changes border color (navy on focus, border on blur)

**Validation Rules**:
- Export CSV button disabled when `filtered.length === 0`
- Search is case-insensitive substring match on `t.name`

**API Calls**:
- None. All data is from mock `initialTenants` merged with `localStorage` key `yourai_mgmt_tenants`

**Mocks/Hardcoded**:
- `initialTenants` from mockData.js: 8 orgs (IDs 1-8)
  - id:1, "Hartwell & Associates", Team, 5 users, 4 workspaces, 46 docs, Active, Jan 12 2026, mrr:1495, planPrice:299, billedSince:"Jan 12, 2026", nextRenewal:"May 1, 2026", paymentStatus:"Paid"
  - id:2, "Morrison Legal Group", Professional, 3 users, 7 ws, 128 docs, Active, Jan 28 2026, mrr:447, planPrice:149, paymentStatus:"Paid"
  - id:3, "Chen Partners LLC", Enterprise, 12 users, 15 ws, 340 docs, Active, Feb 3 2026, mrr:7188, planPrice:599, paymentStatus:"Paid"
  - id:4, "Rivera & Kim LLP", Free, 1 user, 2 ws, 12 docs, Active, Feb 14 2026, mrr:0, planPrice:0, nextRenewal:"-", paymentStatus:"N/A"
  - id:5, "Patel Law Office", Professional, 2 users, 3 ws, 67 docs, Active, Feb 20 2026, mrr:298, planPrice:149, paymentStatus:"Paid"
  - id:6, "Thornton Compliance", Team, 8 users, 6 ws, 210 docs, Suspended, Mar 1 2026, mrr:2392, planPrice:299, paymentStatus:"Failed"
  - id:7, "Goldstein & Webb", Free, 1 user, 1 ws, 8 docs, Active, Mar 15 2026, mrr:0, planPrice:0, nextRenewal:"-", paymentStatus:"N/A"
  - id:8, "Pacific Rim Legal", Professional, 4 users, 5 ws, 95 docs, Active, Mar 22 2026, mrr:596, planPrice:149, paymentStatus:"Paid"
- CSV export filename: `tenants_export.csv`
- CSV header: `Organisation,Plan,Users,Workspaces,Documents,Status,Created,MRR`
- `loadTenants()` merges mockData tenants with localStorage `yourai_mgmt_tenants`, deduplicating by name

**Discrepancies**:
- CSV export exports ALL tenants (`tenantList`), not just `filtered` results. The button is disabled when no results match, but when enabled it exports everything -- misleading UX
- Inline suspend/reactivate toggle (Ban/CheckCircle in Actions column) has NO confirmation dialog, unlike the modal-based suspend which has descriptive warnings
- `totalMRR` is computed from `tenantList` (all tenants), not `filtered` -- this is correct dashboard behavior but note the stat cards always show totals regardless of filters

---

### Edit Tenant Modal
**File**: `src/pages/super-admin/TenantManagement.jsx` (lines 401-450)

**UI Elements**:
- Modal component (480px max-width, 16px border-radius, 28px padding)
- Title: "Edit Tenant"
- Current status indicator bar (ice-warm bg, border):
  - "Current Status:" label (uppercase, 12px)
  - Status Badge (Active/Suspended)
  - Dot separator
  - Plan Badge (e.g. "Team Plan")
- Organisation Name input:
  - Label: "Organisation Name *" (12px, font-weight 500)
  - Text input, full width, pre-filled with current name
- Button row (flex, justify-end, gap-3):
  - "Cancel" button (border style, white bg)
  - "Save Name" button (Save icon, navy bg, white text)
    - Disabled (gray #94A3B8) when name is empty or unchanged
- Divider line
- Suspend / Reactivate section (colored panel):
  - If Active: red-tinted panel (#FEF2F2 bg, #FEE2E2 border)
    - Title: "Suspend Organisation" (uppercase, red)
    - Warning text: "Suspending this organisation will immediately block all user access. No users from this organisation will be able to log in, access documents, or run workflows until the organisation is reactivated."
    - AlertTriangle icon + "This will affect {n} user(s)" text
    - "Suspend & Block Access" button (Ban icon, #991B1B bg)
  - If Suspended: green-tinted panel (#F0FDF4 bg, #DCFCE7 border)
    - Title: "Reactivate Organisation" (uppercase, green)
    - Text: "Reactivating this organisation will restore access for all users. They will be able to log in and resume using the platform immediately."
    - AlertTriangle icon + "All users will regain access" text
    - "Reactivate & Restore Access" button (CheckCircle icon, #166534 bg)

**User Actions**:
- Click backdrop or X to close modal
- Type in Organisation Name input
- Click "Cancel" to close
- Click "Save Name" to rename org and close modal (shows toast: `Organisation renamed to "{name}"`)
- Click "Suspend & Block Access" / "Reactivate & Restore Access" to toggle status and close modal (shows toast with status message)

**Validation Rules**:
- "Save Name" button disabled when `editForm.name` is empty (trimmed) OR equals the original org name
- No length validation on org name
- No duplicate name check

**API Calls**:
- None. State updates are local (`setTenantList`)

**Mocks/Hardcoded**:
- Toast messages: `Organisation renamed to "{editForm.name}"`, `{name} suspended. All user access has been blocked.`, `{name} reactivated. User access has been restored.`

**Discrepancies**:
- No duplicate org name validation -- user can rename an org to the same name as another existing org
- No maximum length on org name field
- Only the org name is editable -- no ability to edit plan, industry, or other fields from this modal

---

### Org Detail Slide-over (View Tenant)
**File**: `src/pages/super-admin/TenantManagement.jsx` (lines 452-661)

**UI Elements**:
- Full-screen overlay (rgba(0,0,0,0.4) + blur(4px))
- Right-side panel (480px max-width, white bg, full height, overflow-y auto)
- Sticky header:
  - Org name (DM Serif Display, 18px)
  - Plan Badge
  - Status Badge
  - X close button (hover bg-gray-100)
- Tab bar with 4 tabs: overview, users, workspaces, usage
  - Active tab: navy text, gold bottom border (2px)
  - Inactive tab: #718096 text, transparent border

#### Overview Tab
- "Edit Organisation Details" button (full width, border style, Edit3 icon)
- Subscription card (bordered panel):
  - "Subscription" label (uppercase, muted)
  - Plan row: label + plan Badge
  - Price per user: `$X/month` or "Free"
  - Active seats: `{n} users`
  - Monthly total: `${mrr.toLocaleString()}/month`
  - Divider
  - Billing since: date string
  - Next renewal: date string
  - Payment status: Badge (Paid/Pending/Failed/N/A)
- General info grid (2 cols):
  - Status value
  - Created date
  - Stripe ID (from orgContacts or "---")
  - Workspaces count
- Contact card (bordered):
  - "Contact" label
  - Admin name
  - Admin email
- Danger Zone / Reactivate panel (same colored panel pattern as Edit Modal):
  - "Suspend & Block Access" or "Reactivate & Restore Access" button
  - Warning text with user count

#### Users Tab
- Search input: placeholder "Search users...", full width
- Table: columns Name, Role, Status, (action)
  - Name cell: name (font-medium) + email (muted, below)
  - Role: colored badge using roleColors map
    - Admin: navy bg, white text
    - Internal User: #EFF6FF bg, #1D4ED8 text
    - Client: #F0FDF4 bg, #166534 text
    - Invited: #FEF3C7 bg, #92400E text
  - Onboarding role (italic, 11px, muted) shown below role badge if present
  - Status: Active (green), Invited (yellow), other (red)
  - Action column: Lock/Unlock button (not for Invited users)
    - Active users: Lock icon (#991B1B), title "Block"
    - Non-active non-invited: Unlock icon (#166534), title "Unblock"
- Empty state: Users icon + "No users match your search" or "No users yet"

#### Workspaces Tab
- Table: columns Workspace, Members, Docs, Created, Status
  - Status shown as green badge
- Empty state: Building2 icon + "No workspaces yet"

#### Usage Tab
- UsageBar component (custom inline component):
  - 3 bars: Documents, Workflow Runs, Knowledge Packs
  - Each shows: label, `{used} / {limit}` or `{used} / infinity symbol`
  - Progress bar with color coding:
    - Green (#166534) when <= 50%
    - Amber (#92400E) when 50-80%
    - Red (#991B1B) when > 80%
  - Unlimited limits (>= 99999) show as 25% fill with infinity display
  - Workflow runs are calculated as `Math.round(selectedOrg.documents * 0.3)`
  - Knowledge packs: `Math.min(selectedOrg.workspaces, limits.kpacks)`

**User Actions**:
- Click X or overlay background to close slide-over (note: overlay click does NOT close -- no onClick handler on overlay div)
- Switch between tabs (overview, users, workspaces, usage)
- Click "Edit Organisation Details" to open Edit modal
- Click Suspend/Reactivate button (updates status, shows toast)
- Type in user search to filter users by name or email
- Click Lock/Unlock button on individual users (button exists but NO handler attached -- non-functional)

**Validation Rules**:
- User search: case-insensitive substring match on name or email

**API Calls**:
- None. All data from local mock objects and localStorage

**Mocks/Hardcoded**:
- `orgUsers` map (keyed by tenant ID):
  - ID 1 (Hartwell): 5 users (Ryan Melade Admin, Sarah Chen Internal, James Wu Internal, Maria Torres Client, Tom Bradley Internal/Invited)
  - ID 2 (Morrison): 3 users (David Park Admin, Lisa Wong Internal, Amy Nguyen Client)
  - Other IDs: not defined (falls back to dynamicUsers from localStorage or contact info)
- `orgWorkspaces` map:
  - ID 1 (Hartwell): 4 workspaces (Commercial Contracts, Litigation Support, Client Intake, Compliance)
  - Other IDs: not defined (falls back to default workspace using org data)
- `orgContacts` map (IDs 1-8):
  - ID 1: admin "Ryan Melade", email "ryan@hartwell.com", stripeId "cus_Qk8mN2vXpL"
  - ID 2: admin "David Park", email "david@morrison.com", stripeId "cus_Rm3kP7wYqN"
  - ID 3: admin "Jennifer Chen", email "jen@chenpartners.com", stripeId "cus_Sn4lR8xZrO"
  - ID 4: admin "Mark Rivera", email "mark@riverakim.com", stripeId null
  - ID 5: admin "Raj Patel", email "raj@patel.com", stripeId "cus_Up6nT0zBtQ"
  - ID 6: admin "David Thornton", email "david@thornton.com", stripeId "cus_Vq7oU1aCuR"
  - ID 7: admin "Nathan Gold", email "nathan@goldsteinwebb.com", stripeId null
  - ID 8: admin "Karen Tanaka", email "karen@pacificrim.com", stripeId "cus_Xs9qW3cEwT"
- `planLimits` map:
  - Free: docs 50, workflows 10, kpacks 1
  - Professional: docs 500, workflows 100, kpacks 3
  - Team: docs 2000, workflows 500, kpacks 10
  - Enterprise: docs 99999, workflows 99999, kpacks 99999
- `roleColors` map: Admin (navy/white), Internal User (blue), Client (green), Invited (amber)
- Workflow runs usage is FABRICATED: `Math.round(selectedOrg.documents * 0.3)` -- not real data
- Knowledge packs usage is FABRICATED: `Math.min(selectedOrg.workspaces, limits.kpacks)` -- not real data
- Default workspace fallback: `{ name: 'Default Workspace', members: selectedOrg.users, documents: selectedOrg.documents, created: selectedOrg.created, status: 'Active' }`
- Dynamic user fallback: reads from localStorage key `yourai_mgmt_users`

**Discrepancies**:
- Slide-over overlay does NOT have an onClick to close (unlike the Add Tenant slide-over which does)
- Lock/Unlock buttons in Users tab have NO click handler -- they render but are non-functional
- Usage tab fabricates workflow runs and knowledge pack counts from document/workspace counts instead of tracking actual usage
- Only org IDs 1 and 2 have detailed mock users; only org ID 1 has detailed mock workspaces
- The "Edit Organisation Details" button inside the slide-over opens the same Edit Modal used from the table -- the detail view itself is read-only

---

### Add Tenant Slide-over (Create Tenant)
**File**: `src/pages/super-admin/TenantManagement.jsx` (lines 663-908)

**UI Elements**:
- Full-screen overlay (rgba(15,23,42,0.4)) -- clicking overlay closes slide-over
- Right-side panel (520px max-width, white bg, full height, flex column)
- Sticky header:
  - Title: "Add New Tenant" (or "Invitation Sent" on success)
  - X close button
  - Subtitle: "Onboard a new organisation. The admin will receive an email invitation to set up their account."
  - 3-step progress indicator:
    - Step circles: completed (green bg with checkmark), current (navy bg, white text), future (ice bg, muted text)
    - Step labels: "Organisation", "Admin User", "Review & Invite"
    - Connecting lines between steps (green when completed, border color when not)

#### Step 1: Organisation
- Info banner (blue left border, #EFF6FF bg):
  - Info icon (blue)
  - "Each tenant is an independent organisation with its own workspaces, users, documents, and billing."
- Organisation Name input:
  - Label: "Organisation Name *"
  - Placeholder: "e.g. Hartwell & Associates"
- 2-column grid:
  - Subscription Plan dropdown:
    - Label: "Subscription Plan"
    - Options: Free, Professional, Team, Enterprise
    - Default: "Professional"
  - Industry dropdown:
    - Label: "Industry"
    - Options: Legal Services, Corporate Legal, Compliance & Risk, Financial Services, Healthcare, Other
    - Default: "Legal Services"
- Plan summary card (ice-warm bg, bordered):
  - "Plan Includes" label
  - Bullet list varies by plan:
    - Free: "1 user", "50 docs/mo", "10 workflow runs", "1 knowledge pack"
    - Professional: "Up to 3 users", "500 docs/mo", "100 workflow runs", "5 knowledge packs"
    - Team: "Up to 10 users", "2,000 docs/mo", "500 workflow runs", "20 knowledge packs"
    - Enterprise: "Unlimited users", "Unlimited docs", "Unlimited workflows", "Unlimited knowledge packs"

#### Step 2: Admin User
- Info banner (blue left border):
  - "This person will be the Organisation Admin -- they can invite other users, create workspaces, and manage billing. They'll receive an email with a link to set their password and access the portal."
- 2-column grid:
  - First Name input: label "First Name *", placeholder "Ryan"
  - Last Name input: label "Last Name *", placeholder "Melade"
- Email Address input:
  - Label: "Email Address *"
  - type="email"
  - Placeholder: "ryan@hartwell.com"
  - Validation message (red): "Please enter a valid email address." (shown when email is non-empty and fails regex)
  - Helper text (muted): "The invitation email will be sent to this address." (shown when email is empty or valid)
- Phone Number input:
  - Label: "Phone Number (optional)"
  - type="tel"
  - Placeholder: "+1 (555) 000-0000"
- "What happens next?" card (bordered):
  - 4 numbered steps:
    1. "Admin receives an email with a secure invitation link"
    2. "They click the link to set their password"
    3. "They log into the Org Admin portal at app.yourai.com"
    4. "They can start creating workspaces and inviting team members"

#### Step 3: Review & Invite
- Summary card (ice-warm bg, bordered, rounded-xl):
  - Organisation section:
    - Name, Plan (Badge), Industry, MRR (shows per-user price)
  - Divider
  - Admin User section:
    - Name, Role ("Organisation Admin"), Email
- Warning banner (amber left border, #FFFBEB bg):
  - AlertTriangle icon
  - "Confirm before sending"
  - "An invitation email will be sent to {email}. The admin will have full access to create workspaces, invite users, and manage their organisation."

#### Success State (inviteSent === true)
- Centered layout:
  - Green checkmark circle (64px, #DCFCE7 bg, CheckCircle icon 32px)
  - "Tenant Created Successfully" heading
  - "{name} has been added to the platform. An invitation has been sent to {email}."
  - Invitation details card:
    - Organisation, Plan (Badge), Admin name, Invite sent to (email), Link expires: "7 days"
  - "Done" button (full width, navy bg)

#### Footer (sticky bottom, shown when not inviteSent)
- "Back" link (left side, only when addStep > 1)
- "Cancel" button (border style)
- "Continue" button with ChevronRight icon (steps 1-2)
  - Disabled (gray) based on step validation
- "Send Invitation" button with Send icon (step 3)

**User Actions**:
- Click overlay background to close slide-over
- Click X to close
- Step 1: type org name, select plan, select industry
- Step 2: type first name, last name, email, phone
- Click "Continue" to advance to next step
- Click "Back" to go to previous step
- Click "Cancel" to close
- Click "Send Invitation" to create tenant
- Click "Done" on success screen to close

**Validation Rules**:
- Step 1 "Continue" disabled when: `newOrg.name.trim()` is empty
- Step 2 "Continue" disabled when: `newAdmin.firstName.trim()` is empty OR `newAdmin.lastName.trim()` is empty OR email fails regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Email inline validation: shows red error when email is non-empty and fails regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Step 3 "Send Invitation": always enabled (no additional validation)
- No duplicate org name check
- No phone number format validation

**API Calls**:
- None. Tenant creation is local state + localStorage persistence

**Mocks/Hardcoded**:
- New tenant ID: `Date.now()`
- New tenant defaults: users:1, workspaces:0, documents:0, status:"Active"
- MRR calculation: Free=0, Professional=149, Team=299, Enterprise=599
- planPrice: same as MRR (single user)
- nextRenewal: empty string `''`
- paymentStatus: "N/A" for Free, "Pending" for paid plans
- Created date: formatted via `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`
- localStorage keys: `yourai_mgmt_tenants` (tenant array), `yourai_mgmt_users` (user array)
- New admin user stored with: role:"Admin", status:"Invited", lastActive:"Never", logins:0, docsUploaded:0, onboardingCompleted:false
- Link expires: hardcoded "7 days" (display only, no actual expiry logic)
- Default plan: "Professional"
- Default industry: "Legal Services"
- Placeholders: "e.g. Hartwell & Associates", "Ryan", "Melade", "ryan@hartwell.com", "+1 (555) 000-0000"
- Plan includes text does NOT match planLimits constant (e.g., Professional shows "5 knowledge packs" but planLimits says 3)
- Toast: `Invitation sent to {email}. {name} has been onboarded.`

**Discrepancies**:
- Plan feature summary in Add Tenant does NOT match `planLimits` constant or `subscriptionPlans` in mockData:
  - Professional shows "5 knowledge packs" in Add Tenant but planLimits says 3, subscriptionPlans says "3 packs (2,500 docs each)"
  - Team shows "20 knowledge packs" in Add Tenant but planLimits says 10, subscriptionPlans says "10 packs (10,000 docs each)"
- No actual email is sent -- the invitation is entirely simulated
- No actual link expiry mechanism despite showing "7 days"
- `nextRenewal` is set to empty string for new tenants (will display blank in detail view)
- Phone number is collected but never stored or used anywhere

---

### Plan Override Modal (REMOVED)
**File**: `src/pages/super-admin/TenantManagement.jsx` (line 910)

**Notes**:
- Line 910 contains comment: `{/* Plan Override Modal removed -- SA cannot change plan or payment data */}`
- State variables for plan override still exist in the component (lines 91-97): `overrideOrg`, `overrideSelectedPlan`, `overrideReason`, `overrideCustomReason`, `overrideNotes`, `overrideEffective`, `overrideError`
- `openPlanOverride` function still exists (lines 101-109)
- `handleApplyPlanChange` function still exists (lines 111-134) with full implementation
- Constants still exist: `PLAN_ORDER = ['Free', 'Professional', 'Team', 'Enterprise']`, `OVERRIDE_REASONS = ['Sales agreement', 'Trial extension', 'Support exception', 'Billing adjustment', 'Partner deal', 'Other']`
- The plan override feature is fully coded but the modal JSX has been removed, leaving dead code

**Discrepancies**:
- Dead code: ~50 lines of state, functions, and constants for plan override feature that is no longer rendered

---

### Dashboard Cross-References -- `/super-admin/dashboard`
**File**: `src/pages/super-admin/Dashboard.jsx`

**Tenant-related UI Elements**:
- "Add Tenant" button in header (navigates to `/super-admin/tenants`)
- "Top Organisations by Revenue" section with "View all" link (navigates to `/super-admin/tenants`)
- Quick action card: "Add Tenant" with description "Onboard a new organisation" (navigates to `/super-admin/tenants`)
- Dashboard stats computed from tenant mock data:
  - totalMRR: sum of all tenants' mrr
  - activeOrgs: count of Active tenants
  - totalUsers: sum of all tenants' users
  - totalDocs: sum of all tenants' documents
  - topOrgs: top 5 tenants sorted by MRR descending

**Discrepancies**:
- Dashboard uses raw `tenants` import from mockData, NOT the `loadTenants()` function that merges localStorage. Tenants created via Add Tenant will NOT appear in dashboard stats until page refresh with re-import.

---

### Sidebar Navigation
**File**: `src/components/Sidebar.jsx`

**UI Elements**:
- Navigation item: "Tenant Management" with Building2 icon, path `/super-admin/tenants`

---

## BACKEND API ROUTES

### `backend/src/routes/tenants.ts`

**Endpoints**:
- `GET /api/tenants` -- List all orgs with user/document/conversation counts (requireAuth)
- `GET /api/tenants/:id` -- Get single org with users list and counts (requireAuth)
- `POST /api/tenants/:id/suspend` -- Set org status to "SUSPENDED" (requireAuth)
- `POST /api/tenants/:id/activate` -- Set org status to "ACTIVE" (requireAuth)

**Notes**:
- Uses Prisma ORM with `prisma.org` model
- Backend uses "SUSPENDED"/"ACTIVE" (uppercase), frontend uses "Suspended"/"Active" (title case)
- No POST /api/tenants for creation (frontend creates tenants locally)
- No PUT/PATCH for editing tenant details
- No DELETE endpoint for tenant deletion
- No plan change endpoint
- requireAuth middleware imported from `../middleware/auth`

**Discrepancies**:
- Frontend does not call any of these API endpoints -- all tenant operations are mocked with local state and localStorage
- Status enum mismatch: backend uses UPPERCASE ("SUSPENDED", "ACTIVE"), frontend uses TitleCase ("Suspended", "Active")

---

## ORG-ADMIN CLIENT MANAGEMENT (Separate Module)

### Clients Page -- `/app/clients`
**File**: `src/pages/org-admin/ClientsPage.jsx`

**Note**: This is a different module -- org-admin level client management (not super-admin tenant management). Included for completeness since files matched "client" search.

**UI Elements**:
- PageHeader: Users icon, "Clients" title, "Manage your client contacts and portal access." subtitle
- PermissionGate: restricted to roles ['Admin', 'Manager']
- Client cards grid (3 columns):
  - Avatar circle (36px, slate bg, initials)
  - Name (14px, medium)
  - Company (12px, muted)
  - Email (12px, muted)
  - Workspace count with Briefcase icon
  - Unread message count with MessageSquare icon (red if > 0)
  - "Last active: {date}" footer
- Client detail view (when selected):
  - Back button with ArrowLeft icon
  - Avatar circle (40px)
  - Name (22px, DM Serif Display)
  - Company + email subtitle
  - Tab bar: Profile, Sessions, Documents, Knowledge Memory
  - Profile tab: key-value rows (Name, Company, Email, Last Active, Unread Messages)
  - Sessions tab: linked workspace cards (3-col grid, name, status badge, created date)
  - Documents tab: Table with columns Document, Type, Uploaded By, Status, Date
  - Knowledge Memory tab: knowledge pack cards (3-col grid) or "No knowledge packs linked to this client yet."

**Mocks/Hardcoded**:
- 3 clients from mockData: David Kim (Acme Corp), Lisa Park (TechStart Inc), Helen Chen (Chen Family Trust)

---

## SHARED COMPONENTS USED BY TENANT SCREENS

### StatCard (`src/components/StatCard.jsx`)
- Props: icon, value, label, accentColor
- White card with border, optional left accent border
- Value in DM Serif Display 28px, label uppercase 12px

### Badge (`src/components/Badge.jsx`)
- Props: children, variant, className
- Preset color mappings for: Free, Professional, Team, Enterprise, Active, Suspended, Invited, Blocked, PDF, DOCX, XLSX, TXT, Ready, Processing, Failed, Paid, Pending, Archived, Draft, Published
- Pill shape (20px radius), 11px font, 500 weight

### Table (`src/components/Table.jsx`)
- Props: columns, children
- White bg, 12px border-radius, shadow
- Header row with uppercase column labels, 11px, 600 weight

### Modal (`src/components/Modal.jsx`)
- Props: open, onClose, title, children
- Fixed overlay (rgba(15,23,42,0.4))
- 480px max-width, 16px radius, 28px padding
- Click outside to close, X button to close

### PageHeader (`src/components/PageHeader.jsx`)
- Props: icon, title, subtitle, actions
- DM Serif Display 22px title with icon, 13px subtitle
- Bottom divider

### Toast (`src/components/Toast.jsx`)
- Context-based toast system
- Green (#166534) bg, white text, CheckCircle icon
- Auto-dismiss: 2500ms visible + 500ms exit animation
- Fixed position bottom-right

---

## FEATURES NOT IMPLEMENTED (Missing from Code)

1. **Delete Tenant** -- No delete functionality exists anywhere. No UI, no handler, no backend endpoint.
2. **Tenant Plan Change by Super Admin** -- Plan Override modal was removed (comment on line 910). Dead code remains but UI is gone. Comment says "SA cannot change plan or payment data."
3. **Real API Integration** -- Frontend is 100% mocked. Backend endpoints exist but are never called.
4. **Tenant Billing History** -- No invoice or payment history view in tenant detail.
5. **Tenant Audit Log** -- An audit log array exists in mockData and state, and `handleApplyPlanChange` adds entries, but there is no UI to display tenant-specific audit entries.
6. **Impersonation** -- No "Login as" or impersonate feature in tenant management (though audit log references "Impersonated Admin").
7. **Bulk Actions** -- No multi-select or bulk suspend/reactivate/export.
8. **Sorting** -- Table columns are not sortable.
9. **Pagination** -- No pagination on tenant list.
10. **Tenant Industry** -- Collected during Add Tenant but never stored on the tenant object or displayed anywhere.

---

## DISCREPANCY SUMMARY TABLE

| # | Severity | Issue |
|---|----------|-------|
| 1 | Medium | Plan feature summary in Add Tenant wizard (Step 1) contradicts both `planLimits` constant and `subscriptionPlans` in mockData (Professional: 5 vs 3 knowledge packs; Team: 20 vs 10 knowledge packs) |
| 2 | Medium | Dead code: ~50 lines of plan override state, functions, and constants remain after modal JSX was removed (line 910 comment confirms intentional removal) |
| 3 | Medium | Lock/Unlock buttons in org detail Users tab have no click handler -- buttons render but are non-functional |
| 4 | Medium | Backend API endpoints exist (`GET /api/tenants`, `GET /api/tenants/:id`, `POST /api/tenants/:id/suspend`, `POST /api/tenants/:id/activate`) but frontend never calls them -- all data is mocked |
| 5 | Low | Status enum mismatch: backend uses UPPERCASE ("SUSPENDED"/"ACTIVE"), frontend uses TitleCase ("Suspended"/"Active") |
| 6 | Low | CSV Export exports ALL tenants regardless of active filters, though the button is disabled when no filter results exist |
| 7 | Low | Inline suspend/reactivate toggle in table Actions column has no confirmation, unlike the modal-based version which has detailed warnings |
| 8 | Low | Org detail slide-over overlay does not close on backdrop click (unlike Add Tenant slide-over which does) |
| 9 | Low | Dashboard uses raw mockData `tenants` import, not `loadTenants()`, so dynamically created tenants don't appear in dashboard stats |
| 10 | Low | Industry field collected during Add Tenant but never stored on tenant object or displayed anywhere |
| 11 | Low | Phone number collected in Add Tenant Step 2 but never stored or used |
| 12 | Low | Usage tab fabricates workflow runs (`documents * 0.3`) and knowledge pack counts (`min(workspaces, limit)`) instead of tracking real data |
| 13 | Low | New tenant `nextRenewal` is set to empty string (displays blank in detail view) |
| 14 | Info | No delete tenant feature exists (no UI, no handler, no backend endpoint) |
| 15 | Info | No pagination or sorting on tenant table |
| 16 | Info | No bulk actions (multi-select) on tenant list |
| 17 | Info | "Link expires: 7 days" is display-only text with no actual expiry mechanism |
| 18 | Info | No tenant-specific audit log viewer (audit log state exists but no UI renders it within tenant management) |
