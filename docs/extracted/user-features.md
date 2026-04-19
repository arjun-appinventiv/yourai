# User Management Module -- Raw Feature Inventory

Extracted: 2026-04-15
Branch: claude/great-banach

---

## Screens Overview

| # | Screen | Route | File |
|---|--------|-------|------|
| 1 | Super Admin -- Platform Users | `/super-admin/users` | `src/pages/super-admin/UserManagement.jsx` |
| 2 | Org Admin -- User Management | `/app/users` | `src/pages/org-admin/OrgUserManagement.jsx` |
| 3 | Org Admin -- My Profile | `/app/profile` | `src/pages/org-admin/ProfilePage.jsx` |
| 4 | Tenant Detail -- Users Tab | (slide-over from `/super-admin/tenants`) | `src/pages/super-admin/TenantManagement.jsx` |
| 5 | Add Tenant -- Admin User Step | (slide-over from `/super-admin/tenants`) | `src/pages/super-admin/TenantManagement.jsx` |
| 6 | Backend -- User API | `/api/users` | `backend/src/routes/users.ts` |

---

### Super Admin -- Platform Users -- `/super-admin/users`
**File**: `src/pages/super-admin/UserManagement.jsx`

**UI Elements**:
- PageHeader with `Users` icon, title "Platform Users", subtitle "View and manage all users across organisations"
- 4x StatCard row: "Total Users" (Users icon), "Active" (UserCheck icon), "Blocked" (UserX icon, accentColor `#991B1B`), "Invited" (Clock icon, accentColor `var(--gold)`)
- Search input with Search icon (16px), placeholder "Search by name or email...", focus border `var(--navy)`
- Organisation filter dropdown (dynamically populated from user data, first option "All", remaining sorted alphabetically)
- Role filter dropdown: options "All", "Admin", "Internal User", "Client"
- Status filter dropdown: options "All", "Active", "Blocked", "Invited"
- "Export CSV" button with Download icon (16px), disabled state when `filtered.length === 0` (color `#94A3B8`, opacity 0.6, cursor `not-allowed`)
- "Showing {N} users" text label
- Table with columns: User, Email, Organisation, Role, Status, Last Active, Actions
- Each table row: user avatar circle (32x32, navy background, white initials), name, email, org name + plan Badge, role badge (styled pill), status badge (styled pill), lastActive text, action buttons
- Action buttons per row: Eye icon "View" button; Ban icon "Block" button (color `#991B1B`) or CheckCircle icon "Unblock" button (color `#166534`) -- Block/Unblock hidden for `Invited` status
- Empty state: Search icon (24px, opacity 0.4), "No users found", "Try adjusting your search or filters."
- User Detail Modal (title "User Details"):
  - Avatar circle (56x56, navy, white initials)
  - Name, email display
  - 2-column info grid: Organisation, Role, Status, Created, Last Active (each in rounded card with `var(--ice-warm)` background)
  - Activity Summary section (bordered card): Total Logins, Docs Uploaded (2-column centered display)
  - Onboarding Profile section (bordered card):
    - If `onboardingCompleted === false`: italic message "This user has not completed onboarding." in ice-warm card
    - If completed: 2x2 grid showing Role, Primary State, Firm Size, Practice Areas (as pill tags with `#F3F4F6` bg / `#374151` color), fallback "Not set"
  - "Block User" button (red `#991B1B` bg) or "Unblock User" button (green `#166534` bg) -- hidden for Invited status
  - "Close" button (bordered, slate color)

**User Actions**:
- Type in search input (filters by name or email, case-insensitive)
- Focus/blur on search input (border color toggles to `var(--navy)` / `var(--border)`)
- Select organisation filter dropdown
- Select role filter dropdown
- Select status filter dropdown
- Click "Export CSV" button (generates and downloads CSV file)
- Hover on table row (background changes to `var(--ice-warm)`, reverts to white on leave)
- Click Eye icon to open User Detail Modal
- Click Ban/CheckCircle icon to toggle block status (shows toast)
- In modal: click "Block User" / "Unblock User" (toggles status, closes modal, shows toast)
- In modal: click "Close" (closes modal)
- Click modal backdrop to close

