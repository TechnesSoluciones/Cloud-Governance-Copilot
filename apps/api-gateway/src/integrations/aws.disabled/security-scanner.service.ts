/**
 * AWS Security Scanner Service
 *
 * This service implements security scanning for AWS resources to detect misconfigurations
 * and vulnerabilities according to CIS AWS Foundations Benchmark.
 *
 * Features:
 * - S3 bucket security checks (public access, SSL enforcement, encryption)
 * - EC2 security group checks (unrestricted access on critical ports)
 * - IAM policy checks (wildcard permissions, excessive privileges)
 * - Multi-region support
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 *
 * CIS Benchmarks Reference:
 * - S3.1: S3 buckets should require requests to use SSL
 * - S3.2: S3 buckets should prohibit public access
 * - EC2.1: Security groups should not allow unrestricted access to high-risk ports
 * - IAM.1: IAM policies should not allow full "*:*" privileges
 */

import {
  S3Client,
  ListBucketsCommand,
  GetBucketAclCommand,
  GetBucketPolicyCommand,
  GetPublicAccessBlockCommand,
  GetBucketEncryptionCommand,
  type Bucket,
  type Grant,
  type Grantee,
} from '@aws-sdk/client-s3';

import {
  EC2Client,
  DescribeSecurityGroupsCommand,
  type SecurityGroup,
  type IpPermission,
  type IpRange,
} from '@aws-sdk/client-ec2';

import {
  IAMClient,
  ListPoliciesCommand,
  GetPolicyVersionCommand,
  ListAttachedUserPoliciesCommand,
  ListAttachedRolePoliciesCommand,
  ListUsersCommand,
  ListRolesCommand,
  type Policy,
  type AttachedPolicy,
  type User,
  type Role,
} from '@aws-sdk/client-iam';

import type { SecurityFinding, SecuritySeverity } from '../cloud-provider.interface';

// ============================================================
// Types and Interfaces
// ============================================================

/**
 * AWS credentials configuration
 */
interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Critical ports that should not be exposed to the internet
 */
const CRITICAL_PORTS = [
  22,    // SSH
  3389,  // RDP
  3306,  // MySQL
  5432,  // PostgreSQL
  1433,  // MSSQL
  27017, // MongoDB
  6379,  // Redis
  5984,  // CouchDB
  9200,  // Elasticsearch
  11211, // Memcached
];

/**
 * AWS regions to scan
 */
const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'sa-east-1',
];

// ============================================================
// AWS Security Scanner Service Implementation
// ============================================================

export class AWSSecurityScannerService {
  private s3Client: S3Client;
  private ec2Clients: Map<string, EC2Client>;
  private iamClient: IAMClient;
  private credentials: AWSCredentials;

