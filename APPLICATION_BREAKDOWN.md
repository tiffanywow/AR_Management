# AR Management - Political Party Back Office Application
## Complete Application Breakdown & Documentation

---

## Table of Contents
1. [Application Overview](#application-overview)
2. [Technology Stack](#technology-stack)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Database Schema](#database-schema)
5. [Page-by-Page Breakdown](#page-by-page-breakdown)
6. [Core Features](#core-features)
7. [Security & Authentication](#security--authentication)
8. [Integration Points](#integration-points)

---

## Application Overview

**Purpose:** A comprehensive back office management system for a political party (AR - Affirmative Repositioning) to manage campaigns, finances, members, communications, and operations.

**Target Users:** Political party administrators, finance officers, and super administrators

**Key Capabilities:**
- Campaign planning and management with Google Maps integration
- Financial tracking (revenue, expenses, donations, reconciliation)
- Member management and analytics
- SMS and push notification broadcasting
- Mobile app advertisement management
- Multi-user role-based access control

---

## Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router DOM v7
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Maps:** Google Maps JavaScript API
- **Icons:** Lucide React
- **Forms:** React Hook Form with Zod validation

### Backend & Database
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (email/password)
- **Real-time:** Supabase Realtime subscriptions
- **Storage:** Supabase Storage (for receipts/documents)
- **Edge Functions:** Supabase Edge Functions (for SMS via Twilio)

### Additional Services
- **SMS Provider:** Twilio Messaging Service
- **Payment Gateways:**
  - Nedbank Paytoday (card payments)
  - EFT (electronic fund transfers)
  - Mobile Wallets (MTC & TN Mobile)

---

## User Roles & Permissions

### 1. Super Admin
**Full System Access**
- View: Dashboard, Members, Broadcasting, Campaigns, Adverts, Finance, User Management, Settings
- Permissions:
  - Create, read, update, delete ALL records
  - Manage user accounts and roles
  - Access all financial data
  - Approve expenses and reconcile payments
  - Full campaign management
  - Broadcast messages to all members

### 2. Administrator
**Operations Management**
- View: Dashboard, Members, Broadcasting, Campaigns, Adverts, Settings
- Permissions:
  - Manage members and campaigns
  - Create and manage advertisements
  - Send broadcasts to members
  - View financial summaries (limited editing)
  - Cannot manage users or approve expenses

### 3. Finance
**Financial Operations**
- View: Dashboard, Finance, Settings
- Permissions:
  - Manage all financial records (revenue, expenses)
  - Reconcile donations and payments
  - Approve expense requests
  - View campaign budgets
  - Generate financial reports
  - Cannot manage members or campaigns

---

## Database Schema

### Core Tables

#### 1. **profiles**
User profiles with role-based access
```
- id (uuid, references auth.users)
- email (text, unique)
- full_name (text)
- role ('super_admin', 'administrator', 'finance')
- created_at (timestamp)
- created_by (uuid)
- is_active (boolean)
```

#### 2. **campaigns**
Political campaign records
```
- id (uuid)
- name (text)
- description (text)
- location_name (text)
- location_lat/lng (numeric) - GPS coordinates
- start_date, end_date (date)
- target_amount, raised_amount (numeric)
- status ('draft', 'active', 'completed', 'cancelled')
- created_by (uuid)
- created_at, updated_at (timestamp)
```

#### 3. **campaign_collaborators**
Team members assigned to campaigns
```
- id (uuid)
- campaign_id (uuid)
- user_id (uuid, references profiles)
- role (text) - coordinator, volunteer, advisor, logistics
- created_at (timestamp)
- created_by (uuid)
```

#### 4. **campaign_tasks**
Tasks assigned to campaign team members
```
- id (uuid)
- campaign_id (uuid)
- title (text)
- description (text)
- assigned_to (uuid, references profiles)
- status ('pending', 'in_progress', 'completed', 'cancelled')
- priority ('low', 'medium', 'high')
- due_date (date)
- completed_at (timestamp)
- created_by, created_at (timestamp)
```

#### 5. **campaign_budgets**
Budget allocation per campaign
```
- id (uuid)
- campaign_id (uuid)
- category ('venue', 'transport', 'marketing', 'catering', 'equipment', 'other')
- description (text)
- budgeted_amount, actual_amount (numeric)
- created_by, created_at, updated_at (timestamp)
```

#### 6. **campaign_expenses**
Actual expenses for campaigns
```
- id (uuid)
- campaign_id (uuid)
- budget_id (uuid, optional)
- description (text)
- amount (numeric)
- expense_date (date)
- receipt_url (text)
- status ('pending', 'approved', 'rejected')
- created_by, approved_by (uuid)
- created_at (timestamp)
```

#### 7. **donations**
Donation/payment tracking
```
- id (uuid)
- campaign_id (uuid, optional - can be general donation)
- donor_name, donor_email, donor_phone (text)
- amount (numeric)
- payment_method ('eft', 'card', 'cash', 'wallet')
- payment_reference (text, unique)
- payment_status ('pending', 'confirmed', 'failed', 'refunded')
- reconciled (boolean)
- reconciled_by, reconciled_at (uuid, timestamp)
- donation_date, created_at (timestamp)
```

#### 8. **party_revenue**
General party revenue tracking
```
- id (uuid)
- source ('donations', 'membership_fees', 'merchandise', 'events', 'other')
- description (text)
- amount (numeric)
- revenue_date (date)
- reference_number (text)
- created_by, created_at (timestamp)
```

#### 9. **party_expenses**
General party operational expenses
```
- id (uuid)
- category ('salaries', 'rent', 'utilities', 'marketing', 'transport', 'supplies', 'other')
- description (text)
- amount (numeric)
- expense_date (date)
- receipt_url (text)
- status ('pending', 'approved', 'paid')
- created_by, approved_by (uuid)
- created_at (timestamp)
```

#### 10. **party_members**
Party membership records
```
- id (uuid)
- full_name, email (text)
- phone (text)
- region (text) - Namibian regions
- date_of_birth (date)
- membership_status ('active', 'pending', 'inactive')
- joined_date (date)
- created_at (timestamp)
```

#### 11. **app_adverts**
Mobile app advertisements
```
- id (uuid)
- title (text)
- content_type ('text', 'image', 'video')
- content_url (text, optional)
- text_content (text, optional)
- status ('active', 'inactive', 'scheduled')
- views, clicks (integer)
- created_by, created_at (timestamp)
```

---

## Page-by-Page Breakdown

### 1. **Login Page** (`/login`)

**Purpose:** User authentication entry point

**Features:**
- Email and password authentication
- Form validation with error handling
- "Remember me" functionality
- Link to signup page
- Integration with Supabase Auth
- Automatic redirect to dashboard on successful login

**User Flow:**
1. User enters email and password
2. System validates credentials via Supabase Auth
3. On success: Profile loaded, redirected to dashboard
4. On failure: Error message displayed

**Database Interaction:**
- Reads from: `auth.users`, `profiles`

---

### 2. **Signup Page** (`/signup`)

**Purpose:** New user registration (admin invitation only)

**Features:**
- Full name, email, password fields
- Password strength requirements
- Form validation
- Auto-creates profile after auth signup
- Trigger creates default profile entry

**User Flow:**
1. User enters registration details
2. System creates auth.users record
3. Trigger creates corresponding profile record
4. User redirected to login

**Database Interaction:**
- Writes to: `auth.users`, `profiles` (via trigger)

**Note:** In production, this should be restricted to invited users only

---

### 3. **Dashboard** (`/`)

**Purpose:** Main overview and analytics hub

**Features:**
- **Key Metrics Cards:**
  - Total members count
  - Active campaigns count
  - Monthly revenue
  - Pending tasks

- **Membership Growth Chart:**
  - Line chart showing member growth over time
  - Monthly breakdown

- **Regional Distribution Map:**
  - Interactive map of Namibia
  - Member distribution by region
  - Click regions for details

- **Recent Activity Feed:**
  - Latest donations
  - New member registrations
  - Campaign updates
  - Financial transactions

**Data Sources:**
- `party_members` - member counts and growth
- `campaigns` - active campaigns
- `party_revenue` - monthly revenue
- `campaign_tasks` - pending tasks
- `donations` - recent donations

**User Permissions:**
- Visible to: All roles
- Data filtered by role permissions

---

### 4. **Members Page** (`/members`)

**Purpose:** Member management and analytics

**Features:**

**Statistics:**
- Total member count
- Members by region (bar chart)
- Age distribution (pie chart)

**Member Directory:**
- List of recent members
- Search functionality (name, email, region)
- Member status badges (active/pending)

**Actions:**
- **Add Member:**
  - Full name, email, phone
  - Region selection (14 Namibian regions)
  - Date of birth (optional)
  - Auto-set status to 'active'
  - Auto-set joined date

- **Export Members:**
  - Download CSV file
  - Includes: name, email, phone, region, status, joined date
  - Filename: `members_YYYY-MM-DD.csv`

**User Flow - Add Member:**
1. Click "Add Member" button
2. Fill in member details form
3. Select region from dropdown
4. Submit form
5. Member record created in database
6. Success notification
7. Member appears in list

**Database Interaction:**
- Reads from: `party_members`
- Writes to: `party_members`

**Permissions:**
- View: super_admin, administrator
- Add: super_admin, administrator

---

### 5. **Broadcasting Page** (`/broadcasting`)

**Purpose:** Mass communication via SMS and push notifications

**Features:**

**Message Composition:**
- **Message Type:** SMS or Push Notification
- **Target Audience:**
  - All Members
  - By Region
  - By Age Group
  - Active Members Only
  - Test Members (specific phone number)

- **Subject Line:** (Push notifications only)
- **Message Content:**
  - SMS: 160 character limit
  - Push: No limit
  - Character counter

**Statistics Panel:**
- SMS Credits remaining
- Push-enabled devices count
- Total reach

**Twilio Integration:**
- Service Status badge
- Account SID (masked)
- Service SID (masked)

**Recent Broadcasts History:**
- Message content
- Sent date/time
- Recipient count
- Delivery status

**User Flow - Send Message:**
1. Select message type (SMS/Push)
2. Choose target audience
3. Enter subject (if push)
4. Compose message
5. Review estimated recipients
6. Send now or schedule
7. Message sent via edge function
8. Confirmation toast notification

**Technical Implementation:**
- Edge Function: `/functions/send-message`
- Integrates with Twilio API
- Environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SERVICE_SID`
- Test number hardcoded: +264814555528

**Database Interaction:**
- Reads from: `party_members` (for recipient lists)

**Permissions:**
- View/Send: super_admin, administrator

---

### 6. **Campaigns Page** (`/campaigns`)

**Purpose:** Campaign overview and management

**Features:**

**Summary Statistics:**
- Total target across all campaigns
- Total raised amount
- Progress percentage
- Total supporters

**Campaign Cards:**
Each card displays:
- Campaign name and description
- Status badge (active/draft/completed)
- Progress bar (raised vs target)
- Percentage complete
- Amount remaining
- Start and end dates
- Supporter count
- Action buttons:
  - **View Details** → Opens campaign details page
  - **Promote** → (Future feature for promotion)

**User Flow:**
1. View all campaigns
2. Click "View Details" on any campaign
3. Navigate to detailed campaign page

**Database Interaction:**
- Reads from: `campaigns`

**Permissions:**
- View: super_admin, administrator, finance
- Create: super_admin, administrator

---

### 7. **Campaign Create Page** (`/campaigns/create`)

**Purpose:** Create new political campaigns with full details

**Features:**

**Campaign Details Section:**
- Campaign name
- Description (textarea)
- Status (draft/active)
- Start date and end date
- Target amount (N$)

**Location Section:**
- Google Maps integration
- Search location by name
- Interactive map with draggable marker
- Click map to set location
- Displays GPS coordinates (lat/lng)
- Shows formatted address
- Map zoom controls

**Collaborators Section:**
- Add team members from user list
- Assign roles:
  - Coordinator
  - Volunteer
  - Advisor
  - Logistics
- Display list of added collaborators
- Remove collaborators

**Tasks Section:**
- Add campaign tasks
- Task fields:
  - Title
  - Description
  - Assign to user (optional)
  - Due date
  - Priority (low/medium/high)
- Task list with details
- Remove tasks

**User Flow - Create Campaign:**
1. Fill in campaign basic info
2. Search and select location on map
3. Adjust marker if needed
4. Add collaborators (optional)
5. Add tasks (optional)
6. Click "Create Campaign"
7. System creates:
   - Campaign record
   - Collaborator records
   - Task records
8. Redirect to campaigns list

**Technical Details:**
- Google Maps API integration
- Geocoding service for address lookup
- Reverse geocoding for coordinates
- Environment variable: `VITE_GOOGLE_MAPS_API_KEY`

**Database Interaction:**
- Writes to: `campaigns`, `campaign_collaborators`, `campaign_tasks`
- Reads from: `profiles` (for user list)

**Permissions:**
- Create: super_admin, administrator

---

### 8. **Campaign Details Page** (`/campaigns/:id`)

**Purpose:** Detailed view of single campaign

**Features:**

**Header:**
- Campaign name
- Status badge
- Description
- Back button

**Statistics Cards:**
- Target amount
- Raised amount
- Collaborator count
- Task count

**Progress Section:**
- Visual progress bar
- Percentage complete
- Amount raised and remaining
- Start and end dates
- Location information

**Tabbed Content:**

**Tab 1 - Collaborators:**
- List of all team members
- Shows name, email, avatar
- Role badge (coordinator, volunteer, etc)
- Empty state if no collaborators

**Tab 2 - Tasks:**
- List of all campaign tasks
- Task status icon (pending/in progress/completed)
- Task title and description
- Assigned user name
- Due date
- Priority badge
- Status badge
- Empty state if no tasks

**User Flow:**
1. Navigate from campaigns list
2. View campaign overview
3. Switch between tabs to see collaborators/tasks
4. Use back button to return to list

**Database Interaction:**
- Reads from:
  - `campaigns`
  - `campaign_collaborators` (with join to `profiles`)
  - `campaign_tasks` (with join to `profiles`)

**Permissions:**
- View: super_admin, administrator, finance

---

### 9. **Adverts Page** (`/adverts`)

**Purpose:** Manage mobile app advertisements

**Features:**

**Statistics:**
- Total views across all adverts
- Total clicks
- Average click-through rate (CTR)

**Create Advertisement:**
- Dialog form with fields:
  - Title
  - Content type (text/image/video)
  - Text content (if type is text)
  - Link URL (optional)
- Auto-sets status to 'active'
- Initializes views/clicks to 0

**Advertisement Library:**
- Lists all created adverts
- Each advert shows:
  - Type icon
  - Title
  - Content type
  - Creation date
  - Text preview (if applicable)
  - View and click counts
  - Status badge
  - Delete button

**User Flow - Create Advert:**
1. Click "Create Advert"
2. Enter title
3. Select content type
4. Enter text content (if text type)
5. Add link URL (optional)
6. Submit form
7. Advert created and appears in library
8. Empty state if no adverts

**Technical Notes:**
- Image/video content types currently store URL only
- Future: File upload integration
- Tracking: Views and clicks tracked by mobile app

**Database Interaction:**
- Reads from: `app_adverts`
- Writes to: `app_adverts`
- Deletes from: `app_adverts`

**Permissions:**
- View/Create/Delete: super_admin, administrator

---

### 10. **Finance Dashboard** (`/finance`)

**Purpose:** Central finance overview hub

**Features:**

**Key Financial Metrics:**
- Total Revenue (all sources)
- Total Expenses (all categories)
- Net Position (revenue - expenses)
- Pending Reconciliation count

**Quick Action Buttons:**
- Add Revenue → `/finance/revenue`
- Add Expense → `/finance/expenses`

**Recent Transactions:**
- Combined list of recent revenue and expenses
- Shows:
  - Description
  - Date
  - Amount (color-coded: green for revenue, red for expenses)
  - Status
- Limited to 5 most recent

**Quick Actions Panel:**
- Payment Reconciliation
- Campaign Budgets
- Revenue Management
- Expense Management

**Budget Status:**
- Shows top 3 campaigns
- Progress bars with percentage
- Visual warning when > 90%

**User Flow:**
1. View financial overview
2. Click action buttons to manage specific areas
3. Review recent transactions
4. Navigate to detailed pages via quick actions

**Database Interaction:**
- Reads from:
  - `party_revenue` - total revenue
  - `party_expenses` - total expenses
  - `donations` (where reconciled = false) - pending count
  - `campaigns` - budget status

**Permissions:**
- View: super_admin, finance

---

### 11. **Revenue Management** (`/finance/revenue`)

**Purpose:** Track all party revenue sources

**Features:**

**Statistics:**
- Total Revenue (all sources)
- Donations total
- Membership Fees total
- Other Revenue total

**Add Revenue:**
- Dialog form with fields:
  - Revenue source dropdown:
    - Donations
    - Membership Fees
    - Merchandise
    - Events
    - Other
  - Description (textarea)
  - Amount (N$)
  - Date
  - Reference number (optional)

**Revenue Records List:**
- All revenue transactions
- Each record shows:
  - Description
  - Source badge (color-coded)
  - Date
  - Reference number (if provided)
  - Amount (green, positive)
- Sorted by date (newest first)
- Empty state if no records

**User Flow - Add Revenue:**
1. Click "Add Revenue"
2. Select revenue source
3. Enter description
4. Input amount
5. Set date (defaults to today)
6. Add reference number (optional)
7. Submit form
8. Record created
9. Statistics updated
10. Success notification

**Database Interaction:**
- Reads from: `party_revenue`
- Writes to: `party_revenue`

**Permissions:**
- View/Add: super_admin, finance

---

### 12. **Expense Management** (`/finance/expenses`)

**Purpose:** Track and approve party expenses

**Features:**

**Statistics:**
- Total Expenses (all categories)
- Pending expenses (awaiting approval)
- Approved expenses
- Paid expenses

**Add Expense:**
- Dialog form with fields:
  - Category dropdown:
    - Salaries
    - Rent
    - Utilities
    - Marketing
    - Transport
    - Supplies
    - Other
  - Description (textarea)
  - Amount (N$)
  - Expense date
- Auto-sets status to 'pending'

**Expense Records List:**
- All expense transactions
- Each record shows:
  - Description
  - Category badge
  - Status badge (pending/approved/paid)
  - Date
  - Amount (red, negative)
- Action buttons (based on status):
  - Pending: "Approve" button
  - Approved: "Mark Paid" button
  - Paid: No action buttons

**Approval Workflow:**
1. Expense created → Status: Pending
2. Finance user clicks "Approve" → Status: Approved
3. Finance user clicks "Mark Paid" → Status: Paid

**User Flow - Add & Approve:**
1. Click "Add Expense"
2. Select category
3. Enter description and amount
4. Set date
5. Submit (status = pending)
6. Review pending expenses
7. Click "Approve" on expense
8. Status changes to approved
9. Click "Mark Paid" when paid
10. Status changes to paid

**Database Interaction:**
- Reads from: `party_expenses`
- Writes to: `party_expenses`
- Updates: `party_expenses` (status, approved_by)

**Permissions:**
- View/Add/Approve: super_admin, finance

---

### 13. **Payment Reconciliation** (`/finance/reconciliation`)

**Purpose:** Reconcile donations and payments

**Features:**

**Statistics:**
- Pending Reconciliation count
- Confirmed Today count
- Total Amount Pending (N$)

**Search & Filter:**
- Search by reference or donor name
- Filter by payment method:
  - All Methods
  - EFT Only
  - Card Only (Nedbank Paytoday)
  - Wallet Only (Mobile)

**Pending Payments List:**
- Shows unreconciled donations
- Each payment displays:
  - Payment method icon
  - Donor name
  - Payment method badge
  - Payment reference
  - Campaign name (or "General Donation")
  - Date and time
  - Amount
  - Status: Pending badge
- Action buttons:
  - **Confirm** (green) - Mark as reconciled
  - **Reject** (red) - Mark as failed

**Payment Gateway Status:**
- Shows connected payment methods:
  - Nedbank Paytoday (card payments)
  - Bank EFT (electronic transfers)
  - Mobile Wallets (MTC & TN Mobile)
- Each shows active status

**User Flow - Reconcile Payment:**
1. View pending payments
2. Review payment details
3. Verify against bank statement
4. Click "Confirm" to reconcile
5. System updates:
   - reconciled = true
   - reconciled_by = current user
   - reconciled_at = now
   - payment_status = 'confirmed'
6. Payment removed from pending list
7. Statistics updated

**Database Interaction:**
- Reads from:
  - `donations` (where reconciled = false)
  - Joins with `campaigns` for campaign names
- Updates: `donations` (reconciled, reconciled_by, reconciled_at, payment_status)

**Permissions:**
- View/Reconcile: super_admin, finance

---

### 14. **Campaign Budgets** (`/finance/budgets`)

**Purpose:** Manage campaign-specific budgets

**Features:**

**Campaign Budget Overview:**
- Cards for each campaign showing:
  - Campaign name
  - Budget utilization percentage
  - Progress bar (yellow if > 90%)
  - Total budgeted amount
  - Remaining amount
  - Color indicators

**Add Budget Item:**
- Dialog form with fields:
  - Campaign selection (dropdown)
  - Category dropdown:
    - Venue
    - Transport
    - Marketing
    - Catering
    - Equipment
    - Other
  - Description
  - Budgeted Amount (N$)

**Budget Breakdown Table:**
- Filter by campaign (dropdown)
- Shows all budget items with:
  - Description
  - Category badge (color-coded)
  - Campaign name
  - Budgeted amount
  - Actual amount (tracked from expenses)
  - Variance percentage
  - Variance indicator (up/down arrows)

**Variance Tracking:**
- Green (down arrow): Under budget
- Red (up arrow): Over budget
- Automatic calculation: (actual - budgeted) / budgeted * 100

**User Flow:**
1. View campaign budget cards
2. Click "Add Budget Item"
3. Select campaign and category
4. Enter description and budgeted amount
5. Submit form
6. Budget item added to breakdown
7. Actual amounts updated as expenses recorded

**Database Interaction:**
- Reads from:
  - `campaigns` - budget overview
  - `campaign_budgets` - budget items
- Writes to: `campaign_budgets`

**Permissions:**
- View: super_admin, finance, administrator
- Add: super_admin, finance

---

### 15. **User Management** (`/users`)

**Purpose:** Manage system users and roles (Super Admin only)

**Features:**

**User List:**
- Shows all registered users
- Displays:
  - Full name
  - Email
  - Role badge
  - Active status
  - Created date

**Add User:**
- Create new user accounts
- Set initial role:
  - Super Admin
  - Administrator
  - Finance
- User receives login credentials
- Account auto-activated

**Edit User:**
- Change user role
- Activate/deactivate account
- Update user details

**Role-Based Filtering:**
- View users by role
- Filter active/inactive

**Security Note:**
- Only Super Admins can access
- Audit trail of all changes
- Cannot deactivate own account

**Database Interaction:**
- Reads from: `profiles`
- Writes to: `profiles` (via Super Admin policies)

**Permissions:**
- View/Manage: super_admin ONLY

---

### 16. **Settings Page** (`/settings`)

**Purpose:** Application configuration and preferences

**Features:**

**Personal Settings:**
- Update profile information
- Change password
- Email preferences

**System Settings:**
(Super Admin only)
- Application configuration
- Integration settings
- Notification preferences

**Integration Credentials:**
(Super Admin only)
- Twilio credentials
- Google Maps API key
- Payment gateway settings

**Database Interaction:**
- Reads from: `profiles`
- Updates: `profiles`

**Permissions:**
- View: All roles
- System Settings: super_admin only

---

## Core Features

### 1. **Authentication System**

**Implementation:**
- Supabase Auth with email/password
- JWT token-based sessions
- Automatic token refresh
- Secure password reset flow

**Auth Context:**
- Global authentication state
- User profile management
- Role-based access control
- Sign in/out functionality

**Security:**
- Passwords hashed with bcrypt
- Session management
- Protected routes
- Role verification

---

### 2. **Role-Based Access Control (RBAC)**

**Implementation:**
- Database-level Row Level Security (RLS)
- Frontend route protection
- Component-level permission checks

**Policy Structure:**
```sql
-- Example: Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.is_active = true
    )
  );
```

**Route Protection:**
- ProtectedRoute wrapper component
- Role-based sidebar navigation
- Dynamic menu based on user role

---

### 3. **Google Maps Integration**

**Features:**
- Interactive map display
- Location search with autocomplete
- Draggable markers
- Click-to-place location
- Geocoding (address to coordinates)
- Reverse geocoding (coordinates to address)

**Implementation:**
```javascript
const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  version: 'weekly',
});
```

**Use Cases:**
- Campaign location selection
- Regional member distribution
- Event planning

---

### 4. **SMS Broadcasting via Twilio**

**Architecture:**
- Edge Function: `/functions/send-message`
- Twilio Programmable Messaging API
- Messaging Service SID for sender management

**Configuration:**
```
Environment Variables:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_SERVICE_SID
```

**Features:**
- Bulk SMS sending
- Character limit enforcement (160)
- Delivery status tracking
- Test mode for single number
- Audience segmentation

**Edge Function:**
```typescript
// Simplified structure
Deno.serve(async (req) => {
  const { type, message, targetAudience, recipient } = await req.json();

  // Send via Twilio
  const response = await twilioClient.messages.create({
    to: recipient,
    from: TWILIO_SERVICE_SID,
    body: message
  });

  return Response.json({ success: true });
});
```

---

### 5. **Financial Management**

**Comprehensive Tracking:**
- Multiple revenue sources
- Categorized expenses
- Campaign-specific budgets
- Donation reconciliation
- Variance analysis

**Approval Workflows:**
1. Expense created → Pending
2. Finance approves → Approved
3. Payment made → Paid

**Reconciliation Process:**
1. Donation received → Unreconciled
2. Finance verifies → Reconciled
3. Audit trail maintained

**Reporting:**
- Real-time statistics
- Budget vs actual tracking
- Revenue trends
- Expense categories

---

### 6. **Data Export**

**Members Export:**
- CSV format
- All member data
- Timestamp-based filename
- Client-side generation

**Implementation:**
```javascript
const csvContent = [
  ['Name', 'Email', 'Phone', 'Region', 'Status', 'Joined Date'].join(','),
  ...members.map(m => [
    m.full_name,
    m.email,
    m.phone || '',
    m.region || '',
    m.membership_status,
    m.joined_date,
  ].join(','))
].join('\n');

const blob = new Blob([csvContent], { type: 'text/csv' });
// Trigger download
```

---

### 7. **Real-Time Updates**

**Features:**
- Live statistics updates
- Automatic data refresh
- Optimistic UI updates
- Toast notifications

**Implementation:**
- React useState hooks
- useEffect for data fetching
- Supabase client queries

---

## Security & Authentication

### Authentication Flow

1. **Login:**
   - User enters credentials
   - Supabase Auth validates
   - JWT token issued
   - Profile loaded from database
   - User redirected to dashboard

2. **Session Management:**
   - Token stored in localStorage
   - Automatic refresh on expiry
   - Context provides auth state

3. **Logout:**
   - Supabase signOut called
   - Token cleared
   - User redirected to login

### Row Level Security (RLS)

**All tables have RLS enabled**

**Policy Types:**
- SELECT: Read access
- INSERT: Create records
- UPDATE: Modify records
- DELETE: Remove records
- ALL: Full access

**Example Policies:**

```sql
-- Finance users can manage revenue
CREATE POLICY "Finance and super admins can manage revenue"
  ON party_revenue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'finance')
      AND profiles.is_active = true
    )
  );