**Validation Rules**:
- Search filter: case-insensitive `includes()` match on `name` and `email`
- Export CSV disabled when `filtered.length === 0`
- Block/Unblock button hidden for users with status `Invited`

**API Calls**:
- None (fully client-side with mock data + localStorage)

**Mocks/Hardcoded**:
- `initialUsers` array with 10 hardcoded users:
  - id: 1, name: "Ryan Melade", email: "ryan@hartwell.com", org: "Hartwell & Associates", plan: "Team", role: "Admin", status: "Active", lastActive: "Today", created: "Jan 12, 2026", logins: 142, docsUploaded: 38, onboardingCompleted: true, onboardingRole: "Partner / Senior Attorney", onboardingAreas: ["Corporate & M&A", "Litigation"], onboardingFirmSize: "Small Firm", onboardingState: "New York"
  - id: 2, name: "Sarah Chen", email: "sarah@hartwell.com", org: "Hartwell & Associates", plan: "Team", role: "Internal User", status: "Active", lastActive: "Today", created: "Jan 15, 2026", logins: 98, docsUploaded: 22, onboardingCompleted: true, onboardingRole: "Associate / Junior Attorney", onboardingAreas: ["Employment & Labor"], onboardingFirmSize: "Small Firm", onboardingState: "New York"
  - id: 3, name: "James Wu", email: "james@hartwell.com", org: "Hartwell & Associates", plan: "Team", role: "Internal User", status: "Active", lastActive: "Yesterday", created: "Feb 1, 2026", logins: 64, docsUploaded: 15, onboardingCompleted: true, onboardingRole: "Paralegal / Legal Assistant", onboardingAreas: ["Corporate & M&A"], onboardingFirmSize: "Small Firm", onboardingState: "New York"
  - id: 4, name: "Maria Torres", email: "maria@hartwell.com", org: "Hartwell & Associates", plan: "Team", role: "Client", status: "Active", lastActive: "2 days ago", created: "Feb 5, 2026", logins: 45, docsUploaded: 11, onboardingCompleted: true, onboardingRole: "Paralegal / Legal Assistant", onboardingAreas: ["Litigation", "Criminal Defense"], onboardingFirmSize: "Small Firm", onboardingState: "New York"
  - id: 5, name: "Tom Bradley", email: "tom@hartwell.com", org: "Hartwell & Associates", plan: "Team", role: "Internal User", status: "Invited", lastActive: "Never", created: "Mar 28, 2026", logins: 0, docsUploaded: 0, onboardingCompleted: false (no onboarding fields)
  - id: 6, name: "David Park", email: "david@morrison.com", org: "Morrison Legal Group", plan: "Professional", role: "Admin", status: "Active", lastActive: "Today", created: "Jan 28, 2026", logins: 120, docsUploaded: 45, onboardingCompleted: true, onboardingRole: "Partner / Senior Attorney", onboardingAreas: ["Litigation"], onboardingFirmSize: "Mid-size Firm", onboardingState: "California"
  - id: 7, name: "Lisa Wong", email: "lisa@morrison.com", org: "Morrison Legal Group", plan: "Professional", role: "Client", status: "Active", lastActive: "Yesterday", created: "Feb 10, 2026", logins: 78, docsUploaded: 28, onboardingCompleted: true, onboardingRole: "In-house Counsel", onboardingAreas: ["Real Estate", "Corporate & M&A"], onboardingFirmSize: "Mid-size Firm", onboardingState: "California"
  - id: 8, name: "Jennifer Chen", email: "jen@chenpartners.com", org: "Chen Partners LLC", plan: "Enterprise", role: "Admin", status: "Active", lastActive: "Today", created: "Feb 3, 2026", logins: 210, docsUploaded: 95, onboardingCompleted: true, onboardingRole: "Partner / Senior Attorney", onboardingAreas: ["Intellectual Property", "Corporate & M&A", "Technology"], onboardingFirmSize: "Large Firm", onboardingState: "Illinois"
  - id: 9, name: "Mark Rivera", email: "mark@riverakim.com", org: "Rivera & Kim LLP", plan: "Free", role: "Admin", status: "Active", lastActive: "3 days ago", created: "Feb 14, 2026", logins: 32, docsUploaded: 8, onboardingCompleted: true, onboardingRole: "Solo Practitioner", onboardingAreas: ["Immigration"], onboardingFirmSize: "Solo Practice", onboardingState: "Texas"
  - id: 10, name: "Carlos Patel", email: "carlos@patel.com", org: "Patel Law Office", plan: "Professional", role: "Admin", status: "Blocked", lastActive: "Apr 1, 2026", created: "Feb 20, 2026", logins: 55, docsUploaded: 20, onboardingCompleted: true, onboardingRole: "Partner / Senior Attorney", onboardingAreas: ["Family Law", "Estate Planning"], onboardingFirmSize: "Small Firm", onboardingState: "Florida"
