# Wave 2 Quick Start Guide

## Get Started in 5 Minutes

This guide gets you up and running with Email Verification and MFA features.

---

## Step 1: Rebuild Docker Containers (2 min)

```bash
# From project root
cd /Users/josegomez/Documents/Code/SaaS/Copilot

# Rebuild with new dependencies
docker-compose down
docker-compose build api-gateway
docker-compose up -d
```

Wait for containers to start:
```bash
docker ps
```

---

## Step 2: Run Database Migration (1 min)

```bash
# Access API Gateway container
docker exec -it copilot-api-gateway-1 sh

# Run migration
npx prisma migrate dev --name add_email_verification_and_mfa
npx prisma generate

# Exit container
exit

# Restart API Gateway
docker-compose restart api-gateway
```

**Verify migration:**
```bash
docker exec -it copilot-postgres-1 psql -U postgres -d copilot -c "\d users"
```

You should see new columns: `email_verified`, `mfa_enabled`, etc.

---

## Step 3: Test Email Verification (1 min)

```bash
# 1. Register or login to get access token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "YourPassword123!"
  }'

# Save the accessToken from response

# 2. Send verification email
curl -X POST http://localhost:3001/api/v1/auth/send-verification \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response should be:
# { "success": true, "message": "Verification email sent successfully" }
```

**Check logs for verification token** (since we're using mock email):
```bash
docker logs copilot-api-gateway-1 | grep "Email verification"
```

---

## Step 4: Test MFA Setup (1 min)

```bash
# 1. Initialize MFA setup
curl -X POST http://localhost:3001/api/v1/auth/mfa/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response contains:
# - secret: "JBSWY3DPEHPK3PXP"
# - qrCode: "data:image/png;base64,..."

# 2. Save the QR code to file
curl -X POST http://localhost:3001/api/v1/auth/mfa/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  | jq -r '.data.qrCode' > qrcode.txt

# 3. Open QR code in browser or decode it
# For testing, you can use Google Authenticator browser extension
```

---

## Step 5: Complete MFA Setup

```bash
# Get TOTP code from your authenticator app
# Then verify setup:

curl -X POST http://localhost:3001/api/v1/auth/mfa/verify-setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "token": "123456",
    "secret": "YOUR_SECRET_FROM_SETUP"
  }'

# Response contains backup codes - SAVE THESE!
```

---

## Step 6: Test MFA Login

```bash
# 1. Try login without MFA token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "YourPassword123!"
  }'

# Response: requiresMFA: true, empty tokens

# 2. Login with MFA token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "YourPassword123!",
    "mfaToken": "123456"
  }'

# Success! You get full auth tokens
```

---

## Common Commands

### Check API Health
```bash
curl http://localhost:3001/health
```

### View Container Logs
```bash
docker logs -f copilot-api-gateway-1
```

### Access Database
```bash
docker exec -it copilot-postgres-1 psql -U postgres -d copilot
```

### Check Redis
```bash
docker exec -it copilot-redis-1 redis-cli
> KEYS email-verification:*
> KEYS password-reset:*
```

---

## Postman Setup

1. Import collection from `WAVE2_TESTING.md` (at the end of the file)
2. Set environment variables:
   - `baseUrl`: `http://localhost:3001`
   - `accessToken`: (get from login)
   - `verificationToken`: (get from email logs)

---

## Environment Configuration

Optional: Update `.env` to require email verification:

```bash
# Add to .env
REQUIRE_EMAIL_VERIFICATION=true  # Makes email verification mandatory for login
FRONTEND_URL=http://localhost:3000
```

Then restart:
```bash
docker-compose restart api-gateway
```

---

## Verify Everything Works

Run this comprehensive test:

```bash
# 1. Register new user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "fullName": "Test User"
  }'

# 2. Use the access token to send verification
# 3. Setup MFA
# 4. Verify MFA setup
# 5. Logout and login with MFA

# If all steps succeed, Wave 2 is fully functional!
```

---

## Troubleshooting

### Migration Failed
```bash
# Check migration status
docker exec copilot-api-gateway-1 npx prisma migrate status

# Force apply
docker exec copilot-api-gateway-1 npx prisma migrate deploy
```

### Container Won't Start
```bash
# Check logs
docker logs copilot-api-gateway-1

# Common issues:
# - Missing dependencies: rebuild container
# - Database connection: check DATABASE_URL
# - Redis connection: check REDIS_URL
```

### Endpoints Return 404
```bash
# Check routes are loaded
docker logs copilot-api-gateway-1 | grep "auth routes"

# Restart container
docker-compose restart api-gateway
```

### QR Code Won't Scan
```bash
# The QR code is base64 encoded data URL
# You can:
# 1. Decode and save as image
# 2. Use the secret directly in authenticator app
# 3. Visit: https://www.google.com/chart?chs=200x200&chld=M|0&cht=qr&chl=YOUR_OTPAUTH_URL
```

---

## Next Steps

1. **Read Full Testing Guide**: `WAVE2_TESTING.md`
2. **Review Implementation**: `WAVE2_IMPLEMENTATION_SUMMARY.md`
3. **Setup Real Email Service**: Configure SendGrid/AWS SES
4. **Update Frontend**: Implement UI for email verification and MFA
5. **Configure Production**: Set appropriate rate limits and security settings

---

## API Reference

### All New Endpoints

```
Email Verification:
  POST   /api/v1/auth/send-verification      (auth required)
  GET    /api/v1/auth/verify-email/:token    (public)
  POST   /api/v1/auth/resend-verification    (auth required)

MFA:
  POST   /api/v1/auth/mfa/setup               (auth required)
  POST   /api/v1/auth/mfa/verify-setup        (auth required)
  POST   /api/v1/auth/mfa/verify              (public)
  POST   /api/v1/auth/mfa/disable             (auth required)
  POST   /api/v1/auth/mfa/backup-codes        (auth required)
```

---

## Support Files

- **WAVE2_TESTING.md** - Comprehensive testing guide with curl examples
- **WAVE2_IMPLEMENTATION_SUMMARY.md** - Technical implementation details
- **MIGRATION_GUIDE.md** - Database migration instructions
- **WAVE2_QUICK_START.md** - This file

---

## Production Checklist

Before deploying to production:

- [ ] Run migration on production database
- [ ] Configure real email service (SendGrid/SES)
- [ ] Set `REQUIRE_EMAIL_VERIFICATION=true` if desired
- [ ] Update `FRONTEND_URL` to production URL
- [ ] Test all endpoints in production environment
- [ ] Set up monitoring for MFA failures
- [ ] Document backup code recovery process
- [ ] Train support team on MFA reset procedures
- [ ] Update user documentation
- [ ] Test email deliverability

---

## Success Criteria

You've successfully implemented Wave 2 if:

✅ All Docker containers start without errors
✅ Database migration applied successfully
✅ Email verification endpoints respond correctly
✅ MFA setup generates QR code
✅ MFA verification accepts valid tokens
✅ Login flow requires MFA when enabled
✅ Backup codes work for authentication
✅ All operations logged in audit system
✅ Rate limiting works as expected
✅ No TypeScript compilation errors

---

**Estimated Setup Time**: 5-10 minutes
**Difficulty**: Easy (well-documented with clear steps)

Ready to go! 🚀