  // Retry configuration with exponential backoff
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  };

  /**
   * Creates an instance of AWSSecurityScannerService
   *
   * @param credentials - AWS credentials (access key ID and secret access key)
   * @param region - Primary AWS region (default: us-east-1)
   */
  constructor(credentials: AWSCredentials, region: string = 'us-east-1') {
    this.credentials = credentials;

    // Initialize S3 client (S3 is global, but we use us-east-1 as default)
    this.s3Client = new S3Client({
      region: 'us-east-1',
      credentials: this.credentials,
    });

    // Initialize IAM client (IAM is global, must use us-east-1)
    this.iamClient = new IAMClient({
      region: 'us-east-1',
      credentials: this.credentials,
    });

    // Initialize EC2 clients for each region
    this.ec2Clients = new Map();
    for (const r of AWS_REGIONS) {
      this.ec2Clients.set(r, new EC2Client({
        region: r,
        credentials: this.credentials,
      }));
    }

    console.log('[AWSSecurityScannerService] Initialized for security scanning');
  }

  // ============================================================
  // Main Scanning Methods
  // ============================================================

  /**
   * Runs all security scans across all AWS resources and regions
   *
   * @returns Array of all security findings
   */
  async scanAll(): Promise<SecurityFinding[]> {
    console.log('[AWSSecurityScannerService] Starting comprehensive security scan');
    const findings: SecurityFinding[] = [];

    try {
      // Run all scans in parallel
      const [s3Findings, ec2Findings, iamFindings] = await Promise.all([
        this.scanS3Buckets().catch(error => {
          console.warn('[AWSSecurityScannerService] S3 scan failed:', error.message);
          return [];
        }),
        this.scanSecurityGroups().catch(error => {
          console.warn('[AWSSecurityScannerService] Security groups scan failed:', error.message);
          return [];
        }),
        this.scanIAMPolicies().catch(error => {
          console.warn('[AWSSecurityScannerService] IAM scan failed:', error.message);
          return [];
        }),
      ]);

      findings.push(...s3Findings, ...ec2Findings, ...iamFindings);

      console.log(`[AWSSecurityScannerService] Scan complete. Found ${findings.length} security findings`);
      return findings;
    } catch (error: any) {
      console.error('[AWSSecurityScannerService] Security scan failed:', error.message);
      throw error;
    }
  }

  /**
   * Scans all AWS regions for security findings
   *
   * @param credentials - AWS credentials
   * @returns Array of security findings from all regions
   */
  async scanAllRegions(credentials: AWSCredentials): Promise<SecurityFinding[]> {
    console.log('[AWSSecurityScannerService] Starting multi-region security scan');
    const findingsByRegion = await Promise.all(
      AWS_REGIONS.map(async region => {
        console.log(`[AWSSecurityScannerService] Scanning region: ${region}`);
        const scanner = new AWSSecurityScannerService(credentials, region);
        return scanner.scanAll().catch(error => {
          console.warn(`[AWSSecurityScannerService] Region ${region} scan failed:`, error.message);
          return [];
        });
      })
    );

    const allFindings = findingsByRegion.flat();
    console.log(`[AWSSecurityScannerService] Multi-region scan complete. Found ${allFindings.length} findings`);
    return allFindings;
  }

  // ============================================================
  // S3 Bucket Security Scanning
  // ============================================================

  /**
   * Scans all S3 buckets for security misconfigurations
   *
   * Checks performed:
   * - Public access (ACLs and bucket policies)
   * - SSL enforcement (bucket policy with aws:SecureTransport)
   * - Encryption at rest
   *
   * @returns Array of S3 security findings
   */
  private async scanS3Buckets(): Promise<SecurityFinding[]> {
    console.log('[AWSSecurityScannerService] Scanning S3 buckets');
    const findings: SecurityFinding[] = [];

    try {
      // List all buckets
      const listBucketsCommand = new ListBucketsCommand({});
      const bucketsResponse = await this.retryWithBackoff(() => this.s3Client.send(listBucketsCommand));

      const buckets = bucketsResponse.Buckets || [];
      console.log(`[AWSSecurityScannerService] Found ${buckets.length} S3 buckets to scan`);

      // Scan each bucket in parallel
      const bucketFindings = await Promise.all(
        buckets.map(bucket => this.scanSingleBucket(bucket))
      );

      // Flatten results
      bucketFindings.forEach(bucketFinding => findings.push(...bucketFinding));

      console.log(`[AWSSecurityScannerService] S3 scan complete. Found ${findings.length} findings`);
      return findings;
    } catch (error: any) {
      if (this.isPermissionError(error)) {
        console.warn('[AWSSecurityScannerService] No S3 permissions, skipping bucket scan');
        return [];
      }
      throw error;
    }
  }

  /**
   * Scans a single S3 bucket for security issues
   *
   * @param bucket - S3 bucket to scan
   * @returns Array of security findings for this bucket
   */
  private async scanSingleBucket(bucket: Bucket): Promise<SecurityFinding[]> {
    const bucketName = bucket.Name!;
    const findings: SecurityFinding[] = [];

    try {
      // Check public access
      const publicAccessFinding = await this.checkBucketPublicAccess(bucketName);
      if (publicAccessFinding) findings.push(publicAccessFinding);

      // Check SSL enforcement
      const sslEnforcementFinding = await this.checkBucketSSLEnforcement(bucketName);
      if (sslEnforcementFinding) findings.push(sslEnforcementFinding);

      // Check encryption
      const encryptionFinding = await this.checkBucketEncryption(bucketName);
      if (encryptionFinding) findings.push(encryptionFinding);
    } catch (error: any) {
      if (!this.isPermissionError(error)) {
        console.warn(`[AWSSecurityScannerService] Failed to scan bucket ${bucketName}:`, error.message);
      }
    }

    return findings;
  }

  /**
   * Checks if an S3 bucket has public access
   *
   * @param bucketName - Name of the S3 bucket
   * @returns Security finding if bucket is public, null otherwise
   */
  private async checkBucketPublicAccess(bucketName: string): Promise<SecurityFinding | null> {
    try {
      // Check ACL
      const aclCommand = new GetBucketAclCommand({ Bucket: bucketName });
      const aclResponse = await this.retryWithBackoff(() => this.s3Client.send(aclCommand));

      // Check if ACL grants public access
      const hasPublicAcl = this.hasPublicAccessInACL(aclResponse.Grants || []);

      // Check public access block configuration
      let hasPublicAccessBlock = false;
      try {
        const publicAccessBlockCommand = new GetPublicAccessBlockCommand({ Bucket: bucketName });
        const publicAccessBlockResponse = await this.retryWithBackoff(() =>
          this.s3Client.send(publicAccessBlockCommand)
        );
        hasPublicAccessBlock = this.isPublicAccessBlocked(publicAccessBlockResponse.PublicAccessBlockConfiguration);
      } catch (error: any) {
        // NoSuchPublicAccessBlockConfiguration means no block is configured
        if (error.name !== 'NoSuchPublicAccessBlockConfiguration') {
          throw error;
        }
      }

      // Check bucket policy for public access
      let hasPublicPolicy = false;
      try {
        const policyCommand = new GetBucketPolicyCommand({ Bucket: bucketName });
        const policyResponse = await this.retryWithBackoff(() => this.s3Client.send(policyCommand));
        hasPublicPolicy = this.hasPublicAccessInPolicy(policyResponse.Policy || '');
      } catch (error: any) {
        // NoSuchBucketPolicy is fine, means no policy exists
        if (error.name !== 'NoSuchBucketPolicy') {
          throw error;
        }
      }

      // If bucket is public, create finding
      if ((hasPublicAcl || hasPublicPolicy) && !hasPublicAccessBlock) {
        return {
          findingId: `s3-public-${bucketName}-${Date.now()}`,
          title: 'S3 Bucket Has Public Access',
          description: `S3 bucket "${bucketName}" allows public access through ${hasPublicAcl ? 'ACL' : 'bucket policy'}. This exposes data to unauthorized users.`,
          severity: 'critical',
          category: 'DATA_PROTECTION',
          resourceId: `arn:aws:s3:::${bucketName}`,
          resourceType: 'S3_BUCKET',
          region: 'us-east-1',
          remediation: `1. Navigate to S3 console → Select bucket "${bucketName}"\n2. Go to "Permissions" tab\n3. Enable "Block all public access"\n4. Review and remove public grants from ACL\n5. Review bucket policy for Principal: "*" statements`,
          compliance: ['CIS AWS 1.2.0 - 2.1.5'],
          metadata: {
            bucketName,
            hasPublicAcl,
            hasPublicPolicy,
            hasPublicAccessBlock,
          },
          firstObservedAt: new Date(),
          lastObservedAt: new Date(),
        };
      }

      return null;
    } catch (error: any) {
      if (this.isPermissionError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Checks if an S3 bucket enforces SSL/TLS
   *
   * @param bucketName - Name of the S3 bucket
   * @returns Security finding if SSL is not enforced, null otherwise
   */
  private async checkBucketSSLEnforcement(bucketName: string): Promise<SecurityFinding | null> {
    try {
      const policyCommand = new GetBucketPolicyCommand({ Bucket: bucketName });
      const policyResponse = await this.retryWithBackoff(() => this.s3Client.send(policyCommand));

      const hasSSLEnforcement = this.hasSSLEnforcementInPolicy(policyResponse.Policy || '');

      if (!hasSSLEnforcement) {
        return {
          findingId: `s3-no-ssl-${bucketName}-${Date.now()}`,
          title: 'S3 Bucket Does Not Enforce SSL/TLS',
          description: `S3 bucket "${bucketName}" does not enforce SSL/TLS for data in transit. This allows unencrypted connections.`,
          severity: 'medium',
          category: 'DATA_PROTECTION',
          resourceId: `arn:aws:s3:::${bucketName}`,
          resourceType: 'S3_BUCKET',
          region: 'us-east-1',
          remediation: `1. Navigate to S3 console → Select bucket "${bucketName}"\n2. Go to "Permissions" → "Bucket Policy"\n3. Add a policy statement that denies requests where aws:SecureTransport is false:\n{\n  "Effect": "Deny",\n  "Principal": "*",\n  "Action": "s3:*",\n  "Resource": ["arn:aws:s3:::${bucketName}/*", "arn:aws:s3:::${bucketName}"],\n  "Condition": {"Bool": {"aws:SecureTransport": "false"}}\n}`,
          compliance: ['CIS AWS 1.2.0 - 2.1.2'],
          metadata: {
            bucketName,
          },
          firstObservedAt: new Date(),
          lastObservedAt: new Date(),
        };
      }

      return null;
    } catch (error: any) {
      // NoSuchBucketPolicy is expected if no policy exists
      if (error.name === 'NoSuchBucketPolicy') {
        return {
          findingId: `s3-no-ssl-${bucketName}-${Date.now()}`,
          title: 'S3 Bucket Does Not Enforce SSL/TLS',
          description: `S3 bucket "${bucketName}" has no bucket policy to enforce SSL/TLS for data in transit.`,
          severity: 'medium',
          category: 'DATA_PROTECTION',
          resourceId: `arn:aws:s3:::${bucketName}`,
          resourceType: 'S3_BUCKET',
          region: 'us-east-1',
          remediation: `Add a bucket policy to enforce SSL/TLS (see CIS AWS 2.1.2)`,
          compliance: ['CIS AWS 1.2.0 - 2.1.2'],
          metadata: { bucketName },
          firstObservedAt: new Date(),
          lastObservedAt: new Date(),
        };
      }

      if (this.isPermissionError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Checks if an S3 bucket has encryption enabled
   *
   * @param bucketName - Name of the S3 bucket
   * @returns Security finding if encryption is not enabled, null otherwise
   */
  private async checkBucketEncryption(bucketName: string): Promise<SecurityFinding | null> {
    try {
      const encryptionCommand = new GetBucketEncryptionCommand({ Bucket: bucketName });
      await this.retryWithBackoff(() => this.s3Client.send(encryptionCommand));

      // If we get here, encryption is configured
      return null;
    } catch (error: any) {
      // ServerSideEncryptionConfigurationNotFoundError means no encryption
      if (error.name === 'ServerSideEncryptionConfigurationNotFoundError') {
        return {
          findingId: `s3-no-encryption-${bucketName}-${Date.now()}`,
          title: 'S3 Bucket Does Not Have Encryption Enabled',
          description: `S3 bucket "${bucketName}" does not have default encryption enabled. Data at rest is not encrypted.`,
          severity: 'medium',
          category: 'DATA_PROTECTION',
          resourceId: `arn:aws:s3:::${bucketName}`,
          resourceType: 'S3_BUCKET',
          region: 'us-east-1',
          remediation: `1. Navigate to S3 console → Select bucket "${bucketName}"\n2. Go to "Properties" tab\n3. Find "Default encryption" section\n4. Click "Edit"\n5. Enable "Server-side encryption"\n6. Choose encryption type (SSE-S3 or SSE-KMS)`,
          compliance: ['CIS AWS 1.2.0 - 2.1.1'],
          metadata: {
            bucketName,
          },
          firstObservedAt: new Date(),
          lastObservedAt: new Date(),
        };
      }

      if (this.isPermissionError(error)) {
        return null;
      }
      throw error;
    }
  }

  // ============================================================
  // EC2 Security Group Scanning
  // ============================================================

  /**
   * Scans all EC2 security groups across all regions
   *
   * Checks for:
   * - Unrestricted access (0.0.0.0/0) on critical ports
   *
   * @returns Array of security group findings
   */
  private async scanSecurityGroups(): Promise<SecurityFinding[]> {
    console.log('[AWSSecurityScannerService] Scanning EC2 security groups across all regions');
    const findings: SecurityFinding[] = [];

    try {
      // Scan security groups in all regions in parallel
      const regionFindings = await Promise.all(
        Array.from(this.ec2Clients.entries()).map(async ([region, client]) => {
          try {
            return await this.scanSecurityGroupsInRegion(region, client);
          } catch (error: any) {
            if (this.isPermissionError(error)) {
              console.warn(`[AWSSecurityScannerService] No EC2 permissions in ${region}, skipping`);
              return [];
            }
            // Return empty array for other errors to prevent entire scan from failing
            console.warn(`[AWSSecurityScannerService] Failed to scan security groups in ${region}:`, error.message);
            return [];
          }
        })
      );

      // Flatten results
      regionFindings.forEach(regionFinding => findings.push(...regionFinding));

      console.log(`[AWSSecurityScannerService] Security groups scan complete. Found ${findings.length} findings`);
      return findings;
    } catch (error: any) {
      console.error('[AWSSecurityScannerService] Security groups scan failed:', error.message);
      // Return empty array instead of throwing to allow other scans to continue
      return [];
    }
  }

  /**
   * Scans security groups in a specific region
   *
   * @param region - AWS region
   * @param client - EC2 client for the region
   * @returns Array of security findings for the region
   */
  private async scanSecurityGroupsInRegion(region: string, client: EC2Client): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      const command = new DescribeSecurityGroupsCommand({});
      const response = await this.retryWithBackoff(() => client.send(command));

      const securityGroups = response.SecurityGroups || [];
      console.log(`[AWSSecurityScannerService] Found ${securityGroups.length} security groups in ${region}`);

      // Check each security group
      for (const sg of securityGroups) {
        const sgFindings = this.checkSecurityGroupRules(sg, region);
        findings.push(...sgFindings);
      }
    } catch (error: any) {
      if (!this.isPermissionError(error)) {
        console.warn(`[AWSSecurityScannerService] Failed to scan security groups in ${region}:`, error.message);
      }
      throw error;
    }

    return findings;
  }

  /**
   * Checks a security group for unrestricted access on critical ports
   *
   * @param securityGroup - Security group to check
   * @param region - AWS region
   * @returns Array of security findings
   */
  private checkSecurityGroupRules(securityGroup: SecurityGroup, region: string): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const sgId = securityGroup.GroupId!;
    const sgName = securityGroup.GroupName || 'Unknown';

    // Check ingress rules
    const ingressRules = securityGroup.IpPermissions || [];

    for (const rule of ingressRules) {
      const fromPort = rule.FromPort;
      const toPort = rule.ToPort;

      // Check if rule has unrestricted access (0.0.0.0/0 or ::/0)
      const hasUnrestrictedIPv4 = this.hasUnrestrictedAccess(rule.IpRanges || []);
      const hasUnrestrictedIPv6 = this.hasUnrestrictedAccess(rule.Ipv6Ranges || [], true);

      if (hasUnrestrictedIPv4 || hasUnrestrictedIPv6) {
        // Check if any critical ports are exposed
        for (const criticalPort of CRITICAL_PORTS) {
          if (this.isPortInRange(criticalPort, fromPort, toPort)) {
            findings.push({
              findingId: `sg-unrestricted-${sgId}-${criticalPort}-${Date.now()}`,
              title: `Security Group Allows Unrestricted Access on Port ${criticalPort}`,
              description: `Security group "${sgName}" (${sgId}) allows unrestricted access (0.0.0.0/0) on port ${criticalPort}. This exposes services to the entire internet.`,
              severity: this.calculateSecurityGroupSeverity(criticalPort),
              category: 'NETWORK',
              resourceId: sgId,
              resourceType: 'EC2_SECURITY_GROUP',
              region,
              remediation: `1. Navigate to EC2 console → Security Groups\n2. Select security group "${sgName}" (${sgId})\n3. Go to "Inbound rules" tab\n4. Edit or remove rule allowing 0.0.0.0/0 on port ${criticalPort}\n5. Restrict access to specific IP ranges or security groups`,
              compliance: ['CIS AWS 1.2.0 - 5.2'],
              metadata: {
                securityGroupId: sgId,
                securityGroupName: sgName,
                port: criticalPort,
                protocol: rule.IpProtocol || 'tcp',
                portRange: fromPort === toPort ? `${fromPort}` : `${fromPort}-${toPort}`,
              },
              firstObservedAt: new Date(),
              lastObservedAt: new Date(),
            });
          }
        }
      }
    }

    return findings;
  }

  // ============================================================
  // IAM Policy Scanning
  // ============================================================

  /**
   * Scans IAM policies for excessive permissions
   *
   * Checks for:
   * - Policies with Action: "*" and Resource: "*"
   * - AdministratorAccess policy attachments
   *
   * @returns Array of IAM security findings
   */
  private async scanIAMPolicies(): Promise<SecurityFinding[]> {
    console.log('[AWSSecurityScannerService] Scanning IAM policies');
    const findings: SecurityFinding[] = [];

    try {
      // Scan customer-managed policies
      const policyFindings = await this.scanCustomerManagedPolicies();
      findings.push(...policyFindings);

      // Check for AdministratorAccess attachments
      const adminFindings = await this.scanAdministratorAccessAttachments();
      findings.push(...adminFindings);

      console.log(`[AWSSecurityScannerService] IAM scan complete. Found ${findings.length} findings`);
      return findings;
    } catch (error: any) {
      if (this.isPermissionError(error)) {
        console.warn('[AWSSecurityScannerService] No IAM permissions, skipping IAM scan');
        return [];
      }
      throw error;
    }
  }

  /**
   * Scans customer-managed IAM policies for wildcard permissions
   *
   * @returns Array of security findings
   */
  private async scanCustomerManagedPolicies(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      // List customer-managed policies
      const listPoliciesCommand = new ListPoliciesCommand({
        Scope: 'Local', // Only customer-managed policies
        MaxItems: 1000,
      });
      const policiesResponse = await this.retryWithBackoff(() => this.iamClient.send(listPoliciesCommand));

      const policies = policiesResponse.Policies || [];
      console.log(`[AWSSecurityScannerService] Found ${policies.length} customer-managed policies`);

      // Check each policy
      for (const policy of policies) {
        const policyFinding = await this.checkPolicyForWildcardPermissions(policy);
        if (policyFinding) findings.push(policyFinding);
      }
    } catch (error: any) {
      if (!this.isPermissionError(error)) {
        console.warn('[AWSSecurityScannerService] Failed to scan IAM policies:', error.message);
      }
      throw error;
    }

    return findings;
  }

  /**
   * Checks a single IAM policy for wildcard permissions
   *
   * @param policy - IAM policy to check
   * @returns Security finding if wildcard permissions found, null otherwise
   */
  private async checkPolicyForWildcardPermissions(policy: Policy): Promise<SecurityFinding | null> {
    try {
      const policyArn = policy.Arn!;
      const policyName = policy.PolicyName!;
      const defaultVersionId = policy.DefaultVersionId!;

      // Get policy document
      const getPolicyVersionCommand = new GetPolicyVersionCommand({
        PolicyArn: policyArn,
        VersionId: defaultVersionId,
      });
      const policyVersionResponse = await this.retryWithBackoff(() =>
        this.iamClient.send(getPolicyVersionCommand)
      );

      const policyDocument = policyVersionResponse.PolicyVersion?.Document;
      if (!policyDocument) return null;

      // Parse policy document
      const policyJson = JSON.parse(decodeURIComponent(policyDocument));
      const hasWildcardPermissions = this.hasWildcardPermissionsInPolicy(policyJson);

      if (hasWildcardPermissions) {
        return {
          findingId: `iam-wildcard-${policyArn}-${Date.now()}`,
          title: 'IAM Policy Contains Wildcard Permissions',
          description: `IAM policy "${policyName}" grants excessive permissions with Action: "*" and Resource: "*". This allows unrestricted access to all AWS services.`,
          severity: 'high',
          category: 'IAM',
          resourceId: policyArn,
          resourceType: 'IAM_POLICY',
          region: 'us-east-1', // IAM is global
          remediation: `1. Navigate to IAM console → Policies\n2. Select policy "${policyName}"\n3. Review policy statements\n4. Replace wildcard actions (*) with specific actions\n5. Replace wildcard resources (*) with specific resource ARNs\n6. Follow principle of least privilege`,
          compliance: ['CIS AWS 1.2.0 - 1.16'],
          metadata: {
            policyArn,
            policyName,
            policyDocument: policyJson,
          },
          firstObservedAt: new Date(),
          lastObservedAt: new Date(),
        };
      }

      return null;
    } catch (error: any) {
      if (!this.isPermissionError(error)) {
        console.warn(`[AWSSecurityScannerService] Failed to check policy ${policy.PolicyName}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Scans for AdministratorAccess policy attachments
   *
   * @returns Array of security findings
   */
  private async scanAdministratorAccessAttachments(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      // Check users
      const userFindings = await this.scanUsersForAdminAccess();
      findings.push(...userFindings);

      // Check roles
      const roleFindings = await this.scanRolesForAdminAccess();
      findings.push(...roleFindings);
    } catch (error: any) {
      if (!this.isPermissionError(error)) {
        console.warn('[AWSSecurityScannerService] Failed to scan AdministratorAccess attachments:', error.message);
      }
    }

    return findings;
  }

  /**
   * Scans IAM users for AdministratorAccess policy attachment
   *
   * @returns Array of security findings
   */
  private async scanUsersForAdminAccess(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      // List all users
      const listUsersCommand = new ListUsersCommand({ MaxItems: 1000 });
      const usersResponse = await this.retryWithBackoff(() => this.iamClient.send(listUsersCommand));

      const users = usersResponse.Users || [];

      // Check each user's attached policies
      for (const user of users) {
        const userName = user.UserName!;
        const listAttachedCommand = new ListAttachedUserPoliciesCommand({ UserName: userName });
        const attachedResponse = await this.retryWithBackoff(() => this.iamClient.send(listAttachedCommand));

        const attachedPolicies = attachedResponse.AttachedPolicies || [];
        const hasAdminAccess = attachedPolicies.some(
          p => p.PolicyName === 'AdministratorAccess'
        );

        if (hasAdminAccess) {
          findings.push({
            findingId: `iam-admin-user-${userName}-${Date.now()}`,
            title: 'IAM User Has AdministratorAccess',
            description: `IAM user "${userName}" has AdministratorAccess policy attached, granting full access to all AWS services.`,
            severity: 'high',
            category: 'IAM',
            resourceId: user.Arn!,
            resourceType: 'IAM_USER',
            region: 'us-east-1',
            remediation: `1. Navigate to IAM console → Users\n2. Select user "${userName}"\n3. Remove AdministratorAccess policy\n4. Attach policies with least privilege permissions`,
            compliance: ['CIS AWS 1.2.0 - 1.16'],
            metadata: {
              userName,
              userArn: user.Arn,
            },
            firstObservedAt: new Date(),
            lastObservedAt: new Date(),
          });
        }
      }
    } catch (error: any) {
      if (!this.isPermissionError(error)) {
        throw error;
      }
    }

    return findings;
  }

  /**
   * Scans IAM roles for AdministratorAccess policy attachment
   *
   * @returns Array of security findings
   */
  private async scanRolesForAdminAccess(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      // List all roles
      const listRolesCommand = new ListRolesCommand({ MaxItems: 1000 });
      const rolesResponse = await this.retryWithBackoff(() => this.iamClient.send(listRolesCommand));

      const roles = rolesResponse.Roles || [];

      // Check each role's attached policies
      for (const role of roles) {
        const roleName = role.RoleName!;
        const listAttachedCommand = new ListAttachedRolePoliciesCommand({ RoleName: roleName });
        const attachedResponse = await this.retryWithBackoff(() => this.iamClient.send(listAttachedCommand));

        const attachedPolicies = attachedResponse.AttachedPolicies || [];
        const hasAdminAccess = attachedPolicies.some(
          p => p.PolicyName === 'AdministratorAccess'
        );

        if (hasAdminAccess) {
          findings.push({
            findingId: `iam-admin-role-${roleName}-${Date.now()}`,
            title: 'IAM Role Has AdministratorAccess',
            description: `IAM role "${roleName}" has AdministratorAccess policy attached, granting full access to all AWS services.`,
            severity: 'high',
            category: 'IAM',
            resourceId: role.Arn!,
            resourceType: 'IAM_ROLE',
            region: 'us-east-1',
            remediation: `1. Navigate to IAM console → Roles\n2. Select role "${roleName}"\n3. Remove AdministratorAccess policy\n4. Attach policies with least privilege permissions`,
            compliance: ['CIS AWS 1.2.0 - 1.16'],
            metadata: {
              roleName,
              roleArn: role.Arn,
            },
            firstObservedAt: new Date(),
            lastObservedAt: new Date(),
          });
        }
      }
    } catch (error: any) {
      if (!this.isPermissionError(error)) {
        throw error;
      }
    }

    return findings;
  }

  // ============================================================
  // Helper Methods - S3
  // ============================================================

  /**
   * Checks if ACL grants have public access
   *
   * @param grants - S3 bucket ACL grants
   * @returns True if public access is granted
   */
  private hasPublicAccessInACL(grants: Grant[]): boolean {
    return grants.some(grant => {
      const grantee = grant.Grantee;
      if (!grantee) return false;

      // Check for AllUsers or AuthenticatedUsers groups
      if (grantee.Type === 'Group') {
        const uri = grantee.URI || '';
        return uri.includes('AllUsers') || uri.includes('AuthenticatedUsers');
      }

      return false;
    });
  }

  /**
   * Checks if bucket policy grants public access
   *
   * @param policyJson - Bucket policy JSON string
   * @returns True if public access is granted
   */
  private hasPublicAccessInPolicy(policyJson: string): boolean {
    if (!policyJson) return false;

    try {
      const policy = JSON.parse(policyJson);
      const statements = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement];

      return statements.some((statement: any) => {
        const effect = statement.Effect;
        const principal = statement.Principal;

        // Check for Allow effect with public principal
        if (effect === 'Allow') {
          if (principal === '*') return true;
          if (typeof principal === 'object' && principal.AWS === '*') return true;
        }

        return false;
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if public access block configuration is properly set
   *
   * @param config - Public access block configuration
   * @returns True if public access is blocked
   */
  private isPublicAccessBlocked(config: any): boolean {
    if (!config) return false;

    return (
      config.BlockPublicAcls === true &&
      config.IgnorePublicAcls === true &&
      config.BlockPublicPolicy === true &&
      config.RestrictPublicBuckets === true
    );
  }

  /**
   * Checks if bucket policy enforces SSL/TLS
   *
   * @param policyJson - Bucket policy JSON string
   * @returns True if SSL/TLS is enforced
   */
  private hasSSLEnforcementInPolicy(policyJson: string): boolean {
    if (!policyJson) return false;

    try {
      const policy = JSON.parse(policyJson);
      const statements = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement];

      return statements.some((statement: any) => {
        const effect = statement.Effect;
        const condition = statement.Condition;

        // Check for Deny effect with SecureTransport: false condition
        if (effect === 'Deny' && condition) {
          const boolCondition = condition.Bool || {};
          const secureTransport = boolCondition['aws:SecureTransport'];
          // Check for string "false" or boolean false
          return secureTransport === 'false' || secureTransport === false || secureTransport === 'False';
        }

        return false;
      });
    } catch (error) {
      return false;
    }
  }

  // ============================================================
  // Helper Methods - Security Groups
  // ============================================================

  /**
   * Checks if IP ranges contain unrestricted access (0.0.0.0/0 or ::/0)
   *
   * @param ranges - IP ranges to check
   * @param isIPv6 - Whether checking IPv6 ranges
   * @returns True if unrestricted access is found
   */
  private hasUnrestrictedAccess(ranges: any[], isIPv6: boolean = false): boolean {
    return ranges.some(range => {
      const cidr = range.CidrIp || range.CidrIpv6;
      return cidr === (isIPv6 ? '::/0' : '0.0.0.0/0');
    });
  }

  /**
   * Checks if a port is within a port range
   *
   * @param port - Port to check
   * @param fromPort - Start of port range
   * @param toPort - End of port range
   * @returns True if port is in range
   */
  private isPortInRange(port: number, fromPort?: number, toPort?: number): boolean {
    // If no port range specified, rule applies to all ports
    if (fromPort === undefined || toPort === undefined) return true;

    // Special case: -1 means all ports
    if (fromPort === -1 || toPort === -1) return true;

    return port >= fromPort && port <= toPort;
  }

  /**
   * Calculates severity for security group findings based on port
   *
   * @param port - Port number
   * @returns Severity level
   */
  private calculateSecurityGroupSeverity(port: number): SecuritySeverity {
    // SSH and RDP are critical
    if (port === 22 || port === 3389) return 'high';

    // Database ports are high
    if ([3306, 5432, 1433, 27017, 6379, 5984, 9200, 11211].includes(port)) return 'high';

    return 'medium';
  }

  // ============================================================
  // Helper Methods - IAM
  // ============================================================

  /**
   * Checks if IAM policy contains wildcard permissions
   *
   * @param policyDocument - Parsed policy document
   * @returns True if wildcard permissions found
   */
  private hasWildcardPermissionsInPolicy(policyDocument: any): boolean {
    if (!policyDocument || !policyDocument.Statement) return false;

    const statements = Array.isArray(policyDocument.Statement)
      ? policyDocument.Statement
      : [policyDocument.Statement];

    return statements.some((statement: any) => {
      const effect = statement.Effect;
      const action = statement.Action;
      const resource = statement.Resource;

      if (effect !== 'Allow') return false;

      // Check for Action: "*"
      const hasWildcardAction = action === '*' || (Array.isArray(action) && action.includes('*'));

      // Check for Resource: "*"
      const hasWildcardResource = resource === '*' || (Array.isArray(resource) && resource.includes('*'));

      return hasWildcardAction && hasWildcardResource;
    });
  }

  // ============================================================
  // Helper Methods - Retry and Error Handling
  // ============================================================

  /**
   * Implements retry logic with exponential backoff
   *
   * @param operation - Async operation to retry
   * @param retryCount - Current retry attempt
   * @returns Result of the operation
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const isRetryable = this.isRetryableError(error);
      const shouldRetry = retryCount < this.retryConfig.maxRetries && isRetryable;

      if (shouldRetry) {
        const delay = Math.min(
          this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, retryCount),
          this.retryConfig.maxDelayMs
        );

        console.warn(
          `[AWSSecurityScannerService] Retrying operation (attempt ${retryCount + 1}/${this.retryConfig.maxRetries}) after ${delay}ms`
        );

        await this.sleep(delay);
        return this.retryWithBackoff(operation, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Determines if an error is retryable
   *
   * @param error - Error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Throttling errors
    if (error.name === 'ThrottlingException' || error.$metadata?.httpStatusCode === 429) {
      return true;
    }

    // Rate limiting
    if (error.name === 'TooManyRequestsException' || error.name === 'RequestLimitExceeded') {
      return true;
    }

    // Transient network errors
    if (error.name === 'NetworkingError' || error.code === 'ECONNRESET') {
      return true;
    }

    // Service unavailable
    if (error.$metadata?.httpStatusCode === 503) {
      return true;
    }

    return false;
  }

  /**
   * Checks if error is related to permissions
   *
   * @param error - Error to check
   * @returns True if error is permission-related
   */
  private isPermissionError(error: any): boolean {
    const permissionErrorNames = [
      'AccessDenied',
      'AccessDeniedException',
      'UnauthorizedOperation',
      'UnauthorizedException',
      'InsufficientPermissions',
    ];

    return permissionErrorNames.includes(error.name);
  }

  /**
   * Sleep utility for retry delays
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
