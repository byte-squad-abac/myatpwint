# Storage Backup Guide - Working State

## Current Storage Structure
- Bucket: `manuscripts`
- File naming: `manuscript-{uuid}.docx` (consistent naming)
- Example: `manuscript-2e8a0e56-b672-4711-99ac-5f40f86031cf.docx`

## Storage Backup Commands

### List all files in storage
```bash
curl -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  "https://bsmbqekevilajlapldan.supabase.co/storage/v1/object/list/manuscripts"
```

### Download specific file
```bash
curl "https://bsmbqekevilajlapldan.supabase.co/storage/v1/object/public/manuscripts/FILENAME.docx" \
  -o "backup_FILENAME.docx"
```

### Upload file back to storage
```bash
curl -X POST "https://bsmbqekevilajlapldan.supabase.co/storage/v1/object/manuscripts/FILENAME.docx" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  -H "upsert: true" \
  --data-binary @backup_FILENAME.docx
```

## Current Working Files
- `manuscript-2e8a0e56-b672-4711-99ac-5f40f86031cf.docx` (main test manuscript)

## Key Environment Variables
- SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbWJxZWtldmlsYWpsYXBsZGFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTc4NTY4NywiZXhwIjoyMDcxMzYxNjg3fQ.jiSCAbOxUtjH8Bcjr6NZoMrNwXMNSat_5DPhoRH_aR4
- NEXT_PUBLIC_SUPABASE_URL=https://bsmbqekevilajlapldan.supabase.co

## Recovery Process
1. Restore database using database_backup_working.sql
2. Download and restore storage files using commands above
3. Update manuscript records to point to correct file URLs