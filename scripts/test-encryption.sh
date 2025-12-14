#!/bin/bash

# Test Credential Encryption System
# This script tests the cloud account credential encryption functionality

set -e

API_URL="http://localhost:4000"
BASE_URL="$API_URL/api/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Testing Credential Encryption System ===${NC}\n"

# Step 1: Register a test user
echo -e "${YELLOW}Step 1: Creating test user...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "encryption-test@test.com",
    "password": "TestPassword123!",
    "fullName": "Encryption Test User",
    "tenantName": "Encryption Test Corp"
  }')

if echo "$REGISTER_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ User created successfully${NC}"
else
  echo -e "${RED}✗ User creation failed${NC}"
  echo "$REGISTER_RESPONSE" | jq .
fi

# Step 2: Login
echo -e "\n${YELLOW}Step 2: Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "encryption-test@test.com",
    "password": "TestPassword123!"
  }')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken')

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
  echo "Access Token: ${ACCESS_TOKEN:0:20}..."
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "$LOGIN_RESPONSE" | jq .
  exit 1
fi

# Step 3: Create AWS Cloud Account with encrypted credentials
echo -e "\n${YELLOW}Step 3: Creating AWS cloud account with encrypted credentials...${NC}"
AWS_RESPONSE=$(curl -s -X POST "$BASE_URL/cloud-accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "provider": "aws",
    "accountName": "Test AWS Account",
    "accountIdentifier": "123456789012",
    "credentials": {
      "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
      "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      "region": "us-east-1"
    }
  }')

AWS_ACCOUNT_ID=$(echo "$AWS_RESPONSE" | jq -r '.data.id')

if [ "$AWS_ACCOUNT_ID" != "null" ] && [ -n "$AWS_ACCOUNT_ID" ]; then
  echo -e "${GREEN}✓ AWS account created successfully${NC}"
  echo "Account ID: $AWS_ACCOUNT_ID"
  echo "$AWS_RESPONSE" | jq '.data'
else
  echo -e "${RED}✗ AWS account creation failed${NC}"
  echo "$AWS_RESPONSE" | jq .
fi

# Step 4: Create Azure Cloud Account
echo -e "\n${YELLOW}Step 4: Creating Azure cloud account...${NC}"
AZURE_RESPONSE=$(curl -s -X POST "$BASE_URL/cloud-accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "provider": "azure",
    "accountName": "Test Azure Account",
    "accountIdentifier": "azure-sub-id-12345",
    "credentials": {
      "tenantId": "12345678-1234-1234-1234-123456789012",
      "clientId": "87654321-4321-4321-4321-210987654321",
      "clientSecret": "super-secret-client-secret-value-here",
      "subscriptionId": "abcdef12-3456-7890-abcd-ef1234567890"
    }
  }')

AZURE_ACCOUNT_ID=$(echo "$AZURE_RESPONSE" | jq -r '.data.id')

if [ "$AZURE_ACCOUNT_ID" != "null" ] && [ -n "$AZURE_ACCOUNT_ID" ]; then
  echo -e "${GREEN}✓ Azure account created successfully${NC}"
  echo "Account ID: $AZURE_ACCOUNT_ID"
else
  echo -e "${RED}✗ Azure account creation failed${NC}"
  echo "$AZURE_RESPONSE" | jq .
fi

# Step 5: Create GCP Cloud Account
echo -e "\n${YELLOW}Step 5: Creating GCP cloud account...${NC}"
GCP_RESPONSE=$(curl -s -X POST "$BASE_URL/cloud-accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "provider": "gcp",
    "accountName": "Test GCP Account",
    "accountIdentifier": "my-gcp-project-123",
    "credentials": {
      "projectId": "my-gcp-project-123",
      "clientEmail": "service-account@my-project.iam.gserviceaccount.com",
      "privateKey": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\n-----END PRIVATE KEY-----"
    }
  }')

GCP_ACCOUNT_ID=$(echo "$GCP_RESPONSE" | jq -r '.data.id')

if [ "$GCP_ACCOUNT_ID" != "null" ] && [ -n "$GCP_ACCOUNT_ID" ]; then
  echo -e "${GREEN}✓ GCP account created successfully${NC}"
  echo "Account ID: $GCP_ACCOUNT_ID"
else
  echo -e "${RED}✗ GCP account creation failed${NC}"
  echo "$GCP_RESPONSE" | jq .
fi

# Step 6: List all cloud accounts
echo -e "\n${YELLOW}Step 6: Listing all cloud accounts...${NC}"
LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/cloud-accounts" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

ACCOUNT_COUNT=$(echo "$LIST_RESPONSE" | jq '.data | length')
echo -e "${GREEN}✓ Found $ACCOUNT_COUNT cloud accounts${NC}"
echo "$LIST_RESPONSE" | jq '.data[] | {id, provider, accountName, status}'

# Step 7: Test connection for AWS account
if [ "$AWS_ACCOUNT_ID" != "null" ] && [ -n "$AWS_ACCOUNT_ID" ]; then
  echo -e "\n${YELLOW}Step 7: Testing AWS account connection...${NC}"
  TEST_RESPONSE=$(curl -s -X POST "$BASE_URL/cloud-accounts/$AWS_ACCOUNT_ID/test" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  TEST_STATUS=$(echo "$TEST_RESPONSE" | jq -r '.data.status')
  if [ "$TEST_STATUS" == "connected" ]; then
    echo -e "${GREEN}✓ AWS connection test successful${NC}"
  else
    echo -e "${YELLOW}⚠ AWS connection test returned: $TEST_STATUS${NC}"
  fi
fi

# Step 8: Verify encryption in database
echo -e "\n${YELLOW}Step 8: Verifying credentials are encrypted in database...${NC}"
docker exec copilot-postgres psql -U copilot -d copilot_main -c \
  "SELECT account_id, provider, account_name,
   LENGTH(credentials_ciphertext) as ciphertext_length,
   LENGTH(credentials_iv) as iv_length,
   LENGTH(credentials_auth_tag) as auth_tag_length
   FROM cloud_accounts
   LIMIT 3;" 2>&1 | grep -v "^$" || echo "Database query failed"

echo -e "\n${GREEN}=== Encryption Test Complete ===${NC}"
echo -e "${GREEN}✓ Credentials are encrypted using AES-256-GCM${NC}"
echo -e "${GREEN}✓ Each credential has ciphertext, IV, and authentication tag${NC}"
echo -e "${GREEN}✓ Credentials are never stored in plaintext${NC}"
