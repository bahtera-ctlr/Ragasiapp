import { supabase } from './supabase';

export interface Employee {
  id: number;
  nip: string;
  nama_karyawan: string;
  grade?: string;
  jabatan?: string;
  created_at: string;
  updated_at: string;
}

export async function getEmployees() {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employees:', error);
      return { error: error.message, data: null };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: String(err), data: null };
  }
}

export async function uploadEmployeesCSV(csvData: string) {
  try {
    const lines = csvData.trim().split('\n');
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());

    const employees: Partial<Employee>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 2) continue;

      const employee: Partial<Employee> = {};
      header.forEach((col, idx) => {
        const value = values[idx];
        if (col.includes('nip')) employee.nip = value;
        else if (col.includes('nama')) employee.nama_karyawan = value;
        else if (col.includes('grade')) employee.grade = value;
        else if (col.includes('jabatan')) employee.jabatan = value;
      });

      if (employee.nip && employee.nama_karyawan) {
        employees.push(employee);
      }
    }

    if (employees.length === 0) {
      return { error: 'Tidak ada data karyawan yang valid ditemukan', data: null };
    }

    const { data, error } = await supabase
      .from('employees')
      .upsert(employees, { onConflict: 'nip' });

    if (error) {
      console.error('Error uploading employees:', error);
      return { error: error.message, data: null };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: String(err), data: null };
  }
}

export async function createEmployee(employee: Partial<Employee>) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .insert([{
        nip: employee.nip,
        nama_karyawan: employee.nama_karyawan,
        grade: employee.grade || null,
        jabatan: employee.jabatan || null,
      }])
      .select();

    if (error) {
      console.error('Error creating employee:', error);
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: String(err), data: null };
  }
}

export async function updateEmployee(id: number, employee: Partial<Employee>) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .update({
        nip: employee.nip,
        nama_karyawan: employee.nama_karyawan,
        grade: employee.grade || null,
        jabatan: employee.jabatan || null,
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating employee:', error);
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: String(err), data: null };
  }
}

export async function deleteEmployee(id: number) {
  try {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: String(err) };
  }
}

export function parseEmployeesCsvData(csvData: string) {
  const lines = csvData.trim().split('\n');
  const header = lines[0].toLowerCase().split(',').map(h => h.trim());

  const employees: Partial<Employee>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < 2) continue;

    const employee: Partial<Employee> = {};
    header.forEach((col, idx) => {
      const value = values[idx];
      if (col.includes('nip')) employee.nip = value;
      else if (col.includes('nama')) employee.nama_karyawan = value;
      else if (col.includes('grade')) employee.grade = value;
      else if (col.includes('jabatan')) employee.jabatan = value;
    });

    if (!employee.nip) {
      errors.push(`Baris ${i + 1}: NIP tidak ditemukan`);
    } else if (!employee.nama_karyawan) {
      errors.push(`Baris ${i + 1}: Nama karyawan tidak ditemukan`);
    } else {
      employees.push(employee);
    }
  }

  return { employees, errors };
}