```

### Data Protection

**Sensitive Data:**
- Passwords: Hashed via Supabase Auth
- Payment info: Not stored (references only)
- PII: Protected by RLS policies

**Audit Trail:**
- All records have `created_by`
- Timestamps on all records
- Approval tracking with `approved_by`
- Reconciliation tracking with `reconciled_by`

---

## Integration Points

### 1. **Supabase**
- Database (PostgreSQL)
- Authentication
- Edge Functions
- Row Level Security
- Real-time subscriptions

### 2. **Twilio**
- SMS messaging
- Messaging Service for scalability
- Delivery status callbacks
- International SMS support

### 3. **Google Maps**
- Maps JavaScript API
- Geocoding API
- Places API (for search)

### 4. **Payment Gateways**
- Nedbank Paytoday (integration pending)
- EFT (manual reconciliation)
- Mobile Wallets (integration pending)

---

## Technical Architecture

### Frontend Structure
```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── layout/       # Layout components
│   └── dashboard/    # Dashboard-specific components
├── contexts/
│   └── AuthContext.tsx  # Global auth state
├── hooks/
│   └── use-toast.ts     # Toast notifications
├── lib/
│   ├── supabase.ts      # Supabase client
│   └── utils.ts         # Utility functions
├── pages/               # All page components
└── App.tsx              # Main app with routing
```

### Backend Structure
```
supabase/
├── migrations/          # Database schema migrations
└── functions/
    └── send-message/    # Twilio SMS edge function
