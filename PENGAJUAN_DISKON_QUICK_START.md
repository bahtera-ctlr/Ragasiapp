# 🚀 Pengajuan Diskon - Quick Reference

## What's Ready Now

✅ **Form Submission** - Marketing staff can now submit discount requests
✅ **Validation** - All form fields are validated before submission  
✅ **Database** - Schema ready (needs SQL execution)
✅ **Error Handling** - User-friendly error messages
✅ **Type Safety** - Full TypeScript support

---

## Quick Start (3 Steps)

### Step 1️⃣: Create Database Tables (5 minutes)
```
1. Go to: https://app.supabase.com
2. Select your project
3. Click "SQL Editor"
4. Click "New Query"
5. Open file: database/create-discount-limit-requests.sql
6. Copy entire contents
7. Paste in Supabase query box
8. Click "Run"
9. Wait for success message
```

### Step 2️⃣: Start Your App (1 minute)
```bash
npm run dev
# or
yarn dev
```

### Step 3️⃣: Test the Form (2 minutes)
```
1. Go to: http://localhost:3000/marketing
2. Click tab: "💰 Pengajuan Diskon"
3. Click button: "+ Ajukan Diskon Baru"
4. Fill form:
   - Outlet: Select any
   - Product: Select any
   - Discount %: Enter 5
   - Reason: Type any reason
   - Dates: Select start and end dates
5. Click "Ajukan"
6. See success message!
7. Check Supabase table "discount_requests"
```

---

## Form Fields

| Field | Type | Required | Example |
|-------|------|----------|---------|
| Outlet | Dropdown | ✅ | "16010001-1 - PT OUTLET NAME" |
| Product | Dropdown | ✅ | "Kopi Premium" |
| Discount % | Number | ✅ | 5 |
| Reason | Text | ✅ | "Customer bulk order" |
| Start Date | Date | ✅ | 2024-01-15 |
| End Date | Date | ✅ | 2024-01-31 |

---

## Error Messages (What They Mean)

| Message | What to Do |
|---------|-----------|
| "Pilih outlet terlebih dahulu" | Select outlet from dropdown |
| "Pilih barang terlebih dahulu" | Select product from dropdown |
| "Persentase diskon harus lebih dari 0" | Enter discount % > 0 |
| "Alasan diskon harus diisi" | Type a reason for discount |
| "Periode berlaku harus diisi" | Select both start and end dates |
| "Tanggal mulai harus sebelum tanggal akhir" | Start date must be before end date |

---

## What Happens After Submission ✅

1. Form validates all fields
2. Data sent to database
3. Record created with `status: 'pending'`
4. Success message shows: *"Pengajuan diskon berhasil dibuat! Menunggu persetujuan admin."*
5. Modal closes automatically
6. Form clears for next entry

---

## File Changes Summary

**Created:**
- `database/create-discount-limit-requests.sql` - Database schema
- `lib/discount-requests.ts` - Backend functions
- `PENGAJUAN_DISKON_SETUP.md` - Full setup guide
- `PENGAJUAN_IMPLEMENTATION_CHECKLIST.md` - Task checklist

**Modified:**
- `app/marketing/page.tsx` - Added form logic

---

## If Something Goes Wrong

### Modal won't open
- Check if you're logged in
- Check browser console (F12 → Console tab)
- Try refreshing page

### Dropdowns are empty
- Check browser network tab (F12 → Network)
- Verify outlets/products exist in database
- Wait a moment for loading

### Form won't submit
- Check all fields are filled correctly
- Check no date errors
- Look at browser console for errors

### Database error after "Ajukan"
- Make sure you ran the SQL migration
- Check Supabase dashboard → Tables
- Verify `discount_requests` table exists

---

## Database Tables Created

After running the SQL:
- ✅ `discount_requests` - Main table
- ✅ `limit_requests` - For limit increases
- ✅ `withdrawal_history` - For withdrawal tracking

---

## What's Next? (Future Phases)

**Phase 2:** Pengajuan Limit - Similar form for credit limit requests
**Phase 3:** Historis Pengambilan - View withdrawal history
**Phase 4:** Admin Approval - Admin panel to approve/reject requests

---

## Need Help?

1. Read: `PENGAJUAN_DISKON_SETUP.md` (complete guide)
2. Check: Browser console for error messages
3. Verify: Database migration was executed
4. Ask: Check if user has "marketing" role

---

## Testing Checklist ✓

- [ ] Database tables created (run SQL)
- [ ] App starts without errors
- [ ] Can open Pengajuan Diskon modal
- [ ] Can select outlet from dropdown
- [ ] Can select product from dropdown
- [ ] Can fill all form fields
- [ ] Can click "Ajukan" button
- [ ] See success message
- [ ] Record appears in Supabase

---

**Status: Ready to Deploy! 🎉**
