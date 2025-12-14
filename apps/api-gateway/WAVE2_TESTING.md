# Wave 2 Features - Testing Guide

This document provides comprehensive testing examples for the Email Verification and MFA features implemented in Wave 2.

## Prerequisites

- API Gateway running on `http://localhost:3001`
- PostgreSQL database with migrations applied
- Redis server running
- Valid JWT tokens for authenticated requests

## Environment Variables

Add these to your `.env` file:

```bash
# Email Verification
REQUIRE_EMAIL_VERIFICATION=false  # Set to 'true' to require email verification for login

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

## 1. Email Verification Flow

### 1.1 Send Email Verification

Send a verification email to the authenticated user.

```bash
curl -X POST http://localhost:3001/api/v1/auth/send-verification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

**Rate Limit:** 3 requests per hour per IP

---

### 1.2 Verify Email

Verify email address using the token from the email.

```bash
curl -X GET http://localhost:3001/api/v1/auth/verify-email/YOUR_VERIFICATION_TOKEN
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "email": "user@example.com"
  }
}
```

**Response (Invalid Token):**
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired verification token",
    "code": "INVALID_TOKEN"
  }
}
```

---

### 1.3 Resend Verification Email

Resend the verification email if the previous one expired or was lost.

```bash
curl -X POST http://localhost:3001/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification email resent successfully"
}
```

**Rate Limit:** 3 requests per hour per IP

---

## 2. Multi-Factor Authentication (MFA) Flow

### 2.1 Setup MFA

Initialize MFA setup. This returns a QR code and secret key.

```bash
curl -X POST http://localhost:3001/api/v1/auth/mfa/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "message": "MFA setup initiated. Scan the QR code with your authenticator app."
}
```

**Instructions:**
1. Scan the QR code with Google Authenticator, Authy, or any TOTP app
2. The app will generate 6-digit codes that refresh every 30 seconds
3. Use the next endpoint to verify and enable MFA

---

### 2.2 Verify MFA Setup

Verify the TOTP code to enable MFA and receive backup codes.

```bash
curl -X POST http://localhost:3001/api/v1/auth/mfa/verify-setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "token": "123456",
    "secret": "JBSWY3DPEHPK3PXP"
  }'
```

**Request Body:**
- `token`: 6-digit TOTP code from authenticator app
- `secret`: Secret key from setup step

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "backupCodes": [
      "ABCD-EFGH-IJKL",
      "MNOP-QRST-UVWX",
      "YZAB-CDEF-GHIJ",
      "KLMN-OPQR-STUV",
      "WXYZ-ABCD-EFGH",
      "IJKL-MNOP-QRST",
      "UVWX-YZAB-CDEF",
      "GHIJ-KLMN-OPQR",
      "STUV-WXYZ-ABCD",
      "EFGH-IJKL-MNOP"
    ]
  },
  "message": "MFA enabled successfully. Save your backup codes in a secure location."
}
```

**Important:** Save the backup codes! They can be used if you lose access to your authenticator app.

**Rate Limit:** 5 attempts per 15 minutes per IP

---

### 2.3 Login with MFA (Two-Step Process)

#### Step 1: Initial Login (Credentials Only)

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "YourPassword123!"
  }'
```

**Response (MFA Required):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "admin",
      "tenantId": "tenant-uuid"
    },
    "tokens": {
      "accessToken": "",
      "refreshToken": ""
    },
    "requiresMFA": true
  }
}
```

#### Step 2: Login with MFA Token

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "YourPassword123!",
    "mfaToken": "123456"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "admin",
      "tenantId": "tenant-uuid",
      "emailVerified": true,
      "mfaEnabled": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

**Rate Limit:** 5 attempts per 15 minutes per IP

---

### 2.4 Login with Backup Code

If you lose access to your authenticator app, use a backup code instead of the TOTP token.

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "YourPassword123!",
    "mfaToken": "ABCD-EFGH-IJKL"
  }'
```

**Note:** Each backup code can only be used once. After use, it will be removed from your account.

---

### 2.5 Disable MFA

Disable MFA for your account. Requires password and current MFA token.

```bash
curl -X POST http://localhost:3001/api/v1/auth/mfa/disable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "password": "YourPassword123!",
    "token": "123456"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "MFA disabled successfully"
}
```

---

### 2.6 Regenerate Backup Codes

Generate a new set of backup codes. Old codes will be invalidated.

```bash
curl -X POST http://localhost:3001/api/v1/auth/mfa/backup-codes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "password": "YourPassword123!",
    "token": "123456"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "backupCodes": [
      "QRST-UVWX-YZAB",
      "CDEF-GHIJ-KLMN",
      "OPQR-STUV-WXYZ",
      "ABCD-EFGH-IJKL",
      "MNOP-QRST-UVWX",
      "YZAB-CDEF-GHIJ",
      "KLMN-OPQR-STUV",
      "WXYZ-ABCD-EFGH",
      "IJKL-MNOP-QRST",
      "UVWX-YZAB-CDEF"
    ]
  },
  "message": "Backup codes regenerated successfully. Save them in a secure location."
}
```

---

## 3. Complete Testing Scenarios

### Scenario 1: New User Registration with Email Verification

```bash
# 1. Register new user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "fullName": "New User",
    "tenantName": "My Organization"
  }'

# Save the accessToken from response

