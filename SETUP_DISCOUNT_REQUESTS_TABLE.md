# Setup Table Discount Requests

## ⚠️ Error

Table `discount_requests` belum dibuat di database Supabase Anda. Berikut cara membuat tabelnya:

---

## 🔧 Solusi

### Opsi 1: Copy & Paste ke Supabase SQL Editor (Recommended)

1. Buka **Supabase Dashboard**
2. Pilih project Anda
3. Pergi ke **SQL Editor** (menu kiri)
4. Klik **+ New Query**
5. Copy script di bawah ini dan paste

```sql
-- Create discount_requests table
CREATE TABLE IF NOT EXISTS discount_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  discount_percentage NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  approval_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create limit_requests table
CREATE TABLE IF NOT EXISTS limit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  current_limit NUMERIC NOT NULL,
  requested_limit NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  approval_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create withdrawal_history table
CREATE TABLE IF NOT EXISTS withdrawal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  withdrawal_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE discount_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE limit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discount_requests
CREATE POLICY "Users can view their own discount requests" ON discount_requests
  FOR SELECT USING (
    auth.uid() = marketing_id 
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Users can insert their own discount requests" ON discount_requests
  FOR INSERT WITH CHECK (auth.uid() = marketing_id);

CREATE POLICY "Users can update their own discount requests" ON discount_requests
  FOR UPDATE USING (
    (auth.uid() = marketing_id AND status = 'pending')
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

-- RLS Policies for limit_requests
CREATE POLICY "Users can view their own limit requests" ON limit_requests
  FOR SELECT USING (
    auth.uid() = marketing_id 
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Users can insert their own limit requests" ON limit_requests
  FOR INSERT WITH CHECK (auth.uid() = marketing_id);

CREATE POLICY "Users can update their own limit requests" ON limit_requests
  FOR UPDATE USING (
    (auth.uid() = marketing_id AND status = 'pending')
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

-- RLS Policies for withdrawal_history
CREATE POLICY "Users can view their own withdrawal history" ON withdrawal_history
  FOR SELECT USING (
    auth.uid() = marketing_id 
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Users can insert their own withdrawal history" ON withdrawal_history
  FOR INSERT WITH CHECK (auth.uid() = marketing_id);
```

6. Klik **RUN** (atau Ctrl+Enter)
7. Tunggu sampai selesai ✅

---

### Opsi 2: Jalankan dari Terminal

Jika Anda punya akses CLI Supabase:

```bash
# First, set up Supabase CLI
npm install -g supabase

# Login
supabase login

# Run the SQL file
supabase db push database/create-discount-limit-requests.sql
```

---

## ✅ Verifikasi

Setelah menjalankan SQL, cek apakah table sudah ada:

1. Pergi ke **Table Editor** di Supabase
2. Lihat di sidebar apakah sudah ada:
   - `discount_requests`
   - `limit_requests`
   - `withdrawal_history`

---

## 📋 Yang Dibuat:

### 1. `discount_requests` table
- Untuk menyimpan pengajuan diskon dari marketing
- Columns: id, marketing_id, outlet_id, product_id, discount_percentage, reason, start_date, end_date, status, approval_notes, approved_by, approved_at, created_at, updated_at

### 2. `limit_requests` table
- Untuk pengajuan limit kredit (untuk pengembangan di masa depan)

### 3. `withdrawal_history` table
- Untuk tracking pengambilan barang/uang

### 4. RLS (Row Level Security) Policies
- Marketing bisa lihat pengajuan mereka sendiri saja
- Super Admin bisa lihat semua pengajuan dari semua marketing
- Marketing bisa membuat pengajuan baru
- Super Admin bisa update status pengajuan

---

## 🚀 Setelah Setup

1. Refresh browser aplikasi Anda
2. Login sebagai Marketing
3. Buka tab "Pengajuan Diskon"
4. Klik "Ajukan Diskon Baru"
5. Buat pengajuan test
6. Login sebagai Super Admin
7. Buka tab "Pengajuan Diskon"
8. Lihat pengajuan dari marketing
9. Klik "Setujui" atau "Tolak"

---

## ❓ Troubleshooting

### Error: "User does not exist"
**Solusi:** Referensi ke `auth.users` dan `users` table mungkin conflict. Jika error, coba:

```sql
-- Alternatif jika ada error
CREATE TABLE IF NOT EXISTS discount_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_id UUID NOT NULL,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  discount_percentage NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  approval_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE discount_requests ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies tanpa reference ke users table
CREATE POLICY "Enable read access for own records" ON discount_requests
  FOR SELECT USING (auth.uid() = marketing_id);

CREATE POLICY "Enable insert for authenticated users" ON discount_requests
  FOR INSERT WITH CHECK (auth.uid() = marketing_id);

CREATE POLICY "Enable update for admins" ON discount_requests
  FOR UPDATE USING (
    (auth.uid() = marketing_id AND status = 'pending')
    OR auth.uid() IN (SELECT id FROM auth.users WHERE email LIKE '%super_admin%')
  );
```

### Error: "Cannot reference table 'products' / 'outlets'"
**Solusi:** Table outlets atau products belum ada. Buat dulu atau remove FOREIGN KEY constraint untuk sekarang:

```sql
CREATE TABLE IF NOT EXISTS discount_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  product_id UUID NOT NULL,
  discount_percentage NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  approval_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

**After setup, error should be fixed!** ✅
