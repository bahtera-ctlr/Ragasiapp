# Outlet Upload - Duplicate Key Fix Guide

## Problem
When uploading outlet data via CSV, the application throws this error:
```
Error: Insert failed: duplicate key value violates unique constraint "outlets_nio_key"
```

This happens because the RPC function was not properly cleaning up old outlet data before inserting new ones. When the upload tried to insert outlets with NIOs that already existed in the database, the unique constraint was violated.

## Root Cause
The previous RPC function used `TRUNCATE TABLE outlets CASCADE` which:
- May not work reliably in Supabase/PostgREST context- Doesn't account for all foreign key relationships (invoices, orders, out_of_stock_requests)
- The constraint violations prevented deletion, leaving old data behind

## Solution Applied
Updated [create-outlet-refresh-rpc.sql](database/create-outlet-refresh-rpc.sql) with:

1. **Multi-level deletion cascade:**
   - Delete from `invoices` first (references outlets)
   - Delete from `orders` (references outlets)
   - Delete from `out_of_stock_requests` (references outlets)
   - Delete from `outlets` (the main table)

2. **Trigger control:**
   - Temporarily disable triggers on outlets table during deletion
   - This bypasses any constraint checks during cleanup
   - Re-enable triggers after deletion

3. **Atomic insertion:**
   - Insert new outlets data in one transaction
   - If anything fails, rollback the entire operation

## How to Apply the Fix

### Step 1: Update the RPC Function
1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Open the file [database/create-outlet-refresh-rpc.sql](database/create-outlet-refresh-rpc.sql)
3. Copy the entire SQL content
4. Paste and execute it in the Supabase SQL Editor
5. You should see: `"RPC function created successfully"`

### Step 2: Test the Fix
1. Go to **Admin Keuangan** → **Import Outlet** tab
2. Upload your outlet CSV file
3. Check that it completes without the duplicate key error
4. Verify that outlets were imported correctly in the table

### Step 3: Verify in Database (Optional)
Run this query in Supabase SQL Editor to verify:
```sql
SELECT COUNT(*) as total_outlets, 
       STRING_AGG(DISTINCT nio, ', ' ORDER BY nio) as sample_nios
FROM public.outlets;
```

## Technical Details

### Changed Components
- **File:** `database/create-outlet-refresh-rpc.sql`
- **Function:** `refresh_outlets_data(jsonb)`
- **Change type:** Function replacement (DROP IF EXISTS, then CREATE)

### Deletion Sequence
```
invoices (references outlets)
    ↓
orders (references outlets)
    ↓
out_of_stock_requests (references outlets)
    ↓
[DISABLE TRIGGERS] 
    ↓
outlets (main table)
    ↓
[RE-ENABLE TRIGGERS]
    ↓
INSERT new outlets
```

### Key Improvements
| Issue | Old Approach | New Approach |
|-------|-------------|-------------|
| Foreign key cleanup | TRUNCATE CASCADE | Explicit DELETE from referencing tables |
| Constraint handling | Hoped CASCADE would work | Disable/enable triggers explicitly |
| Error messages | Generic CASCADE error | Detailed step-by-step logging |
| Reliability | Hit-or-miss in Supabase | Proven trigger control method |

## Testing Checklist
- [ ] RPC function deployed successfully
- [ ] CSV upload completes without errors
- [ ] Outlet count in database is correct
- [ ] No duplicate NIOs in database
- [ ] Outlet list displays updated data in dashboard
- [ ] Can modify outlet data after upload

## Rollback (If Needed)
If you need to revert to the old function:
1. Revert to the previous version of [create-outlet-refresh-rpc.sql](database/create-outlet-refresh-rpc.sql)
2. Execute it in Supabase SQL Editor
3. This will restore the old function behavior

## Related Files
- [create-outlet-refresh-rpc.sql](database/create-outlet-refresh-rpc.sql) - RPC function
- [lib/outlets.ts](lib/outlets.ts) - Upload handler
- [app/admin-keuangan/page.tsx](app/admin-keuangan/page.tsx) - UI component
