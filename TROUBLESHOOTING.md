# 🆘 Troubleshooting Guide

## Database Setup Errors

### Error: "column marketing_id does not exist"
```
ERROR: 42703: column "marketing_id" does not exist
```

**Cause:** Running `orders_invoices.sql` without `users.sql` first

**Solution:**
- Use **`database/setup-complete.sql`** instead (recommended)
- Or run `users.sql` FIRST, then `orders_invoices.sql`
- Read: `SQL_ERROR_FIX.md` for detailed guide

---

### Error: "relation users already exists"
```
ERROR: 42P07: relation "users" already exists
```

**Cause:** `users` table sudah ada dari setup autentikasi

**Solution:** Normal ✓ - Abaikan error ini, lanjut ke step berikutnya

---

### Error: "Failed to create policy"
```
ERROR: new row violates row-level security policy
```

**Cause:** RLS policy referensi data yang tidak ada

**Solution:** 
1. Pastikan users table sudah tercipta
2. Run SQL dari awal dengan `setup-complete.sql`
3. Check Supabase SQL Editor untuk error details

---

## Login & Access Issues

### Error: "Unauthorized: Insufficient permissions"

**Cause:** Role user di database tidak sesuai

**Solution:**
1. Login to Supabase dashboard
2. Navigate to: `Database → Tables → users`
3. Find your user row
4. Check `role` column - pastikan value benar
5. Valid roles: `admin_keuangan`, `marketing`, `fakturis`, `admin_logistik`, `admin_ekspedisi`, `super_admin`

---

### Cannot Login After Signup

**Cause:** Email verification belum completed

**Solution:**
1. Check email Anda untuk verification link dari Supabase
2. Click link untuk verify email
3. Coba login lagi

Atau jika using Supabase local:
- Verification email mungkin tidak terkirim di local development
- Skip verification untuk testing

---

### Auto-Redirect Not Working

**Cause:** Session not synced dengan database

**Solution:**
1. Clear browser cache/cookies
   ```
   DevTools → Application → Clear Site Data
   ```
2. Logout dan login ulang
3. Tunggu 1-2 detik untuk redirect terjadi

---

## Feature Issues

### Export CSV Not Downloading

**Cause:** Browser popup blocker atau data kosong

**Solution:**
1. Check apakah outlets data ada di database
2. Disable popup blocker untuk domain ini
3. Check browser console (F12) untuk error
4. Verifikasi SQL ran successfully

---

### Shipment Not Appearing

**Cause:** Order status masih "pending" atau belum create shipment

**Solution:**
1. Pastikan order sudah dibuat dengan status "approved"
2. Check `shipments` table di Supabase
3. Verify RLS policies allow access
4. Try refresh page

---

### Product Upload Failed

**Cause:** CSV format tidak sesuai atau encoding issue

**Solution:**
1. Verify CSV format:
   ```
   id,name,price,stock,gol,komposisi
   1,Product A,50000,100,F1,Komposisi A
   ```
2. Use UTF-8 encoding
3. Check file extension (.csv)
4. Check browser console untuk error message

---

## Performance Issues

### Dashboard Loading Slowly

**Cause:** Large data volume atau N+1 queries

**Solution:**
1. Check network tab (F12) untuk slow requests
2. Verify indexes created:
   ```
   Database → Indexes tab
   ```
3. Reduce data range (add filters)
4. Upgrade Supabase plan jika diperlukan

---

### Export CSV Freezes

**Cause:** Terlalu banyak data

**Solution:**
1. Add filter untuk reduce data
2. Export dalam batches
3. Use CSV export dengan pagination

---

## Database Issues

### Cannot Connect to Database

**Cause:** Connection string tidak benar

**Solution:**
1. Verify `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
2. Check Supabase project settings untuk correct values
3. Restart dev server: `npm run dev`

---

### RLS Policy Not Working

**Cause:** Policy syntax error atau tidak applied

**Solution:**
1. Check SQL Editor untuk policy creation errors
2. Verify policy applied:
   ```
   Database → Tables → [table] → Policies tab
   ```
3. Test RLS dengan different users
4. Check server logs

---

## Code/Build Issues

### TypeScript Error: "Cannot find module"

**Cause:** Import path salah

**Solution:**
1. Check file path correctness
2. Verify `@/` alias configured in `tsconfig.json`
3. Rebuild: `npm run build`

---

### Pages Not Loading (404)

**Cause:** Route tidak ada atau typo

**Solution:**
1. Verify page file exists di `app/[route]/page.tsx`
2. Check route path (case-sensitive!)
3. Rebuild dev server

---

### Styles Not Applied

**Cause:** Tailwind CSS not compiled

**Solution:**
1. Check `globals.css` imported di layout
2. Verify Tailwind config valid
3. Restart dev server
4. Clear `.next/` folder: `rm -rf .next/`

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TypeScript:** https://www.typescriptlang.org/docs

---

## Getting Help

1. **Check Documentation:**
   - `SQL_ERROR_FIX.md` - SQL errors
   - `SYSTEM_GUIDE.md` - Feature documentation
   - `SETUP_FEATURES.md` - Setup instructions

2. **Check Supabase Dashboard:**
   - SQL Editor untuk run debug queries
   - Logs untuk error details
   - Tables untuk data verification

3. **Check Browser Console:**
   - F12 → Console tab
   - Check untuk JavaScript errors
   - Network tab untuk HTTP requests

4. **Try Restarting:**
   ```bash
   # Stop dev server (Ctrl+C)
   npm run dev
   ```

---

**Tidak solution? Cek file dokumentasi yang relevan atau lihat Supabase logs untuk detail lebih lanjut!**
