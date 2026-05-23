# Pengajuan Diskon Form Submission - Setup & Testing Guide

## Overview
The Pengajuan Diskon (Discount Request) feature is now fully implemented with:
- ✅ Searchable dropdown for outlets
- ✅ Searchable dropdown for products
- ✅ Form validation
- ✅ Database submission logic
- ✅ Loading states and error handling

## Step 1: Database Setup (Required)

### Execute the Database Migration
Run the SQL migration to create the required tables:

**File**: `database/create-discount-limit-requests.sql`

This migration creates:
1. `discount_requests` table - stores discount request proposals
2. `limit_requests` table - stores limit increase requests
3. `withdrawal_history` table - stores withdrawal records

**To run:**
1. Go to Supabase dashboard: https://app.supabase.com
2. Navigate to your project
3. Go to SQL Editor
4. Create a new query
5. Copy the entire contents of `database/create-discount-limit-requests.sql`
6. Execute the query

**What the script does:**
- Creates 3 new tables with proper relationships
- Enables Row Level Security (RLS) on all tables
- Creates RLS policies for data access control
- Creates indexes for query performance

## Step 2: Code Implementation (Already Done ✅)

The following code changes have been made:

### 1. Database Library Functions
**File**: `lib/discount-requests.ts`

Functions available:
```typescript
// Create discount request
createDiscountRequest(outletId, productId, discountPercentage, reason, startDate, endDate)

// Fetch user's discount requests
getDiscountRequests()

// Create limit request
createLimitRequest(outletId, currentLimit, requestedLimit, reason)

// Fetch user's limit requests  
getLimitRequests()

// Add withdrawal history
createWithdrawalHistory(outletId, amount, withdrawalDate, notes)

// Fetch withdrawal history
getWithdrawalHistory()
```

### 2. Marketing Dashboard Updates
**File**: `app/marketing/page.tsx`

Changes:
- Added imports for `createDiscountRequest` function
- Added form states:
  - `startDateDiscount` - discount start date
  - `endDateDiscount` - discount end date
  - `submittingDiscount` - loading state during submission
- Added `handleSubmitDiscountRequest()` function with:
  - Full form validation
  - Database submission
  - Error handling
  - Form reset after success
- Connected modal form elements:
  - Date inputs now bound to state
  - "Ajukan" button connected to handler
  - Loading state UI updates

## Step 3: Testing the Feature

### Test 1: Open the Pengajuan Diskon Modal
1. Navigate to http://localhost:3000/marketing
2. Click the "💰 Pengajuan Diskon" tab
3. Click "+ Ajukan Diskon Baru" button
4. Verify modal opens without errors

### Test 2: Test Outlet Dropdown
1. In the modal, click on "Cari outlet..." input
2. Start typing an outlet name or NIO
3. Verify dropdown filters outlets correctly
4. Select an outlet and verify it displays as "NIO - Name"

### Test 3: Test Product Dropdown
1. In the modal, click on "Cari barang..." input
2. Verify products load (should see "Loading..." then product list)
3. Start typing a product name
4. Verify dropdown filters products correctly
5. Select a product

### Test 4: Test Form Validation
Try submitting without filling all fields:

**Test 4a: No outlet selected**
- Fill other fields but leave outlet empty
- Click "Ajukan"
- Should see: "Pilih outlet terlebih dahulu"

**Test 4b: No product selected**
- Fill outlet and other fields but leave product empty
- Click "Ajukan"
- Should see: "Pilih barang terlebih dahulu"

**Test 4c: Invalid discount percentage**
- Enter "0" or leave discount percentage empty
- Click "Ajukan"
- Should see: "Persentase diskon harus lebih dari 0"

**Test 4d: No reason provided**
- Fill other fields but leave reason empty
- Click "Ajukan"
- Should see: "Alasan diskon harus diisi"

**Test 4e: Invalid date range**
- Set start date after end date
- Click "Ajukan"
- Should see: "Tanggal mulai harus sebelum tanggal akhir"

