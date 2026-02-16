# Dashboard Data Issue - Fix Guide

## Problem Identified

The dashboard shows no data because the database tables are **empty** or you don't have sufficient data to display statistics.

## Solution: Database Diagnostic Tool

I've created a comprehensive diagnostic tool to help you identify and fix the issue.

### How to Access

1. Navigate to: **`/database-diagnostic`** in your browser
2. Or visit: `http://localhost:5173/database-diagnostic`

### What It Does

The diagnostic tool:

1. **Checks All Tables**: Tests access to every database table
2. **Shows Row Counts**: Displays how many records are in each table
3. **Identifies Errors**: Shows RLS policy errors or permission issues
4. **Seeds Sample Data**: One-click button to populate with test data

## Quick Fix Steps

### Step 1: Run Diagnostics
1. Go to `/database-diagnostic`
2. Click **"Run Diagnostics"**
3. Review the results

### Step 2: Seed Sample Data
If tables show 0 rows:
1. Click **"Seed Sample Data"**
2. Wait for completion (you'll see success toasts)
3. Click **"Run Diagnostics"** again to verify

### Step 3: Return to Dashboard
1. Go back to the main Dashboard (`/`)
2. Refresh the page
3. You should now see data displayed

## What Gets Seeded

The seeding tool creates:

### Party Members (5 sample members)
- John Kapenda (Khomas)
- Maria Shikongo (Oshana)
- David Nambala (Erongo)
- Sarah Hamutenya (Otjozondjupa)
- Peter Nghidinwa (Omaheke)

### Memberships
- Links party members to your account
- Generates membership numbers
- Sets regions for map display

### Broadcasts (3 posts)
- Welcome message
- Regional meeting reminder
- Community cleanup thank you
- Includes likes and comments counts

### Campaigns (2 active campaigns)
- Youth Empowerment Initiative (N$500K target, 25% funded)
- Community Infrastructure Fund (N$1M target, 35% funded)

### Polls (1 active poll)
- "What should be our next community initiative?"
- 4 voting options with sample votes

## Dashboard Stats After Seeding

Once data is seeded, you'll see:
- **Total Members**: ~5
- **New Registrations**: Current month stats
- **Broadcasts Sent**: 3 published posts
- **Campaign Funds**: ~N$0.5M raised
- **Member Distribution Map**: Markers across Namibia
- **Membership Growth Chart**: 6-month trend
- **Recent Activity**: Latest members, broadcasts, campaigns

## Troubleshooting

### Tables Show Errors

**Error: "Permission denied for table X"**
- RLS policies are blocking access
- Check your user role in the `profiles` table
- Ensure you're authenticated

**Error: "Relation does not exist"**
- Database migrations haven't been applied
- Run migrations in `supabase/migrations/`

### Seeding Fails

**Error: "Not authenticated"**
- Log out and log back in
- Check browser console for auth errors

**Error: "Duplicate key value"**
- Data already exists
- Safe to ignore - existing data is preserved

### Data Still Not Showing

1. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R)
2. **Check Console**: Open browser DevTools → Console tab
3. **Verify Queries**: Look for Supabase error messages
4. **Check RLS**: Ensure your profile has proper role access

## Understanding the Dashboard Queries

The dashboard makes these queries:

```typescript
// Total members from memberships table
supabase.from('memberships').select('id', { count: 'exact', head: true })

// Published broadcasts
supabase.from('broadcasts').select('id').eq('status', 'published')

// Active campaigns with raised amounts
supabase.from('campaigns').select('raised_amount').eq('status', 'active')

// Member distribution by region
supabase.from('memberships').select('region')
```

If any of these fail, you'll see zeros or errors in the dashboard.

## Production Considerations

### Before Going Live

1. **Remove Sample Data**: Delete test records
2. **Import Real Data**: Use CSV imports or API integrations
3. **Set Up Backups**: Configure automatic database backups
4. **Monitor RLS**: Ensure policies match your security requirements

### Data Import Options

- **Manual Entry**: Use the Members page to add real members
- **CSV Import**: Prepare spreadsheets with member data
- **API Integration**: Connect external member databases
- **Bulk Upload**: Use Supabase SQL editor for large datasets

## Next Steps

1. ✅ Run diagnostic tool
2. ✅ Seed sample data
3. ✅ Verify dashboard displays data
4. 🔄 Add more real data as needed
5. 📊 Configure additional analytics

## Still Having Issues?

Check these files for troubleshooting:
- `src/pages/Dashboard.tsx` - Main dashboard logic
- `src/components/dashboard/RecentActivity.tsx` - Activity feed
- `src/components/dashboard/MembershipChart.tsx` - Growth chart
- `src/components/dashboard/NamibiaMap.tsx` - Regional map

Look for console errors and check the network tab in DevTools to see which API calls are failing.
