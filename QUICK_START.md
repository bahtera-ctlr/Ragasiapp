# 🚀 Quick Start Guide

## 1. Setup Database (2 minutes)

### ⭐ Recommended: Use Combined File
```bash
# File: database/setup-complete.sql
# Copy-paste entire file content to Supabase SQL Editor and Run
```

### Alternative: Run Two Files in Order
```bash
# 1st: database/users.sql
# 2nd: database/orders_invoices.sql
```

**Have Error?** Read `SQL_ERROR_FIX.md` for solution

## 2. Login Pages

| Role | URL | Email |
|------|-----|-------|
| Admin Keuangan | `/admin-keuangan` | keuangan@test.com |
| Marketing | `/marketing` | marketing@test.com |
| Fakturis | `/fakturis` | fakturis@test.com |
| Logistik IN | `/admin-logistik-in` | logistik-in@test.com |
| Logistik OUT | `/admin-logistik-out` | logistik-out@test.com |

## 3. Test Flow (5 minutes)

### Marketing
1. Login → Click "+ Buat Sales Order Baru"
2. Create order with 2-3 products
3. Post order

### Admin Keuangan
1. Login → Go to Invoice Management
2. Click "Release Invoice"

### Logistik IN
1. Login → Go to Packing tab
2. Click "Mulai Packing" → "Selesai Packing"

### Logistik OUT
1. Login → Filter "Packed (Siap Kirim)"
2. Click "Mulai Pengiriman"
3. Add notes → Click "Tandai Sudah Terkirim"

## 4. Key Features

### Admin Keuangan
- 📥 Export outlet CSV
- 📋 Approve invoices

### Marketing
- 📝 Create sales orders
- ✏️ Edit orders
- 📄 Post invoices

### Fakturis
- 👁️ View all invoices
- 🔍 Filter by status

### Logistik IN
- 📤 Upload products (CSV)
- 📦 Manage packing

### Logistik OUT
- 🚚 Track shipments
- ✓ Mark delivered

## 5. Files to Read

1. `SETUP_FEATURES.md` - Detailed setup guide
2. `SYSTEM_GUIDE.md` - Complete documentation
3. `CHECKLIST.md` - Testing checklist

## 6. Database Tables

```
orders          → Sales orders
invoices        → Invoice tracking
shipments       → Shipment tracking
staging_products → Product uploads
```

## 7. Troubleshooting

### Error: "Unauthorized"
→ Check role in database users table

### Export CSV not working
→ Check if outlets data exists

### Shipment not appearing
→ Verify order status is not "pending"

---

**Password for all test accounts:** `testing123`

**Need help?** Read SYSTEM_GUIDE.md or CHECKLIST.md