### Test 5: Test Successful Submission
1. Fill all fields correctly:
   - Outlet: Select any outlet
   - Product: Select any product
   - Discount %: Enter "5"
   - Reason: "Test discount request"
   - Start date: Today
   - End date: 7 days from now
2. Click "Ajukan"
3. Verify:
   - Button shows "Sedang Mengajukan..." during submission
   - Success message appears: "Pengajuan diskon berhasil dibuat! Menunggu persetujuan admin."
   - Modal closes automatically
   - Form is cleared for next submission

### Test 6: Check Database
1. Go to Supabase dashboard
2. Open the `discount_requests` table
3. Verify your test record appears with:
   - Correct outlet_id
   - Correct product_id
   - Correct discount_percentage (5)
   - status = 'pending'
   - created_at = current timestamp

## Step 4: Troubleshooting

### Issue: Modal doesn't open
- Check browser console for errors (F12 → Console)
- Verify you're logged in as a marketing user
- Check that the tab click event is firing

### Issue: Outlets dropdown is empty
- Verify outlets table has data
- Check that `getOutlets()` function is working
- Look at browser network tab to see if API call succeeds

### Issue: Products dropdown won't load
- Check browser console for errors
- Verify products table has data
- May need to increase `batchSize` in `fetchProducts()` if there are many products

### Issue: Form submission fails
- Check browser console for specific error message
- Verify user is authenticated (check `auth.uid()`)
- Ensure RLS policies allow insert on `discount_requests` table
- Check that outlet_id and product_id are valid UUIDs

### Issue: Getting "User not authenticated" error
- User must be logged in before using the modal
- Check that authentication is working on the dashboard
- Try logging out and logging back in

## Step 5: Next Features to Implement

### Pengajuan Limit Feature
Similar to Pengajuan Diskon but:
- Only needs outlet selection (not product)
- Shows current limit (read-only from outlets table)
- Asks for requested new limit
- Uses `createLimitRequest()` function

### Historis Pengambilan Feature
- Displays withdrawal history for marketing user
- Uses `getWithdrawalHistory()` function
- Shows table with outlet, amount, date, and notes

### Admin Approval Interface
- Create new admin panel to view pending requests
- Show discount/limit requests awaiting approval
- Allow approve/reject with notes
- Uses update policies to modify requests

## Database Schema Reference

### discount_requests table
```sql
id UUID PRIMARY KEY
marketing_id UUID NOT NULL (references auth.users)
outlet_id UUID NOT NULL (references outlets)
product_id UUID NOT NULL (references products)
discount_percentage NUMERIC NOT NULL
reason TEXT NOT NULL
start_date DATE NOT NULL
end_date DATE NOT NULL
status TEXT ('pending', 'approved', 'rejected')
approval_notes TEXT
approved_by UUID (references auth.users)
approved_at TIMESTAMP
created_at TIMESTAMP
updated_at TIMESTAMP
```

### limit_requests table
```sql
id UUID PRIMARY KEY
marketing_id UUID NOT NULL (references auth.users)
outlet_id UUID NOT NULL (references outlets)
current_limit NUMERIC NOT NULL
requested_limit NUMERIC NOT NULL
reason TEXT NOT NULL
status TEXT ('pending', 'approved', 'rejected')
approval_notes TEXT
approved_by UUID (references auth.users)
approved_at TIMESTAMP
created_at TIMESTAMP
```

### withdrawal_history table
```sql
id UUID PRIMARY KEY
marketing_id UUID NOT NULL (references auth.users)
outlet_id UUID NOT NULL (references outlets)
amount NUMERIC NOT NULL
withdrawal_date DATE NOT NULL
notes TEXT
created_at TIMESTAMP
```

## Success Criteria

✅ Form opens without errors
✅ Dropdowns populate with data
✅ Form validation works correctly
✅ Successful submission creates database record
✅ Error messages display appropriately
✅ Form resets after successful submission
✅ Can submit multiple requests in succession
✅ RLS policies restrict access appropriately
