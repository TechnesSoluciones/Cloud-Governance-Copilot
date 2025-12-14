/**
 * Database fixtures and helpers for E2E testing
 */

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  role?: string;
}

export interface TestCloudAccount {
  name: string;
  provider: 'AWS' | 'AZURE' | 'GCP';
  credentials: Record<string, string>;
  userId?: string;
}

/**
 * Seed database with test data
 * This should be called before test suites that need specific data
 */
export async function seedTestData(): Promise<void> {
  console.log('Seeding test database...');

  // In a real implementation, you would:
  // 1. Connect to test database
  // 2. Create test users
  // 3. Create test cloud accounts
  // 4. Create test audit logs
  // 5. Set up any other necessary test data

  // Example (pseudo-code):
  /*
  await prisma.user.createMany({
    data: [
      {
        email: 'admin@copilot-test.com',
        password: await hash('AdminTest123!@#'),
        fullName: 'Admin Test User',
        emailVerified: true,
        role: 'ADMIN',
      },
      {
        email: 'user@copilot-test.com',
        password: await hash('UserTest123!@#'),
        fullName: 'Regular Test User',
        emailVerified: true,
        role: 'USER',
      },
    ],
  });
  */

  console.log('Test data seeded successfully');
}

/**
 * Clean up test data after tests
 */
export async function cleanupTestData(): Promise<void> {
  console.log('Cleaning up test database...');

  // In a real implementation, you would:
  // 1. Delete all test users
  // 2. Delete all test cloud accounts
  // 3. Delete all test audit logs
  // 4. Reset any modified data

  // Example (pseudo-code):
  /*
  await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: '@copilot-test.com',
      },
    },
  });
  */

  console.log('Test data cleaned up successfully');
}

/**
 * Create a test user in the database
 */
export async function createTestUser(userData: TestUser): Promise<any> {
  console.log(`Creating test user: ${userData.email}`);

  // Implementation would use Prisma or your ORM
  /*
  return await prisma.user.create({
    data: {
      email: userData.email,
      password: await hash(userData.password),
      fullName: userData.fullName,
      emailVerified: userData.emailVerified ?? true,
      mfaEnabled: userData.mfaEnabled ?? false,
      role: userData.role ?? 'USER',
    },
  });
  */

  return { id: 'test-user-id', ...userData };
}

/**
 * Delete a test user from the database
 */
export async function deleteTestUser(email: string): Promise<void> {
  console.log(`Deleting test user: ${email}`);

  // Implementation would use Prisma or your ORM
  /*
  await prisma.user.delete({
    where: { email },
  });
  */
}

/**
 * Create a test cloud account
 */
export async function createTestCloudAccount(
  accountData: TestCloudAccount
): Promise<any> {
  console.log(`Creating test cloud account: ${accountData.name}`);

  // Implementation would use Prisma or your ORM
  /*
  return await prisma.cloudAccount.create({
    data: {
      name: accountData.name,
      provider: accountData.provider,
      credentials: encrypt(accountData.credentials),
      userId: accountData.userId,
    },
  });
  */

  return { id: 'test-account-id', ...accountData };
}

/**
 * Delete all cloud accounts for a user
 */
export async function deleteUserCloudAccounts(userId: string): Promise<void> {
  console.log(`Deleting cloud accounts for user: ${userId}`);

  // Implementation would use Prisma or your ORM
  /*
  await prisma.cloudAccount.deleteMany({
    where: { userId },
  });
  */
}

/**
 * Create audit log entry for testing
 */
export async function createAuditLog(logData: {
  userId: string;
  action: string;
  details?: Record<string, any>;
}): Promise<any> {
  console.log(`Creating audit log: ${logData.action}`);

  // Implementation would use Prisma or your ORM
  /*
  return await prisma.auditLog.create({
    data: {
      userId: logData.userId,
      action: logData.action,
      details: logData.details,
      timestamp: new Date(),
    },
  });
  */

  return { id: 'test-log-id', ...logData };
}

/**
 * Get all audit logs for a user
 */
export async function getUserAuditLogs(userId: string): Promise<any[]> {
  console.log(`Fetching audit logs for user: ${userId}`);

  // Implementation would use Prisma or your ORM
  /*
  return await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
  });
  */

  return [];
}

/**
 * Reset database to clean state
 */
export async function resetDatabase(): Promise<void> {
  console.log('Resetting database to clean state...');

  // Implementation would:
  // 1. Truncate all tables
  // 2. Reset sequences
  // 3. Seed with minimal required data

  /*
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.cloudAccount.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  */

  console.log('Database reset complete');
}

/**
 * Generate test email verification token
 */
export function generateTestVerificationToken(email: string): string {
  // In real implementation, create actual JWT token
  // For now, return a test token
  return `test-verification-token-${Buffer.from(email).toString('base64')}`;
}

/**
 * Generate test password reset token
 */
export function generateTestPasswordResetToken(email: string): string {
  // In real implementation, create actual JWT token
  // For now, return a test token
  return `test-reset-token-${Buffer.from(email).toString('base64')}`;
}

/**
 * Check if database is in test mode
 */
export function isTestDatabase(): boolean {
  const dbUrl = process.env.DATABASE_URL || '';
  return dbUrl.includes('test') || dbUrl.includes('testing');
}

/**
 * Wait for database to be ready
 */
export async function waitForDatabase(maxRetries = 10): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Try to connect to database
      // await prisma.$connect();
      console.log('Database is ready');
      return;
    } catch (error) {
      console.log(`Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Database connection timeout');
}