# 2. Send verification email
curl -X POST http://localhost:3001/api/v1/auth/send-verification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 3. Check email logs for verification token (since we're using mock email service)

# 4. Verify email
curl -X GET http://localhost:3001/api/v1/auth/verify-email/VERIFICATION_TOKEN

# 5. Login (if REQUIRE_EMAIL_VERIFICATION=true, this would fail before verification)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!"
  }'
```

---

### Scenario 2: Enable MFA for Existing User

```bash
# 1. Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "YourPassword123!"
  }'

# Save the accessToken

# 2. Initialize MFA setup
curl -X POST http://localhost:3001/api/v1/auth/mfa/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Save the secret and scan the QR code

# 3. Verify setup with TOTP code from authenticator app
curl -X POST http://localhost:3001/api/v1/auth/mfa/verify-setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "token": "123456",
    "secret": "YOUR_SECRET"
  }'

# Save the backup codes!

# 4. Logout and login again with MFA
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "YourPassword123!",
    "mfaToken": "123456"
  }'
```

---

### Scenario 3: Lost Authenticator - Use Backup Code

```bash
# 1. Login with backup code
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "YourPassword123!",
    "mfaToken": "ABCD-EFGH-IJKL"
  }'

# Save the accessToken

# 2. Regenerate backup codes (optional)
curl -X POST http://localhost:3001/api/v1/auth/mfa/backup-codes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "password": "YourPassword123!",
    "token": "654321"
  }'

# OR disable MFA and set it up again
curl -X POST http://localhost:3001/api/v1/auth/mfa/disable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "password": "YourPassword123!",
    "token": "654321"
  }'
```

---

## 4. Error Scenarios

### Email Already Verified
```bash
curl -X POST http://localhost:3001/api/v1/auth/send-verification \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response:
{
  "success": false,
  "error": {
    "message": "Email already verified",
    "code": "EMAIL_VERIFICATION_ERROR"
  }
}
```

### Invalid MFA Token
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "YourPassword123!",
    "mfaToken": "000000"
  }'

# Response:
{
  "success": false,
  "error": {
    "message": "Invalid MFA token or backup code",
    "code": "LOGIN_ERROR"
  }
}
```

### Rate Limit Exceeded
```bash
# After 3 email verification requests in 1 hour:
{
  "success": false,
  "error": {
    "message": "Too many email verification requests. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

---

## 5. Audit Logging

All operations are logged in the audit system. Check audit logs with:

```bash
curl -X GET http://localhost:3001/api/v1/audit/logs \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Event Types Logged:**
- `AUTH_EMAIL_VERIFICATION_SENT`
- `AUTH_EMAIL_VERIFICATION_SUCCESS`
- `AUTH_EMAIL_VERIFICATION_FAILURE`
- `AUTH_MFA_ENABLED`
- `AUTH_MFA_DISABLED`
- `AUTH_MFA_VERIFIED`
- `AUTH_MFA_FAILURE`
- `AUTH_MFA_BACKUP_CODE_USED`

---

## 6. Postman Collection

Import this JSON into Postman for easy testing:

```json
{
  "info": {
    "name": "Wave 2 - Email Verification & MFA",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Email Verification",
      "item": [
        {
          "name": "Send Verification",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/v1/auth/send-verification",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "auth", "send-verification"]
            }
          }
        },
        {
          "name": "Verify Email",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/api/v1/auth/verify-email/{{verificationToken}}",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "auth", "verify-email", "{{verificationToken}}"]
            }
          }
        },
        {
          "name": "Resend Verification",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/v1/auth/resend-verification",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "auth", "resend-verification"]
            }
          }
        }
      ]
    },
    {
      "name": "MFA",
      "item": [
        {
          "name": "Setup MFA",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/v1/auth/mfa/setup",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "auth", "mfa", "setup"]
            }
          }
        },
        {
          "name": "Verify Setup",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"token\": \"123456\",\n  \"secret\": \"YOUR_SECRET\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/v1/auth/mfa/verify-setup",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "auth", "mfa", "verify-setup"]
            }
          }
        },
        {
          "name": "Login with MFA",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"YourPassword123!\",\n  \"mfaToken\": \"123456\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/v1/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "auth", "login"]
            }
          }
        },
        {
          "name": "Disable MFA",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"password\": \"YourPassword123!\",\n  \"token\": \"123456\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/v1/auth/mfa/disable",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "auth", "mfa", "disable"]
            }
          }
        },
        {
          "name": "Regenerate Backup Codes",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"password\": \"YourPassword123!\",\n  \"token\": \"123456\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/v1/auth/mfa/backup-codes",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "auth", "mfa", "backup-codes"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001"
    },
    {
      "key": "accessToken",
      "value": ""
    },
    {
      "key": "verificationToken",
      "value": ""
    }
  ]
}
```

---

## 7. Database Migration

Before testing, run the Prisma migration:

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot/apps/api-gateway
npx prisma migrate dev --name add_email_verification_and_mfa
npx prisma generate
```

---

## Notes

- Email verification tokens expire after 24 hours
- MFA secrets are encrypted using AES-256-GCM
- Backup codes are hashed using bcrypt
- All sensitive operations are logged in the audit system
- Rate limiting is applied to prevent abuse
- TOTP uses 30-second time windows with 2-window tolerance for clock skew