```

---

## Environment Variables

**Required:**
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

**Edge Function (Supabase):**
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_SERVICE_SID=your_twilio_messaging_service_sid
```

---

## Deployment Considerations

### Production Checklist

1. **Environment Setup:**
   - Set all environment variables
   - Configure Supabase project
   - Set up Twilio account
   - Get Google Maps API key

2. **Database:**
   - Run all migrations
   - Create super admin user
   - Test RLS policies

3. **Security:**
   - Enable 2FA for super admins
   - Set up backup procedures
   - Configure security rules
   - Review RLS policies

4. **Integrations:**
   - Test Twilio connectivity
   - Verify Google Maps loading
   - Test payment flows

5. **Monitoring:**
   - Set up error tracking
   - Configure logging
   - Monitor API usage
   - Track costs

---

## Future Enhancements

### Potential Features:
1. File upload for receipts/documents
2. Advanced reporting and analytics
3. Email campaigns
4. Volunteer scheduling
5. Event calendar
6. Document management
7. Real-time chat
8. Mobile app integration
9. Automated backups
10. Multi-language support

---

## Summary

This is a **comprehensive political party management system** with:
- ✅ Role-based access control
- ✅ Financial management
- ✅ Campaign planning with maps
- ✅ Member management
- ✅ SMS broadcasting
- ✅ Advertisement management
- ✅ Multi-user collaboration
- ✅ Audit trails
- ✅ Real-time updates
- ✅ Secure authentication

**Technology:** React + TypeScript + Supabase + Tailwind CSS
**Database:** PostgreSQL with RLS
**Key Integrations:** Twilio (SMS), Google Maps, Payment Gateways

**Perfect for:** Political parties, NGOs, community organizations requiring comprehensive back office management.
