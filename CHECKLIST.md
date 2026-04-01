# ✅ Setup Checklist - Role-Based Features

## Before You Start
- [ ] Project sudah di-setup di Part 1 (Auth)
- [ ] `npm run dev` berjalan lancar
- [ ] Bisa login dengan test account

---

## Database Setup

- [ ] Copy SQL dari `database/orders_invoices.sql`
- [ ] Buka Supabase dashboard
- [ ] Go to SQL Editor → New Query
- [ ] Paste SQL dan click RUN
- [ ] Verify semua 4 tables create successfully:
  - [ ] `orders` table exist
  - [ ] `invoices` table exist
  - [ ] `shipments` table exist
  - [ ] `staging_products` table exist

---

## Create Test Accounts

**In app:**
- [ ] Logout dari current account
- [ ] Create account: `keuangan@test.com` - Role: `admin_keuangan`
- [ ] Create account: `marketing@test.com` - Role: `marketing`
- [ ] Create account: `fakturis@test.com` - Role: `fakturis`
- [ ] Create account: `logistik-in@test.com` - Role: `admin_logistik`
- [ ] Create account: `logistik-out@test.com` - Role: `admin_ekspedisi`

---

## Test Each Role

### Admin Keuangan
- [ ] Login dengan `keuangan@test.com`
- [ ] Auto redirect ke `/admin-keuangan`
- [ ] View Data Outlet tab:
  - [ ] Show outlet list
  - [ ] Can export CSV
- [ ] View Invoice Management tab:
  - [ ] Show invoice list
  - [ ] Can click "Release Invoice"
- [ ] Logout

### Marketing
- [ ] Login dengan `marketing@test.com`
- [ ] Auto redirect ke `/marketing`
- [ ] View Sales Orders tab:
  - [ ] Show order list (empty first time)
  - [ ] Can click "+ Buat Sales Order Baru"
- [ ] Click "+ Buat Sales Order Baru":
  - [ ] Redirect to `/sales`
  - [ ] Can create order with products
  - [ ] Can post order
- [ ] Back to `/marketing`:
  - [ ] New order show up in Sales Orders tab
  - [ ] Can click "Edit" button
- [ ] View Invoices tab
- [ ] Logout

### Fakturis
- [ ] Login dengan `fakturis@test.com`
- [ ] Auto redirect ke `/fakturis`
- [ ] View invoice list:
  - [ ] Show all invoices
  - [ ] Can filter by status
  - [ ] Can click "View Details"
- [ ] Logout

### Admin Logistik In
- [ ] Login dengan `logistik-in@test.com`
- [ ] Auto redirect ke `/admin-logistik-in`
- [ ] Upload Tab:
  - [ ] Can upload CSV file
  - [ ] Show success message
- [ ] Packing Tab:
  - [ ] Show shipment list
  - [ ] Can add packing notes
  - [ ] Can click "Mulai Packing"
  - [ ] Status changed to "packing"
  - [ ] Can click "Selesai Packing"
  - [ ] Status changed to "packed"
- [ ] Logout

### Admin Ekspedisi
- [ ] Login dengan `logistik-out@test.com`
- [ ] Auto redirect ke `/admin-logistik-out`
- [ ] View shipments:
  - [ ] Show shipment list
  - [ ] Can filter by status
  - [ ] Show order details
- [ ] Test status transitions:
  - [ ] Can change packed → shipped
  - [ ] Can add delivery notes
  - [ ] Can change shipped → delivered
  - [ ] Show success message
- [ ] Logout

---

## Full Integration Test

**Scenario: Complete Order Flow**

- [ ] **Step 1 - Marketing creates order:**
  - Login `marketing@test.com`
  - Create and post order
  - Verify order appears in dashboard

- [ ] **Step 2 - Admin Keuangan releases invoice:**
  - Login `keuangan@test.com`
  - Release invoice
  - Verify status changed

- [ ] **Step 3 - Fakturis views invoice:**
  - Login `fakturis@test.com`
  - View released invoice
  - Verify details correct

- [ ] **Step 4 - Logistik In packs order:**
  - Login `logistik-in@test.com`
  - Start packing
  - Finish packing
  - Verify status = "packed"

- [ ] **Step 5 - Logistik Out ships and delivers:**
  - Login `logistik-out@test.com`
  - Start shipping (packed → shipped)
  - Mark delivered (shipped → delivered)
  - Verify status = "delivered"

---

## Verify RLS & Security

- [ ] **Role Isolation:**
  - [ ] Admin Keuangan cannot access Marketing page
  - [ ] Marketing cannot access Fakturis page
  - [ ] etc.

- [ ] **Data Privacy:**
  - [ ] Marketing dapat hanya lihat own orders
  - [ ] Changes hanya pihak-pihak authorized saja
  - [ ] Cannot modify data of other departments

---

## Performance & Loading

- [ ] Page loading speed reasonable (< 3 seconds)
- [ ] No console errors saat navigate
- [ ] Export CSV works without freezing
- [ ] File upload handles large files

---

## Documentation & Files

- [ ] Read SYSTEM_GUIDE.md
- [ ] Read SETUP_FEATURES.md
- [ ] Understand database schema
- [ ] Know where each file is located

---

## Optional Enhancements (For Later)

- [ ] Add email notifications
- [ ] Add dashboard statistics
- [ ] Add audit logging
- [ ] Add more detailed reporting
- [ ] Add mobile app version
- [ ] Add integration with other systems

---

## Production Deployment

Before going live:
- [ ] Setup production Supabase project
- [ ] Update environment variables
- [ ] Setup SSL/HTTPS
- [ ] Configure email service
- [ ] Setup backup strategy
- [ ] Load test the system
- [ ] Train users on each role

---

✅ **All done! System ready to use!** 🚀
