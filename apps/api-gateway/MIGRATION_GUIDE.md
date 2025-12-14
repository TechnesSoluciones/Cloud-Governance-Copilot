# Database Migration Guide - Wave 2

## Overview
This guide walks you through running the database migration for Email Verification and MFA features.

---

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL container running
- Access to the api-gateway container shell

---

## Migration Steps

### Step 1: Access the API Gateway Container

```bash
# From project root
docker exec -it copilot-api-gateway-1 sh
```

**Note:** Container name might vary. Use `docker ps` to find the exact name.

---

### Step 2: Run Prisma Migration

Inside the container:

```bash
cd /app

# Create and apply migration
npx prisma migrate dev --name add_email_verification_and_mfa

# Generate Prisma client
npx prisma generate
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "copilot", schema "public" at "postgres:5432"

Applying migration `20240101000000_add_email_verification_and_mfa`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20240101000000_add_email_verification_and_mfa/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (5.7.0 | library) to ./node_modules/@prisma/client
```

---

### Step 3: Verify Migration

Check that the new columns exist:

```bash
# Connect to PostgreSQL
docker exec -it copilot-postgres-1 psql -U postgres -d copilot

# Check User table schema
\d users

# You should see:
# - email_verified
# - email_verification_token
# - email_verification_expires
# - mfa_enabled
# - mfa_secret
# - mfa_backup_codes

# Exit psql
\q
```

---

### Step 4: Restart API Gateway

Exit the container and restart the service:

```bash
# Exit container
exit

# Restart API Gateway
docker-compose restart api-gateway
```

---

## Manual Migration (if automated fails)

If the automated migration fails, you can apply it manually:

### SQL Script

```sql
-- Add email verification columns
ALTER TABLE users
  ADD COLUMN email_verified BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN email_verification_token VARCHAR(255),
  ADD COLUMN email_verification_expires TIMESTAMP(6) WITH TIME ZONE;

-- Add MFA columns
ALTER TABLE users
  ADD COLUMN mfa_enabled BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN mfa_secret TEXT,
  ADD COLUMN mfa_backup_codes JSON;

-- Add index for email verification token lookup
CREATE INDEX "users_email_verification_token_idx" ON "users"("email_verification_token");

-- Update existing users to have email verified (optional)
UPDATE users SET email_verified = true WHERE created_at < NOW();
```

### Apply Manual Migration

```bash
# Copy SQL to a file
cat > /tmp/wave2_migration.sql << 'EOF'
-- Paste SQL script here
EOF

# Apply to database
docker exec -i copilot-postgres-1 psql -U postgres -d copilot < /tmp/wave2_migration.sql

# Generate Prisma client
docker exec copilot-api-gateway-1 npx prisma generate
```

---

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove added columns
ALTER TABLE users
  DROP COLUMN IF EXISTS email_verified,
  DROP COLUMN IF EXISTS email_verification_token,
  DROP COLUMN IF EXISTS email_verification_expires,
  DROP COLUMN IF EXISTS mfa_enabled,
  DROP COLUMN IF EXISTS mfa_secret,
  DROP COLUMN IF EXISTS mfa_backup_codes;

-- Remove index
DROP INDEX IF EXISTS "users_email_verification_token_idx";
```

Apply via:
```bash
docker exec -i copilot-postgres-1 psql -U postgres -d copilot < /tmp/rollback.sql
```

---

## Verification Queries

After migration, verify the changes:

```sql
-- Check User table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'email_verified',
    'email_verification_token',
    'email_verification_expires',
    'mfa_enabled',
    'mfa_secret',
    'mfa_backup_codes'
  );

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname LIKE '%email_verification%';

-- Check existing users
SELECT
  user_id,
  email,
  email_verified,
  mfa_enabled,
  created_at
FROM users
LIMIT 5;
```

---

## Environment Variables

After migration, add these to your `.env` file:

```bash
# Email Verification
REQUIRE_EMAIL_VERIFICATION=false  # Set to 'true' to enforce

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Existing variables (ensure these exist)
DATABASE_URL=postgresql://postgres:password@postgres:5432/copilot?schema=public
ENCRYPTION_KEY=your-base64-encoded-key
REDIS_URL=redis://redis:6379
JWT_SECRET=your-jwt-secret
```

---

## Testing the Migration

### Test Email Verification Fields

```bash
curl -X POST http://localhost:3001/api/v1/auth/send-verification \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Should return success without database errors.

### Test MFA Fields

```bash
curl -X POST http://localhost:3001/api/v1/auth/mfa/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Should return QR code and secret without errors.

---

## Troubleshooting

### Error: "Column already exists"

If you see this error, the migration was partially applied. Check which columns exist:

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
```

Then modify the SQL to only add missing columns.

---

### Error: "Prisma Client not generated"

Run:
```bash
docker exec copilot-api-gateway-1 npx prisma generate
docker-compose restart api-gateway
```

---

### Error: "Cannot connect to database"

Check PostgreSQL is running:
```bash
docker ps | grep postgres
docker logs copilot-postgres-1
```

---

### Migration Creates but Doesn't Apply

Force apply:
```bash
docker exec copilot-api-gateway-1 npx prisma migrate deploy
```

---

## Data Migration

If you have existing users and want to mark them as verified:

```sql
-- Mark all existing users as email verified
UPDATE users
SET email_verified = true
WHERE created_at < NOW() - INTERVAL '1 day';

-- Or be selective
UPDATE users
SET email_verified = true
WHERE email LIKE '%@yourcompany.com';
```

---

## Production Deployment

For production:

1. **Backup database first:**
   ```bash
   docker exec copilot-postgres-1 pg_dump -U postgres copilot > backup.sql
   ```

2. **Run migration in transaction:**
   ```sql
   BEGIN;
   -- Run migration SQL
   -- Verify changes
   COMMIT;  -- or ROLLBACK if issues
   ```

3. **Test in staging first**

4. **Schedule downtime or use zero-downtime strategy:**
   - Add columns (nullable first)
   - Deploy new code
   - Set defaults
   - Make columns NOT NULL

---

## Post-Migration Checklist

- [ ] Migration applied successfully
- [ ] Prisma client generated
- [ ] API Gateway restarted
- [ ] Email verification endpoints working
- [ ] MFA endpoints working
- [ ] Audit logs recording new events
- [ ] Existing user logins still work
- [ ] Environment variables configured

---

## Support

If you encounter issues:

1. Check container logs:
   ```bash
   docker logs copilot-api-gateway-1
   docker logs copilot-postgres-1
   ```

2. Check database connection:
   ```bash
   docker exec copilot-postgres-1 psql -U postgres -d copilot -c "SELECT 1"
   ```

3. Verify Prisma schema matches database:
   ```bash
   docker exec copilot-api-gateway-1 npx prisma db pull
   docker exec copilot-api-gateway-1 npx prisma format
   ```

---

## Migration Files Location

After running the migration, files will be in:
```
/apps/api-gateway/prisma/migrations/
└── YYYYMMDDHHMMSS_add_email_verification_and_mfa/
    └── migration.sql
```

Keep these files in version control!
