# Issue Analysis & Fix Plan

**Generated:** March 9, 2026  
**Status:** Awaiting Approval

---

## ISSUE ANALYSIS

### 1. **Communities - Member Visibility Issues**

#### Problem 1A: Dropdown shows only members when adding users
**Root Cause:** The `fetchAvailableMembers()` function queries the `memberships` table with `status: 'approved'`. This limits users shown in the dropdown to only those with approved memberships.

**Location:** Dashboard - [Communities.tsx](src/pages/Communities.tsx#L117)

**Fix Location:**
- **Dashboard**: Update the member dropdown to show only approved members (CORRECT - no change needed)
- **Mobile App**: The mobile app needs a separate "Join Community" feature where non-members can browse and join communities without needing an existing membership

---

#### Problem 1B: Member doesn't show up when they join themselves
**Root Cause:** When a user joins a community from the mobile app, they're added to `community_members` table, but the dashboard doesn't refresh in real-time. Also, there's likely a missing real-time subscription or the user is querying their membership data after joining.

**Fix Location:**
- **Dashboard**: Needs real-time subscriptions using Supabase's subscribe() function for `community_members` table
- **Mobile App**: Likely needs a UI refresh/refetch after successful join

---

### 2. **User Management - "Region Classification Not Loaded Yet" Error**

**Root Cause:** The error originates from the approval workflow. When approving/rejecting membership requests from the mobile app, the backend/function is trying to fetch region classification data before it's available or the field is missing from the approval payload.

**Fix Location:**
- **Dashboard**: The approval flow likely needs validation to ensure region data exists
- **Mobile App**: The membership request needs to include proper region classification before approval

**Suspected Issue:** In the membership approval process, the system expects a `region_classification` field that hasn't been populated or is being fetched asynchronously.

---

### 3. **Broadcasting - Schedule Time Redesign**

**Problems:**
- UI/UX of schedule time picker is awkward
- No visual feedback on scheduled time
- Date/time picker may not be intuitive

**Fix Location:**
- **Dashboard**: [BroadcastingEnhanced.tsx](src/pages/BroadcastingEnhanced.tsx) - Redesign the date/time picker UI component
- Uses `date-fns` library for date handling
- Need to improve the calendar picker interface

---

### 4. **Broadcasting - Real-time Feed Not showing Broadcasts**

**Root Cause:** 
- Broadcasts are being saved to the `broadcasts` table
- The dashboard queries broadcasts but doesn't subscribe to real-time changes
- Missing Supabase `.on('*')` subscriptions for the `broadcasts` table

**Fix Location:**
- **Dashboard**: [BroadcastingEnhanced.tsx](src/pages/BroadcastingEnhanced.tsx#L172) - Add real-time subscription to broadcasts table
- The `fetchBroadcasts()` function only does one-time queries, not subscriptions

---

### 5. **Polls - Votes Showing in DB but Not on Dashboard**

**Root Cause:**
- Votes are saved in `poll_responses` table correctly
- Dashboard doesn't aggregate/display vote counts properly
- Missing real-time subscription for `poll_responses` updates
- The polls display might be joining to `poll_options` but not recalculating vote_count from responses

**Fix Location:**
- **Dashboard**: [Polls.tsx](src/pages/Polls.tsx#L77) - Need to:
  1. Create a computed/cached vote count from `poll_responses` when displaying polls
  2. Add real-time subscription for vote changes
  3. Include join to `poll_responses` to count votes per option

---

### 6. **Adverts - 400 Bad Request Error**

**Root Cause:** 
- The `handleCreateAdvert()` function is sending data but likely missing required fields or field validation
- Could be an issue with:
  - Missing `created_by` field
  - Type mismatch in `media_urls` (should be array or null)
  - Missing `app_adverts` table in database or RLS policy issues

**Fix Location:**
- **Dashboard**: [Adverts.tsx](src/pages/Adverts.tsx#L271) - Improve error handling to show detailed error
- Check if `created_by` is being included
- Verify `media_urls` array format
- Ensure RLS policies on `app_adverts` table allow authenticated users to insert

---

### 7. **Notifications - Selective Notification System for Roles**

**Current Implementation:**
- `sendRoleNotification()` function exists and can target specific roles
- Notifications are saved to both `notifications` and `push_notifications` tables

**Required Map:**

| Event | Finance | Administrator | Super Admin | Comms Officer |
|-------|---------|---|---|---|
| New Donation | ✓ | ✓ | ✓ | ✗ |
| New Order/Store Transaction | ✓ | ✓ | ✓ | ✗ |
| New Member Request | ✗ | ✓ | ✓ | ✗ |
| Membership Approved | ✗ | ✓ | ✓ | ✗ |
| New Campaign Created | ✗ | ✓ | ✓ | ✓ |
| New Poll Created | ✗ | ✓ | ✓ | ✓ |
| New Advert Created | ✗ | ✓ | ✓ | ✓ |
| New Community Created | ✗ | ✓ | ✓ | ✓ |
| Broadcast Created | ✗ | ✓ | ✓ | ✓ |
| New Expense Report | ✓ | ✓ | ✓ | ✗ |
| Payment Received | ✓ | ✓ | ✓ | ✗ |

**Fix Location:**
- **Dashboard**: Update `sendRoleNotification()` calls to send to specific roles instead of all admins
- **Mobile App**: Display notifications in real-time subscription
- **Functions**: Update Supabase Edge Functions to trigger appropriate notifications

---

## FIX PRIORITY & IMPACT ASSESSMENT

### HIGH PRIORITY (Blocking functionality)
1. **Polls - Votes not displaying** - Users can't see poll results
2. **Adverts - 400 Bad Request** - Feature completely broken
3. **Broadcasting - Real-time feed** - Feed not updating in real-time

### MEDIUM PRIORITY (Affecting UX)
1. **Communities - Member visibility** - Workflow is incomplete
2. **Broadcasting - Schedule redesign** - Usability issue
3. **User Management - Region error** - Blocks approval workflow

### LOW PRIORITY (Non-blocking but good to have)
1. **Notifications - Selective routing** - Currently sends to all, but not critical

---

## IMPLEMENTATION APPROACH

### Safe Implementation Strategy
1. All changes use **real-time subscriptions** which don't break existing functionality
2. **RLS policies** won't be modified - only existing policies will be used
3. **Database schema** is unchanged - only table joins and filters are added
4. **Frontend state management** uses React hooks (useState/useEffect) - no new dependencies
5. **Real-time subscriptions** will be cleaned up on component unmount to prevent memory leaks

### Components to Modify

**Dashboard Side (4 files):**
1. `Communities.tsx` - Add real-time subscription, improve member join feedback
2. `BroadcastingEnhanced.tsx` - Add real-time subscription for broadcasts, redesign scheduler
3. `Polls.tsx` - Fix vote display by including poll_responses in query
4. `Adverts.tsx` - Add better error logging for 400 error diagnosis

**Mobile App Side (4 files):**
1. Communities join feature - Allow non-members to join
2. Membership approval - Fix region classification error
3. Poll voting - Ensure proper data structure
4. Notification display - Implement real-time subscription

**Backend/Functions (1 file):**
1. Notification triggers - Update to use selective role-based notifications

---

## RISK ANALYSIS

✅ **LOW RISK** - Changes are:
- Additive (adding real-time subscriptions, not removing)
- Isolated (each component is independent)
- Non-breaking (existing features continue to work)
- Tested patterns (real-time subscriptions are standard in Supabase)

⚠️ **POTENTIAL ISSUES:**
- Real-time subscriptions could create memory leaks if not cleaned up properly
- Adding many subscriptions could increase client connection load
- Broadcasting redesign requires careful testing to ensure date/time picker works across browsers

---

## PROPOSED FIX SEQUENCE

1. **Phase 1 - Real-time Updates** (Low Risk, High Impact)
   - Add subscriptions to `broadcasts`, `poll_responses`, `community_members`
   - Fixes issues #3, #4, #5, #1B

2. **Phase 2 - Data Display Fixes** (Low Risk)
   - Fix poll vote aggregation
   - Improve members visibility
   - Fixes issues #1A, #5

3. **Phase 3 - UI/UX Improvements** (Medium Risk)
   - Redesign broadcast scheduler
   - Improve error messages
   - Fixes issue #3, #6

4. **Phase 4 - Backend Fixes** (Medium Risk)
   - Fix region classification error
   - Implement selective notifications
   - Fixes issues #2, #7

---

## QUESTIONS FOR YOUR CONFIRMATION

Before proceeding, please confirm:

1. ✅ Should I proceed with adding real-time Supabase subscriptions to dashboard components?
2. ✅ Should I investigate the Adverts 400 error by adding more detailed error logging first?
3. ✅ Should the notification system be selective (as proposed in the map) or keep sending to all admins?
4. ✅ For the Broadcasting scheduler - should I redesign it with a calendar picker + time selector (separate)?
5. ✅ For Communities - should I add a pre-join confirmation dialog to prevent accidental joins?
6. ✅ Are there any other components I should NOT modify to avoid breaking dependencies?

---

## NEXT STEPS (Upon Approval)

1. Implement fixes in order of phases
2. Test each fix on the dashboard
3. Coordinate with mobile app team for their fixes
4. Update database documentation
5. Create test cases for real-time subscriptions

---