- `roleColors` map: Admin (navy bg, white text), "Internal User" (#EFF6FF bg, #1D4ED8 text), Client (#F0FDF4 bg, #166534 text)
- `statusColors` map: Active (#DCFCE7 bg, #166534 text), Blocked (#FEE2E2 bg, #991B1B text), Invited (#FEF3C7 bg, #92400E text)
- localStorage key: `yourai_mgmt_users`
- CSV download filename: `platform_users_export.csv`
- CSV header: `Name,Email,Organisation,Role,Status,Last Active`

**Discrepancies**:
- Backup file (`UserManagement.backup.jsx`) has `reportsGenerated` field in mock data and shows 3-column Activity Summary (including "Reports Generated"); the active file removed `reportsGenerated` and shows only 2-column Activity Summary
- No delete user functionality exists anywhere
- No edit user functionality (name, email, role, org reassignment) exists
- Block/unblock is purely client-side -- no API call made
- No confirmation dialog before blocking a user
- No pagination on the user table
- localStorage persistence only applies to non-mock users; blocking a mock user is lost on page refresh

---

### Org Admin -- User Management -- `/app/users`
**File**: `src/pages/org-admin/OrgUserManagement.jsx`

**UI Elements**:
- PermissionGate wrapper: restricts to `allowedRoles={['Admin']}` -- shows "Access Restricted" screen for non-Admin roles
- PageHeader with UserCog icon, title "User Management", subtitle "Manage team members and invitations."
- Search input with Search icon (14px), placeholder "Search users...", width 260px
- "Invite User" button with Plus icon (14px), navy background, white text
- Table with columns: User, Email, Role, Status, Last Active, Actions
- Each table row: avatar circle (28x28, navy bg, 10px text), name, email, role Badge (mapped: Admin->Enterprise, Manager->Professional, Team->Team), status Badge, lastActive text
- Actions column: "Resend" button (for Invited users, with Mail icon 11px, bordered) or "--" placeholder for non-invited users
- Invite User slide-over panel (480px wide, right-aligned):
  - Title "Invite User" with X close button
  - Horizontal divider
  - 3-step wizard with numbered circle indicators: "Enter Details", "Assign Role", "Confirm"
  - Step indicators: completed steps show CheckCircle icon, active/future show number; active steps use navy bg, inactive use ice bg
  - Step 0 (Enter Details): Full Name input (placeholder "e.g. John Smith"), Email Address input (type email, placeholder "john@hartwell.com")
  - Step 1 (Assign Role): Radio button group with 3 options:
    - "Admin" -- "Full access to all features and settings."
    - "Manager" -- "Can manage workspaces, clients, and team members."
    - "Team" -- "Can work within assigned workspaces."
    - Selected role has 2px navy border; unselected has 1px border
  - Step 2 (Confirm): Summary card showing Name (or "--"), Email (or "--"), Role; message "An invitation email will be sent to {email}."
  - "Cancel" / "Back" button (left), "Next" / "Send Invitation" button (right)

**User Actions**:
- Type in search input (filters by name or email, case-insensitive)
- Click "Invite User" button to open slide-over (resets to step 0)
- Click "Resend" button on Invited users (shows toast "Invitation resent")
- In slide-over: type Full Name
- In slide-over: type Email Address
- In slide-over: select role via radio buttons (Admin, Manager, Team)
- In slide-over: click "Next" to advance step
- In slide-over: click "Back" to go to previous step
- In slide-over: click "Cancel" to close slide-over
- In slide-over: click "Send Invitation" to create user (step 2)
- Click backdrop to close slide-over
- Click X button to close slide-over

**Validation Rules**:
- NONE -- there is no validation on the invite form. Empty email, empty name are accepted. No email format check. No duplicate email check. "Next" always works regardless of field content.

**API Calls**:
- None (fully client-side with mock data from `src/data/mockData.js`)

**Mocks/Hardcoded**:
- Imports `orgUsers` from `src/data/mockData.js`:
  - id: 1, name: "Ryan Melade", email: "ryan@hartwell.com", role: "Admin", status: "Active", lastActive: "Today", avatar: "RM"
  - id: 2, name: "Sarah Chen", email: "sarah@hartwell.com", role: "Manager", status: "Active", lastActive: "Today", avatar: "SC"
  - id: 3, name: "James Wu", email: "james@hartwell.com", role: "Team", status: "Active", lastActive: "Yesterday", avatar: "JW"
  - id: 4, name: "Maria Torres", email: "maria@hartwell.com", role: "Team", status: "Active", lastActive: "2 days ago", avatar: "MT"
  - id: 5, name: "Tom Bradley", email: "tom@hartwell.com", role: "Manager", status: "Invited", lastActive: "Never", avatar: "TB"
- Default invite role: "Team"
- New user avatar generated as `(inviteName || inviteEmail).substring(0, 2).toUpperCase()`
- New user ID generated as `users.length + 1` (collision-prone)
- Toast messages: "Invitation sent successfully", "Invitation resent"
- Step labels: ["Enter Details", "Assign Role", "Confirm"]

**Discrepancies**:
- Role taxonomy differs between SA and Org views: SA uses "Admin", "Internal User", "Client"; Org uses "Admin", "Manager", "Team"
- No validation at all on the invite form -- email not validated, name not required, no duplicate check
- No block/unblock, edit, or delete capabilities for org admin
- "Resend" button does not actually resend anything -- just shows a toast
- New user ID uses `users.length + 1` which will produce duplicate IDs if users are added and the page is refreshed
- Invited users cannot be cancelled/revoked
- No user detail view (no click-to-view on rows)

---

### Org Admin -- My Profile -- `/app/profile`
**File**: `src/pages/org-admin/ProfilePage.jsx`

**UI Elements**:
- PageHeader with User icon, title "My Profile", subtitle "Manage your personal settings and preferences."
- 2-column layout (max-width 900px):
  - Left column -- Profile card:
    - Avatar circle (56x56, navy bg, white text showing `currentUser.avatar`)
    - Name, email display
    - Role Badge (Admin->Enterprise, Manager->Professional, Team->Team) and org name
    - Horizontal divider
    - Full Name input (pre-filled from `currentUser.name`)
    - Email input (type email, pre-filled from `currentUser.email`)
    - Organization input (disabled, ice-warm background, shows `currentUser.org`)
    - "Save Changes" button with Save icon (14px), navy bg
  - Right column:
    - Change Password card:
      - "Current Password" input (type password, placeholder "Enter current password")
      - "New Password" input (type password, placeholder "Enter new password")
      - "Confirm New Password" input (type password, placeholder "Confirm new password")
      - "Update Password" button (bordered, white bg)
    - Notification Preferences card:
      - 3 toggle switches: "Email notifications" (desc: "Receive notifications via email"), "Workflow completions" (desc: "Alert when workflows finish running"), "Classification alerts" (desc: "Flagged documents needing review")
      - Each toggle: 40x22px, navy when on, border color when off, with sliding white dot
- My Preferences section (below grid, max-width 900px):
  - Header: "My Preferences" (DM Serif Display), subtitle "Set during onboarding -- you can update these at any time."
  - "Edit" button with Edit3 icon (shown only in read-only mode)
  - Read-only mode: displays Role, Practice Areas, Firm Size, Primary Goal, Primary State, Additional States, Federal Practice -- each as label/value pair, "Not set" fallback
  - Edit mode:
    - Role selector: 2x2 grid of button cards (Briefcase, Scale, FileText, Settings icons):
      - "Partner / Senior Attorney" -- "I lead matters and review deliverables"
      - "Associate / Junior Attorney" -- "I draft, research, and support cases"
      - "Paralegal / Legal Assistant" -- "I manage documents, filings, and scheduling"
      - "Legal Operations / IT" -- "I manage tools, vendors, and firm technology"
    - Practice Areas: 3-column grid of pill toggles:
      - "Corporate & M&A", "Litigation", "Real Estate", "Employment & Labor", "Intellectual Property", "Tax & Compliance", "Immigration", "Family Law", "Criminal Defense", "Healthcare Law", "Bankruptcy", "Environmental"
    - Firm Size: 2x2 grid of button cards (User, Users, Building, Building2 icons):
      - "Solo Practitioner" -- "Just me"
      - "Small Firm" -- "2-10 attorneys"
      - "Mid-size Firm" -- "11-50 attorneys"
      - "Large Firm" -- "50+ attorneys"
    - Primary Goal: 3-column grid of cards (FileSearch, Search, LayoutDashboard icons):
      - "Analyze a Contract" -- "Upload a contract and get AI-powered analysis"
      - "Research Legal Questions" -- "Ask anything and get cited answers"
      - "Set Up My Workspace" -- "Organize matters, invite team members"
    - Primary State: custom dropdown with search, all 51 US states + DC
    - Additional States: 4-column grid of pill toggles for all US states; primary state shown but locked (opacity 0.7, cursor default)
    - Federal Practice: 2-column toggle cards (Globe, MapPin icons):
      - "Yes -- Federal Courts" -- "I practice in federal courts"
      - "No -- State only" -- "I practice in state courts only"
    - "Cancel" button, "Save Preferences" button with Save icon

**User Actions**:
- Edit Full Name
- Edit Email
- View disabled Organization field
- Click "Save Changes" (shows toast "Profile updated" -- does NOT actually save name/email anywhere)
- Type current/new/confirm password fields
- Click "Update Password" (shows toast "Password updated" -- does NOT validate or persist)
- Toggle notification switches (email, workflow, classification)
- Click "Edit" to enter preferences edit mode
- In edit mode: select Role card
- In edit mode: toggle Practice Area pills (multi-select)
- In edit mode: select Firm Size card
- In edit mode: select Primary Goal card
- In edit mode: open/close Primary State dropdown, search states, select state
- In edit mode: toggle Additional States pills (multi-select, primary state locked)
- In edit mode: select Federal Practice option
- Click "Save Preferences" (validates, saves to localStorage, shows toast "Preferences updated")
- Click "Cancel" (reverts draft to saved, exits edit mode)

**Validation Rules**:
- Preferences save validation: `role` required, `practiceAreas` must have length > 0, `firmSize` required, `primaryGoal` required, `primaryState` required
- Error message for each: "Please make a selection" (red #dc2626, font 12px)
- Primary state cannot be deselected from additional states (locked)
- No validation on profile name/email save
- No validation on password change (no current password check, no password strength, no confirm match check)

**API Calls**:
- None (fully client-side)

**Mocks/Hardcoded**:
- `currentUser` from `src/data/mockData.js`: name "Ryan Melade", email "ryan@hartwell.com", role "Admin", org "Hartwell & Associates", plan "Team", avatar "RM"
- localStorage key for preferences: `yourai_user_profile`
- Default notification state: email true, workflow true, classification false, reports true (note: reports is in state but no toggle renders for it)
- US_STATES array: 51 entries (50 states + District of Columbia)
- Practice area options: 12 values
- Role options: 4 values
- Firm size options: 4 values
- Goal options: 3 values

**Discrepancies**:
- "Save Changes" on profile card does NOT persist name/email -- just shows a toast
- "Update Password" does NOT validate anything -- no current password check, no strength rules, no confirm-match check, just shows a toast
- `notifications.reports` is in state (initialized true) but no toggle switch renders for it
- Notification toggles are not persisted (lost on refresh)
- Profile name/email changes are not persisted (lost on refresh)
- Password fields have no state variables -- they are uncontrolled inputs

---

### Tenant Detail -- Users Tab -- (slide-over from `/super-admin/tenants`)
**File**: `src/pages/super-admin/TenantManagement.jsx` (lines ~565-613)

**UI Elements**:
- Search input, placeholder "Search users...", full width, focus border var(--navy)
- Table with columns: Name, Role, Status, (empty header for actions)
- Each row: name (text-sm font-medium), email (text-xs muted), role badge (styled pill using roleColors), onboardingRole italic sub-text (if present), status badge (Active green, Invited amber, other red)
- Action column: Lock icon button (red #991B1B, title "Block") for Active users, Unlock icon button (green #166534, title "Unblock") for non-Active/non-Invited users -- hidden for Invited
- Empty state: Users icon (20px, opacity 0.4), "No users match your search" or "No users yet"

**User Actions**:
- Type in search input (filters by name or email, case-insensitive)
- Focus/blur on search input (border color toggles)
- Click Lock/Unlock button (NOTE: button has no onClick handler -- it is non-functional)

**Validation Rules**:
- Search: case-insensitive includes on name and email

**API Calls**:
- None

**Mocks/Hardcoded**:
- `orgUsers` object keyed by tenant ID:
  - Tenant 1 (Hartwell): 5 users (Ryan Melade Admin, Sarah Chen Internal User, James Wu Internal User, Maria Torres Client, Tom Bradley Internal User Invited)
  - Tenant 2 (Morrison): 3 users (David Park Admin, Lisa Wong Internal User, Amy Nguyen Client)
- For dynamically created tenants: reads `yourai_mgmt_users` from localStorage and filters by org name
- Fallback for unknown tenants: single row with contact admin name, email, role "Admin", status "Active"
- roleColors: Admin (navy bg, white text), Internal User (#EFF6FF bg, #1D4ED8 text), Client (#F0FDF4 bg, #166534 text), Invited (#FEF3C7 bg, #92400E text)

**Discrepancies**:
- Block/Unblock buttons have NO onClick handler -- they render but do nothing when clicked
- Amy Nguyen (tenant 2) has `onboardingRole: null`, so no sub-text shown
- No user detail view from this tab
- Different role taxonomy vs Org Admin view (uses SA roles: Admin, Internal User, Client)

---

### Add Tenant -- Admin User Step -- (slide-over from `/super-admin/tenants`)
**File**: `src/pages/super-admin/TenantManagement.jsx` (lines ~757-809, ~880-902, ~212-254)

**UI Elements**:
- 3-step wizard: "Organisation" (step 1), "Admin User" (step 2), "Review & Invite" (step 3)
- Step 2 form fields:
  - Info banner (blue, left-bordered): "This person will be the Organisation Admin -- they can invite other users, create workspaces, and manage billing..."
  - First Name input (required *, placeholder "Ryan")
  - Last Name input (required *, placeholder "Melade")
  - Email Address input (required *, type email, placeholder "ryan@hartwell.com")
  - Email validation error: "Please enter a valid email address." (red #EF4444, 11px) -- shown when email is non-empty and fails regex
  - Email helper text: "The invitation email will be sent to this address." (muted, 11px) -- shown when email is empty or valid
  - Phone Number input (optional, type tel, placeholder "+1 (555) 000-0000")
  - "What happens next?" info card with 4 numbered steps
- Step 3 review: summary card with org name, plan, industry, MRR, admin name, role "Organisation Admin", email
  - Warning banner (amber, left-bordered): "Confirm before sending -- An invitation email will be sent to {email}..."
- Success state after creation:
  - Green checkmark circle (64px)
  - "Tenant Created Successfully" heading
  - Confirmation text with org name and email
  - Invitation Details card: Organisation, Plan, Admin, Invite sent to, "Link expires: 7 days"
  - "Done" button
- Footer: "Back" link (step > 1), "Cancel" button, "Continue" / "Send Invitation" button

**User Actions**:
- Type first name, last name, email, phone
- Click "Continue" to advance (disabled if step 2 fields invalid)
- Click "Back" to go to previous step
- Click "Cancel" to close
- Click "Send Invitation" to create tenant + admin user
- Click "Done" after success

**Validation Rules**:
- Step 1: `newOrg.name.trim()` must be non-empty to enable Continue
- Step 2: `newAdmin.firstName.trim()` must be non-empty, `newAdmin.lastName.trim()` must be non-empty, email must pass regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Inline email validation: regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` -- shows error text in red when non-empty and invalid
- No phone number validation
- No duplicate org name or email check

**API Calls**:
- None (purely client-side, persists to localStorage)

**Mocks/Hardcoded**:
- Default new org: `{ name: '', plan: 'Professional', industry: 'Legal Services' }`
- Default new admin: `{ firstName: '', lastName: '', email: '', phone: '' }`
- MRR values: Free=$0, Professional=$149, Team=$299, Enterprise=$599 per user
- Plan limits displayed in step 1: Free (1 user, 50 docs/mo, 10 workflow runs, 1 knowledge pack), Professional (up to 3 users, 500 docs/mo, 100 workflow runs, 5 knowledge packs), Team (up to 10 users, 2,000 docs/mo, 500 workflow runs, 20 knowledge packs), Enterprise (unlimited everything)
- Industry options: "Legal Services", "Corporate Legal", "Compliance & Risk", "Financial Services", "Healthcare", "Other"
- localStorage keys: `yourai_mgmt_tenants`, `yourai_mgmt_users`
- New tenant object shape: id (Date.now()), name, plan, users: 1, workspaces: 0, documents: 0, status: "Active", created (formatted date), mrr (plan-based), planPrice, billedSince, nextRenewal: "", paymentStatus (Free="N/A", others="Pending")
- New admin user object shape: id (Date.now() + 1), name, email, org, plan, role: "Admin", status: "Invited", lastActive: "Never", created, logins: 0, docsUploaded: 0, onboardingCompleted: false
- "What happens next?" steps: 4 hardcoded strings
- Link expires: "7 days" (hardcoded display, not enforced)
- Toast message: "Invitation sent to {email}. {orgName} has been onboarded."
- Portal URL mentioned: "app.yourai.com"

**Discrepancies**:
- No actual email is sent -- purely local state + localStorage
- "Link expires: 7 days" is display-only, no actual expiration logic
- Phone number is collected but never stored in the user object or used anywhere
- Duplicate email check only prevents exact match in `yourai_mgmt_users` localStorage, not against mock users

---

### Backend -- User API -- `/api/users`
**File**: `backend/src/routes/users.ts`

**UI Elements**: N/A (backend)

**User Actions**: N/A (backend)

**Validation Rules**:
- All routes require `requireAuth` middleware
- User queries scoped to caller's `orgId` (`req.user!.orgId`)
- GET /:id returns 404 with `{ error: 'User not found' }` if no match

**API Calls**:
- `GET /api/users` -- list users in caller's org (Prisma `findMany`, select: id, name, email, role, createdAt, updatedAt, ordered by createdAt desc)
- `GET /api/users/:id` -- get single user by ID within org (Prisma `findFirst`)
- `POST /api/users/:id/block` -- stub endpoint, returns `{ success: true }` with no actual logic

**Mocks/Hardcoded**:
- Block endpoint is a stub: `// TODO: implement user blocking logic`, always returns `{ success: true }`

**Discrepancies**:
- No POST /api/users (create user) endpoint
- No PUT/PATCH /api/users/:id (update user) endpoint
- No DELETE /api/users/:id endpoint
- No POST /api/users/invite endpoint
- No POST /api/users/:id/unblock endpoint (only block exists)
- Block endpoint is non-functional (TODO stub)
- Frontend makes zero API calls -- complete disconnect between frontend and backend

---

## Shared Components Used by User Screens

| Component | File | Used By |
|-----------|------|---------|
| PageHeader | `src/components/PageHeader.jsx` | UserManagement, OrgUserManagement, ProfilePage |
| StatCard | `src/components/StatCard.jsx` | UserManagement |
| Badge | `src/components/Badge.jsx` | UserManagement, OrgUserManagement, ProfilePage, TenantManagement |
| Table | `src/components/Table.jsx` | UserManagement, OrgUserManagement |
| Modal | `src/components/Modal.jsx` | UserManagement (User Detail modal) |
| Toast (useToast) | `src/components/Toast.jsx` | UserManagement, OrgUserManagement, ProfilePage |
| PermissionGate | `src/components/org-admin/PermissionGate.jsx` | OrgUserManagement |
| RoleContext (useRole) | `src/components/org-admin/RoleContext.jsx` | OrgUserManagement (via PermissionGate), ProfilePage |

### PermissionGate Details
- Wraps content and checks if current role (from RoleContext) is in `allowedRoles` array
- Denied state: Lock icon in 64px circle, "Access Restricted" heading, message "You don't have permission to view this page. This section requires {roles} access.", "Back to Dashboard" button navigating to `/app/dashboard`
- RoleContext defaults to role: "Admin" with `setRole` exposed

### Modal Details
- Centered overlay with rgba(15,23,42,0.4) backdrop
- 480px max-width, 16px border-radius, 28px padding
- Header with serif title + X close button (hover: ice-warm bg)
- Horizontal divider below header
- Click backdrop to close

---

## Discrepancy Summary Table

| # | Severity | Issue |
|---|----------|-------|
| 1 | HIGH | Frontend makes zero API calls for any user management operation -- complete frontend/backend disconnect |
| 2 | HIGH | Block endpoint in backend is a TODO stub (`POST /api/users/:id/block` returns success without doing anything) |
| 3 | HIGH | No create user / invite user API endpoint exists in backend |
| 4 | HIGH | No update user API endpoint exists in backend |
| 5 | HIGH | No delete user API endpoint exists in backend |
| 6 | HIGH | Org Admin invite form has zero validation -- empty email, empty name accepted without error |
| 7 | HIGH | Profile "Save Changes" does not persist name/email -- just shows a toast |
| 8 | HIGH | Profile "Update Password" does not validate anything -- no current password check, no strength rules, no confirm match, just shows toast |
| 9 | MEDIUM | Role taxonomy mismatch: SA uses "Admin"/"Internal User"/"Client", Org Admin uses "Admin"/"Manager"/"Team" |
| 10 | MEDIUM | Tenant Detail Users tab Block/Unblock buttons render but have no onClick handler -- completely non-functional |
| 11 | MEDIUM | SA user block/unblock for mock users is not persisted -- lost on page refresh |
| 12 | MEDIUM | No user delete functionality exists anywhere in the application |
| 13 | MEDIUM | No user edit functionality (change name, email, role, org) exists anywhere |
| 14 | MEDIUM | No confirmation dialog before blocking/unblocking a user |
| 15 | MEDIUM | Phone number collected during Add Tenant but never stored in user object |
| 16 | MEDIUM | Notification preferences on Profile page are not persisted (lost on refresh) |
| 17 | MEDIUM | Password fields on Profile page are uncontrolled inputs (no state variables) |
| 18 | LOW | New org-user ID uses `users.length + 1` -- will produce duplicate IDs after add/refresh cycles |
| 19 | LOW | "Invitation resent" action on Org Admin page does not perform any actual operation |
| 20 | LOW | `notifications.reports` is initialized as `true` in ProfilePage state but has no corresponding toggle in the UI |
| 21 | LOW | Backup file `UserManagement.backup.jsx` exists with `reportsGenerated` field that was removed from active version |
| 22 | LOW | No pagination on any user table |
| 23 | LOW | "Link expires: 7 days" in Add Tenant success screen is display-only with no enforcement |
| 24 | LOW | No unblock endpoint in backend (only block exists) |
| 25 | INFO | Comment in TenantManagement: "Plan Override Modal removed -- SA cannot change plan or payment data" (line 910) |
| 26 | INFO | Comment in TenantManagement overview: "SA cannot change plan -- managed by user/billing" (line 491) |
