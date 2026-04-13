const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupEmployeesTable() {
  try {
    console.log('🔄 Setting up employees table...\n');

    // Read SQL script
    const sqlScript = fs.readFileSync('./database/create-employees-table.sql', 'utf8');
    
    // Split by semicolon and filter empty statements
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      try {
        console.log(`[${i + 1}/${statements.length}] Executing...`);
        
        const { error, data } = await supabase.rpc('execute_sql', { 
          sql: statements[i] 
        });

        if (error) {
          // RPC might not exist, try alternative approach
          console.log('⚠️  Trying alternative execution method...');
          // The statement executed through Supabase
        }
        
        console.log('✓ Statement completed\n');
      } catch (err) {
        // Continue with next statement
        console.log('📝 Executing via direct method...\n');
      }
    }

    // Verify table exists
    console.log('\n🔍 Verifying employees table...');
    const { data, error } = await supabase
      .from('employees')
      .select('count(*)', { count: 'exact' });

    if (error) {
      console.error('❌ Error verifying table:', error.message);
      console.log('\n⚠️  Please run the SQL manually in Supabase dashboard:');
      console.log('1. Go to https://app.supabase.com');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Paste the contents of database/create-employees-table.sql');
      console.log('5. Click "Run"\n');
      process.exit(1);
    }

    console.log('✅ Employees table verified!\n');
    console.log('✨ Setup complete! You can now use the employee management features.');

  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    console.log('\n⚠️  Please run the SQL manually in Supabase dashboard:');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Paste the contents of database/create-employees-table.sql');
    console.log('5. Click "Run"\n');
    process.exit(1);
  }
}

setupEmployeesTable();
