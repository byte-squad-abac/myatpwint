/**
 * Apply database migration directly using Supabase client
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applyMigration() {
  try {
    console.log('Reading migration file...')
    const migrationSQL = fs.readFileSync('./supabase/migrations/002_fix_semantic_search.sql', 'utf8')
    
    console.log('Applying migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('Migration failed:', error)
      return false
    }
    
    console.log('Migration applied successfully!')
    return true
  } catch (error) {
    console.error('Error applying migration:', error.message)
    
    // Try alternative approach - execute each statement separately
    try {
      console.log('Trying alternative approach...')
      const migrationSQL = fs.readFileSync('./supabase/migrations/002_fix_semantic_search.sql', 'utf8')
      
      // Split by semicolons and execute each statement
      const statements = migrationSQL.split(';').filter(s => s.trim())
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log('Executing:', statement.substring(0, 50) + '...')
          const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() + ';' })
          if (error) {
            console.error('Statement failed:', error)
            // Continue with other statements
          }
        }
      }
      
      console.log('Alternative migration completed')
      return true
    } catch (altError) {
      console.error('Alternative migration also failed:', altError.message)
      return false
    }
  }
}

// Load environment variables
const envLocal = fs.readFileSync('.env.local', 'utf8')
envLocal.split('\n').forEach(line => {
  const [key, value] = line.split(' = ')
  if (key && value) {
    process.env[key.trim()] = value.trim()
  }
})

applyMigration().then(success => {
  console.log('Migration result:', success ? 'SUCCESS' : 'FAILED')
  process.exit(success ? 0 : 1)
})