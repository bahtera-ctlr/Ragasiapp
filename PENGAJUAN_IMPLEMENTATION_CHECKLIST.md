# Marketing Dashboard - Implementation Checklist

## ✅ Phase 1: Pengajuan Diskon Form Submission (COMPLETE)

### Database
- [x] Create `discount_requests` table
- [x] Create `limit_requests` table  
- [x] Create `withdrawal_history` table
- [x] Add RLS policies
- [x] Create performance indexes

### Backend (lib/discount-requests.ts)
- [x] Create `createDiscountRequest()` function
- [x] Create `getDiscountRequests()` function
- [x] Create `createLimitRequest()` function
- [x] Create `getLimitRequests()` function
- [x] Create `createWithdrawalHistory()` function
- [x] Create `getWithdrawalHistory()` function
- [x] Add TypeScript interfaces
- [x] Implement error handling

### Frontend (app/marketing/page.tsx)
- [x] Import `createDiscountRequest` function
- [x] Add date state variables (`startDateDiscount`, `endDateDiscount`)
- [x] Add loading state (`submittingDiscount`)
- [x] Create `handleSubmitDiscountRequest()` handler
- [x] Add validation logic
- [x] Connect date inputs to state
- [x] Connect "Ajukan" button to handler
- [x] Add loading indicators to buttons
- [x] Add success/error notifications

### Testing
- [ ] Run database migration SQL
- [ ] Test outlet dropdown population
- [ ] Test product dropdown population
- [ ] Test form field validation
- [ ] Test successful form submission
- [ ] Verify database record creation
- [ ] Test error handling
- [ ] Test form reset after submission

---

## 📋 Phase 2: Pengajuan Limit Form (TODO)

### Frontend Updates Needed
- [ ] Create similar modal for Pengajuan Limit
- [ ] Add outlet dropdown (similar to discount modal)
- [ ] Add current limit field (read-only, fetched from outlets)
- [ ] Add requested limit field (user input, number)
- [ ] Add reason field (textarea)
- [ ] Add form validation
- [ ] Create `handleSubmitLimitRequest()` handler
- [ ] Connect to `createLimitRequest()` function

### Features
- [ ] Display all existing limit requests in tab
- [ ] Show status of each request (pending, approved, rejected)
- [ ] Allow viewing request details

---

## 📋 Phase 3: Historis Pengambilan (TODO)

### Frontend Implementation
- [ ] Create table to display withdrawal history
- [ ] Add `getWithdrawalHistory()` call in useEffect
- [ ] Display columns: Date, Outlet, Amount, Notes
- [ ] Add filtering/search for withdrawal history
- [ ] Add date range filter
- [ ] Show total withdrawal for selected period

### Backend Function
- [ ] Implement `createWithdrawalHistory()` call (may be auto-triggered)
- [ ] Create admin function to add withdrawal records

---

## 🔧 Phase 4: Admin Approval Interface (TODO)

### New Page: admin-keuangan or super-admin panel
- [ ] View pending discount requests
- [ ] View pending limit requests
- [ ] Approve with notes
- [ ] Reject with notes
- [ ] View approval history

### Database Updates
- [ ] Create update permissions in RLS policies
- [ ] Allow admin to set approved_by, approved_at, status, approval_notes

---

## 📊 Current Implementation Status

| Feature | Database | Backend | Frontend | Testing |
|---------|----------|---------|----------|---------|
| Pengajuan Diskon | ✅ | ✅ | ✅ | 📋 |
| Pengajuan Limit | ✅ | ✅ | ❌ | ❌ |
| Historis Pengambilan | ✅ | ✅ | ❌ | ❌ |
| Admin Approval | ❌ | ❌ | ❌ | ❌ |

---

## 🚀 Quick Start for Testing

1. **Run Database Migration**
   ```bash
   # Go to Supabase SQL Editor and run:
   # /database/create-discount-limit-requests.sql
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. **Access Marketing Dashboard**
   ```
   http://localhost:3000/marketing
   ```

4. **Test Pengajuan Diskon**
   - Click "💰 Pengajuan Diskon" tab
   - Click "+ Ajukan Diskon Baru"
   - Fill form and submit
   - Check Supabase for record

---

## 📝 Files Modified/Created

### Created Files
- [x] `database/create-discount-limit-requests.sql` - Database schema
- [x] `lib/discount-requests.ts` - Backend functions
- [x] `PENGAJUAN_DISKON_SETUP.md` - Setup documentation

### Modified Files
- [x] `app/marketing/page.tsx` - Form implementation and handlers

### Unchanged Files (Ready for Next Phase)
- [ ] `app/marketing/page.tsx` - Will need updates for Pengajuan Limit
- [ ] `app/marketing/page.tsx` - Will need updates for Historis Pengambilan

---

## 🎯 Next Immediate Action

**Execute this step to complete Phase 1:**

1. Open Supabase dashboard
2. Go to SQL Editor
3. Copy entire contents of `database/create-discount-limit-requests.sql`
4. Paste into new query
5. Click "Run" button
6. Verify no errors in output

**Then test the form in browser**
