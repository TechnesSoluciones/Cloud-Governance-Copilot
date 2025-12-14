/**
 * Unit Tests: AWS Security Scanner Service
 *
 * This test suite verifies the AWS Security Scanner Service functionality with mocked AWS SDK.
 * Tests cover S3 bucket scanning, EC2 security group scanning, IAM policy scanning,
 * multi-region support, and comprehensive error handling.
 *
 * Test Coverage:
 * - S3 bucket security checks (public access, SSL enforcement, encryption)
 * - EC2 security group checks (unrestricted access on critical ports)
 * - IAM policy checks (wildcard permissions, AdministratorAccess)
 * - Multi-region scanning
 * - Retry logic with exponential backoff
 * - Error handling (permission errors, API errors, network errors)
 * - Severity classification
 */

import { AWSSecurityScannerService } from '../../../integrations/aws/security-scanner.service';
import {
  S3Client,
  ListBucketsCommand,
  GetBucketAclCommand,
  GetBucketPolicyCommand,
  GetPublicAccessBlockCommand,
  GetBucketEncryptionCommand,
} from '@aws-sdk/client-s3';
import {
  EC2Client,
  DescribeSecurityGroupsCommand,
} from '@aws-sdk/client-ec2';
import {
  IAMClient,
  ListPoliciesCommand,
  GetPolicyVersionCommand,
  ListUsersCommand,
  ListRolesCommand,
  ListAttachedUserPoliciesCommand,
  ListAttachedRolePoliciesCommand,
} from '@aws-sdk/client-iam';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-ec2');
jest.mock('@aws-sdk/client-iam');

describe('AWSSecurityScannerService', () => {
  let service: AWSSecurityScannerService;
  let mockS3Send: jest.Mock;
  let mockEC2Send: jest.Mock;
  let mockIAMSend: jest.Mock;

  const mockCredentials = {
    accessKeyId: 'test-access-key-id',
    secretAccessKey: 'test-secret-access-key',
  };

  beforeEach(() => {
    // Create mock send functions
    mockS3Send = jest.fn();
    mockEC2Send = jest.fn();
    mockIAMSend = jest.fn();

    // Mock S3 client
    (S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(() => ({
      send: mockS3Send,
    } as any));

    // Mock EC2 client
    (EC2Client as jest.MockedClass<typeof EC2Client>).mockImplementation(() => ({
      send: mockEC2Send,
    } as any));

    // Mock IAM client
    (IAMClient as jest.MockedClass<typeof IAMClient>).mockImplementation(() => ({
      send: mockIAMSend,
    } as any));

    // Create service instance
    service = new AWSSecurityScannerService(mockCredentials, 'us-east-1');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Constructor Tests
  // ============================================================

  describe('Constructor', () => {
    it('should initialize S3, EC2, and IAM clients correctly', () => {
      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: mockCredentials,
      });

      expect(IAMClient).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: mockCredentials,
      });

      // EC2 clients should be created for all regions
      expect(EC2Client).toHaveBeenCalled();
    });
  });

  // ============================================================
  // S3 Bucket Scanning Tests
  // ============================================================

  describe('S3 Bucket Scanning', () => {
    describe('Public Access Detection', () => {
      it('should detect bucket with public ACL', async () => {
        // Arrange
        mockS3Send
          .mockResolvedValueOnce({
            // ListBuckets
            Buckets: [{ Name: 'test-bucket', CreationDate: new Date() }],
          })
          .mockResolvedValueOnce({
            // GetBucketAcl
            Grants: [
              {
                Grantee: {
                  Type: 'Group',
                  URI: 'http://acs.amazonaws.com/groups/global/AllUsers',
                },
                Permission: 'READ',
              },
            ],
          })
          .mockRejectedValueOnce({
            // GetPublicAccessBlock - not configured
            name: 'NoSuchPublicAccessBlockConfiguration',
          })
          .mockRejectedValueOnce({
            // GetBucketPolicy - no policy
            name: 'NoSuchBucketPolicy',
          })
          .mockRejectedValueOnce({
            // GetBucketEncryption
            name: 'ServerSideEncryptionConfigurationNotFoundError',
          });

        // Act
        const findings = await service.scanAll();

        // Assert
        const publicAccessFinding = findings.find(f => f.title === 'S3 Bucket Has Public Access');
        expect(publicAccessFinding).toBeDefined();
        expect(publicAccessFinding?.severity).toBe('critical');
        expect(publicAccessFinding?.category).toBe('DATA_PROTECTION');
        expect(publicAccessFinding?.resourceType).toBe('S3_BUCKET');
        expect(publicAccessFinding?.compliance).toContain('CIS AWS 1.2.0 - 2.1.5');
      });

      it('should detect bucket with public policy', async () => {
        // Arrange
        const publicPolicy = JSON.stringify({
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::test-bucket/*',
            },
          ],
        });

        mockS3Send
          .mockResolvedValueOnce({
            // ListBuckets
            Buckets: [{ Name: 'test-bucket', CreationDate: new Date() }],
          })
          .mockResolvedValueOnce({
            // GetBucketAcl
            Grants: [],
          })
          .mockRejectedValueOnce({
            // GetPublicAccessBlock
            name: 'NoSuchPublicAccessBlockConfiguration',
          })
          .mockResolvedValueOnce({
            // GetBucketPolicy
            Policy: publicPolicy,
          })
          .mockResolvedValueOnce({
            // GetBucketEncryption
            ServerSideEncryptionConfiguration: {},
          });

        // Act
        const findings = await service.scanAll();

        // Assert
        const publicAccessFinding = findings.find(f => f.title === 'S3 Bucket Has Public Access');
        expect(publicAccessFinding).toBeDefined();
        expect(publicAccessFinding?.severity).toBe('critical');
        expect(publicAccessFinding?.metadata?.hasPublicPolicy).toBe(true);
      });

      it('should not flag bucket with public access block enabled', async () => {
        // Arrange
        mockS3Send
          .mockResolvedValueOnce({
            // ListBuckets
            Buckets: [{ Name: 'test-bucket', CreationDate: new Date() }],
          })
          .mockResolvedValueOnce({
            // GetBucketAcl
            Grants: [
              {
                Grantee: {
                  Type: 'Group',
                  URI: 'http://acs.amazonaws.com/groups/global/AllUsers',
                },
                Permission: 'READ',
              },
            ],
          })
          .mockResolvedValueOnce({
            // GetPublicAccessBlock - properly configured
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              IgnorePublicAcls: true,
              BlockPublicPolicy: true,
              RestrictPublicBuckets: true,
            },
          })
          .mockRejectedValueOnce({
            // GetBucketPolicy
            name: 'NoSuchBucketPolicy',
          })
          .mockResolvedValueOnce({
            // GetBucketEncryption
            ServerSideEncryptionConfiguration: {},
          });

        // Act
        const findings = await service.scanAll();

        // Assert
        const publicAccessFinding = findings.find(f => f.title === 'S3 Bucket Has Public Access');
        expect(publicAccessFinding).toBeUndefined();
      });
    });

    describe('SSL Enforcement Detection', () => {
      it('should detect bucket without SSL enforcement', async () => {
        // Arrange
        mockS3Send
          .mockResolvedValueOnce({
            // ListBuckets
            Buckets: [{ Name: 'test-bucket', CreationDate: new Date() }],
          })
          .mockResolvedValueOnce({
            // GetBucketAcl
            Grants: [],
          })
          .mockResolvedValueOnce({
            // GetPublicAccessBlock
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              IgnorePublicAcls: true,
              BlockPublicPolicy: true,
              RestrictPublicBuckets: true,
            },
          })
          .mockRejectedValueOnce({
            // GetBucketPolicy - no policy
            name: 'NoSuchBucketPolicy',
          })
          .mockResolvedValueOnce({
            // GetBucketEncryption
            ServerSideEncryptionConfiguration: {},
          });

        // Act
        const findings = await service.scanAll();

        // Assert
        const sslFinding = findings.find(f => f.title === 'S3 Bucket Does Not Enforce SSL/TLS');
        expect(sslFinding).toBeDefined();
        expect(sslFinding?.severity).toBe('medium');
        expect(sslFinding?.category).toBe('DATA_PROTECTION');
        expect(sslFinding?.compliance).toContain('CIS AWS 1.2.0 - 2.1.2');
      });

      it('should not flag bucket with SSL enforcement policy', async () => {
        // Arrange
        const sslPolicy = JSON.stringify({
          Statement: [
            {
              Effect: 'Deny',
              Principal: '*',
              Action: 's3:*',
              Resource: 'arn:aws:s3:::test-bucket/*',
              Condition: {
                Bool: {
                  'aws:SecureTransport': 'false',
                },
              },
            },
          ],
        });

        mockS3Send
          .mockResolvedValueOnce({
            // ListBuckets
            Buckets: [{ Name: 'test-bucket', CreationDate: new Date() }],
          })
          .mockResolvedValueOnce({
            // GetBucketAcl
            Grants: [],
          })
          .mockResolvedValueOnce({
            // GetPublicAccessBlock
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              IgnorePublicAcls: true,
              BlockPublicPolicy: true,
              RestrictPublicBuckets: true,
            },
          })
          .mockResolvedValueOnce({
            // GetBucketPolicy (for public access check)
            Policy: sslPolicy,
          })
          .mockResolvedValueOnce({
            // GetBucketPolicy (for SSL enforcement check)
            Policy: sslPolicy,
          })
          .mockResolvedValueOnce({
            // GetBucketEncryption
            ServerSideEncryptionConfiguration: {},
          });

        mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
        mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });

        // Act
        const findings = await service.scanAll();

        // Assert
        const sslFinding = findings.find(f => f.title === 'S3 Bucket Does Not Enforce SSL/TLS');
        expect(sslFinding).toBeUndefined();
      });
    });

    describe('Encryption Detection', () => {
      it('should detect bucket without encryption', async () => {
        // Arrange
        const sslPolicy = JSON.stringify({
          Statement: [
            {
              Effect: 'Deny',
              Principal: '*',
              Action: 's3:*',
              Resource: 'arn:aws:s3:::test-bucket/*',
              Condition: { Bool: { 'aws:SecureTransport': 'false' } },
            },
          ],
        });

        mockS3Send
          .mockResolvedValueOnce({
            // ListBuckets
            Buckets: [{ Name: 'test-bucket', CreationDate: new Date() }],
          })
          .mockResolvedValueOnce({
            // GetBucketAcl
            Grants: [],
          })
          .mockResolvedValueOnce({
            // GetPublicAccessBlock
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              IgnorePublicAcls: true,
              BlockPublicPolicy: true,
              RestrictPublicBuckets: true,
            },
          })
          .mockResolvedValueOnce({
            // GetBucketPolicy (for public access check)
            Policy: sslPolicy,
          })
          .mockResolvedValueOnce({
            // GetBucketPolicy (for SSL enforcement check)
            Policy: sslPolicy,
          })
          .mockRejectedValueOnce({
            // GetBucketEncryption - not configured
            name: 'ServerSideEncryptionConfigurationNotFoundError',
          });

        mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
        mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });

        // Act
        const findings = await service.scanAll();

        // Assert
        const encryptionFinding = findings.find(f => f.title === 'S3 Bucket Does Not Have Encryption Enabled');
        expect(encryptionFinding).toBeDefined();
        expect(encryptionFinding?.severity).toBe('medium');
        expect(encryptionFinding?.category).toBe('DATA_PROTECTION');
        expect(encryptionFinding?.compliance).toContain('CIS AWS 1.2.0 - 2.1.1');
      });

      it('should not flag bucket with encryption enabled', async () => {
        // Arrange
        const sslPolicy = JSON.stringify({
          Statement: [
            {
              Effect: 'Deny',
              Principal: '*',
              Action: 's3:*',
              Resource: 'arn:aws:s3:::test-bucket/*',
              Condition: { Bool: { 'aws:SecureTransport': 'false' } },
            },
          ],
        });

        mockS3Send
          .mockResolvedValueOnce({
            // ListBuckets
            Buckets: [{ Name: 'test-bucket', CreationDate: new Date() }],
          })
          .mockResolvedValueOnce({
            // GetBucketAcl
            Grants: [],
          })
          .mockResolvedValueOnce({
            // GetPublicAccessBlock
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              IgnorePublicAcls: true,
              BlockPublicPolicy: true,
              RestrictPublicBuckets: true,
            },
          })
          .mockResolvedValueOnce({
            // GetBucketPolicy
            Policy: sslPolicy,
          })
          .mockResolvedValueOnce({
            // GetBucketEncryption
            ServerSideEncryptionConfiguration: {
              Rules: [
                {
                  ApplyServerSideEncryptionByDefault: {
                    SSEAlgorithm: 'AES256',
                  },
                },
              ],
            },
          });

        // Act
        const findings = await service.scanAll();

        // Assert
        const encryptionFinding = findings.find(f => f.title === 'S3 Bucket Does Not Have Encryption Enabled');
        expect(encryptionFinding).toBeUndefined();
      });
    });

    describe('S3 Error Handling', () => {
      it('should handle AccessDenied errors gracefully', async () => {
        // Arrange
        mockS3Send.mockRejectedValueOnce({
          name: 'AccessDenied',
          message: 'Access Denied',
        });

        // Act
        const findings = await service.scanAll();

        // Assert - Should not throw, returns empty array for S3
        expect(findings).toBeDefined();
      });

      it('should handle empty bucket list', async () => {
        // Arrange
        mockS3Send.mockResolvedValueOnce({
          Buckets: [],
        });

        // Act
        const findings = await service.scanAll();

        // Assert
        expect(findings).toBeDefined();
        const s3Findings = findings.filter(f => f.resourceType === 'S3_BUCKET');
        expect(s3Findings).toHaveLength(0);
      });
    });
  });

  // ============================================================
  // EC2 Security Group Scanning Tests
  // ============================================================

  describe('EC2 Security Group Scanning', () => {
    describe('Unrestricted Access Detection', () => {
      it('should detect security group with unrestricted SSH access', async () => {
        // Arrange
        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });
        mockEC2Send.mockResolvedValue({
          SecurityGroups: [
            {
              GroupId: 'sg-12345',
              GroupName: 'test-sg',
              IpPermissions: [
                {
                  FromPort: 22,
                  ToPort: 22,
                  IpProtocol: 'tcp',
                  IpRanges: [{ CidrIp: '0.0.0.0/0' }],
                },
              ],
            },
          ],
        });

        // Act
        const findings = await service.scanAll();

        // Assert
        const sshFinding = findings.find(f => f.title?.includes('Port 22'));
        expect(sshFinding).toBeDefined();
        expect(sshFinding?.severity).toBe('high');
        expect(sshFinding?.category).toBe('NETWORK');
        expect(sshFinding?.resourceType).toBe('EC2_SECURITY_GROUP');
        expect(sshFinding?.compliance).toContain('CIS AWS 1.2.0 - 5.2');
      });

      it('should detect security group with unrestricted RDP access', async () => {
        // Arrange
        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });
        mockEC2Send.mockResolvedValue({
          SecurityGroups: [
            {
              GroupId: 'sg-67890',
              GroupName: 'rdp-sg',
              IpPermissions: [
                {
                  FromPort: 3389,
                  ToPort: 3389,
                  IpProtocol: 'tcp',
                  IpRanges: [{ CidrIp: '0.0.0.0/0' }],
                },
              ],
            },
          ],
        });

        // Act
        const findings = await service.scanAll();

        // Assert
        const rdpFinding = findings.find(f => f.title?.includes('Port 3389'));
        expect(rdpFinding).toBeDefined();
        expect(rdpFinding?.severity).toBe('high');
        expect(rdpFinding?.metadata?.port).toBe(3389);
      });

      it('should detect security group with unrestricted database port access', async () => {
        // Arrange
        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });
        mockEC2Send.mockResolvedValue({
          SecurityGroups: [
            {
              GroupId: 'sg-database',
              GroupName: 'db-sg',
              IpPermissions: [
                {
                  FromPort: 3306,
                  ToPort: 3306,
                  IpProtocol: 'tcp',
                  IpRanges: [{ CidrIp: '0.0.0.0/0' }],
                },
              ],
            },
          ],
        });

        // Act
        const findings = await service.scanAll();

        // Assert
        const dbFinding = findings.find(f => f.title?.includes('Port 3306'));
        expect(dbFinding).toBeDefined();
        expect(dbFinding?.severity).toBe('high');
      });

      it('should detect unrestricted access on multiple ports', async () => {
        // Arrange
        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });
        mockEC2Send.mockResolvedValue({
          SecurityGroups: [
            {
              GroupId: 'sg-multi',
              GroupName: 'multi-port-sg',
              IpPermissions: [
                {
                  FromPort: 22,
                  ToPort: 22,
                  IpProtocol: 'tcp',
                  IpRanges: [{ CidrIp: '0.0.0.0/0' }],
                },
                {
                  FromPort: 3389,
                  ToPort: 3389,
                  IpProtocol: 'tcp',
                  IpRanges: [{ CidrIp: '0.0.0.0/0' }],
                },
              ],
            },
          ],
        });

        // Act
        const findings = await service.scanAll();

        // Assert
        const sgFindings = findings.filter(f => f.resourceId === 'sg-multi');
        expect(sgFindings.length).toBeGreaterThanOrEqual(2);
      });

      it('should not flag security group with restricted access', async () => {
        // Arrange
        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });
        mockEC2Send.mockResolvedValue({
          SecurityGroups: [
            {
              GroupId: 'sg-secure',
              GroupName: 'secure-sg',
              IpPermissions: [
                {
                  FromPort: 22,
                  ToPort: 22,
                  IpProtocol: 'tcp',
                  IpRanges: [{ CidrIp: '10.0.0.0/16' }], // Restricted to VPC
                },
              ],
            },
          ],
        });

        // Act
        const findings = await service.scanAll();

        // Assert
        const sgFindings = findings.filter(f => f.resourceType === 'EC2_SECURITY_GROUP');
        expect(sgFindings).toHaveLength(0);
      });

      it('should detect unrestricted IPv6 access', async () => {
        // Arrange
        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });
        mockEC2Send.mockResolvedValue({
          SecurityGroups: [
            {
              GroupId: 'sg-ipv6',
              GroupName: 'ipv6-sg',
              IpPermissions: [
                {
                  FromPort: 22,
                  ToPort: 22,
                  IpProtocol: 'tcp',
                  Ipv6Ranges: [{ CidrIpv6: '::/0' }],
                },
              ],
            },
          ],
        });

        // Act
        const findings = await service.scanAll();

        // Assert
        const ipv6Finding = findings.find(f => f.resourceId === 'sg-ipv6');
        expect(ipv6Finding).toBeDefined();
      });
    });

    describe('EC2 Error Handling', () => {
      it('should handle AccessDenied for EC2 gracefully', async () => {
        // Arrange
        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });
        mockEC2Send.mockRejectedValue({
          name: 'UnauthorizedOperation',
          message: 'You are not authorized to perform this operation',
        });

        // Act
        const findings = await service.scanAll();

        // Assert - Should not throw
        expect(findings).toBeDefined();
      });
    });
  });

  // ============================================================
  // IAM Policy Scanning Tests
  // ============================================================

  describe('IAM Policy Scanning', () => {
    describe('Wildcard Permissions Detection', () => {
      it('should detect policy with wildcard permissions', async () => {
        // Arrange
        const wildcardPolicy = {
          Statement: [
            {
              Effect: 'Allow',
              Action: '*',
              Resource: '*',
            },
          ],
        };

        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
        mockIAMSend
          .mockResolvedValueOnce({
            // ListPolicies
            Policies: [
              {
                PolicyName: 'WildcardPolicy',
                Arn: 'arn:aws:iam::123456789012:policy/WildcardPolicy',
                DefaultVersionId: 'v1',
              },
            ],
          })
          .mockResolvedValueOnce({
            // GetPolicyVersion
            PolicyVersion: {
              Document: encodeURIComponent(JSON.stringify(wildcardPolicy)),
            },
          })
          .mockResolvedValueOnce({
            // ListUsers
            Users: [],
          })
          .mockResolvedValueOnce({
            // ListRoles
            Roles: [],
          });

        // Act
        const findings = await service.scanAll();

        // Assert
        const iamFinding = findings.find(f => f.title === 'IAM Policy Contains Wildcard Permissions');
        expect(iamFinding).toBeDefined();
        expect(iamFinding?.severity).toBe('high');
        expect(iamFinding?.category).toBe('IAM');
        expect(iamFinding?.resourceType).toBe('IAM_POLICY');
        expect(iamFinding?.compliance).toContain('CIS AWS 1.2.0 - 1.16');
      });

      it('should not flag policy with specific permissions', async () => {
        // Arrange
        const specificPolicy = {
          Statement: [
            {
              Effect: 'Allow',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::my-bucket/*',
            },
          ],
        };

        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
        mockIAMSend
          .mockResolvedValueOnce({
            // ListPolicies
            Policies: [
              {
                PolicyName: 'SpecificPolicy',
                Arn: 'arn:aws:iam::123456789012:policy/SpecificPolicy',
                DefaultVersionId: 'v1',
              },
            ],
          })
          .mockResolvedValueOnce({
            // GetPolicyVersion
            PolicyVersion: {
              Document: encodeURIComponent(JSON.stringify(specificPolicy)),
            },
          })
          .mockResolvedValueOnce({
            // ListUsers
            Users: [],
          })
          .mockResolvedValueOnce({
            // ListRoles
            Roles: [],
          });

        // Act
        const findings = await service.scanAll();

        // Assert
        const iamFinding = findings.find(f => f.resourceType === 'IAM_POLICY');
        expect(iamFinding).toBeUndefined();
      });

      it('should detect policy with wildcard action but specific resource', async () => {
        // Arrange
        const partialWildcardPolicy = {
          Statement: [
            {
              Effect: 'Allow',
              Action: '*',
              Resource: 'arn:aws:s3:::my-bucket/*',
            },
          ],
        };

        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
        mockIAMSend
          .mockResolvedValueOnce({
            // ListPolicies
            Policies: [
              {
                PolicyName: 'PartialWildcard',
                Arn: 'arn:aws:iam::123456789012:policy/PartialWildcard',
                DefaultVersionId: 'v1',
              },
            ],
          })
          .mockResolvedValueOnce({
            // GetPolicyVersion
            PolicyVersion: {
              Document: encodeURIComponent(JSON.stringify(partialWildcardPolicy)),
            },
          })
          .mockResolvedValueOnce({
            // ListUsers
            Users: [],
          })
          .mockResolvedValueOnce({
            // ListRoles
            Roles: [],
          });

        // Act
        const findings = await service.scanAll();

        // Assert - Should NOT flag (needs both wildcard action AND resource)
        const iamFinding = findings.find(f => f.resourceType === 'IAM_POLICY');
        expect(iamFinding).toBeUndefined();
      });
    });

    describe('AdministratorAccess Detection', () => {
      it('should detect user with AdministratorAccess', async () => {
        // Arrange
        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
        mockIAMSend
          .mockResolvedValueOnce({
            // ListPolicies
            Policies: [],
          })
          .mockResolvedValueOnce({
            // ListUsers
            Users: [
              {
                UserName: 'admin-user',
                Arn: 'arn:aws:iam::123456789012:user/admin-user',
              },
            ],
          })
          .mockResolvedValueOnce({
            // ListAttachedUserPolicies
            AttachedPolicies: [
              {
                PolicyName: 'AdministratorAccess',
                PolicyArn: 'arn:aws:iam::aws:policy/AdministratorAccess',
              },
            ],
          })
          .mockResolvedValueOnce({
            // ListRoles
            Roles: [],
          });

        // Act
        const findings = await service.scanAll();

        // Assert
        const adminFinding = findings.find(f => f.title === 'IAM User Has AdministratorAccess');
        expect(adminFinding).toBeDefined();
        expect(adminFinding?.severity).toBe('high');
        expect(adminFinding?.category).toBe('IAM');
        expect(adminFinding?.resourceType).toBe('IAM_USER');
      });

      it('should detect role with AdministratorAccess', async () => {
        // Arrange
        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
        mockIAMSend
          .mockResolvedValueOnce({
            // ListPolicies
            Policies: [],
          })
          .mockResolvedValueOnce({
            // ListUsers
            Users: [],
          })
          .mockResolvedValueOnce({
            // ListRoles
            Roles: [
              {
                RoleName: 'admin-role',
                Arn: 'arn:aws:iam::123456789012:role/admin-role',
              },
            ],
          })
          .mockResolvedValueOnce({
            // ListAttachedRolePolicies
            AttachedPolicies: [
              {
                PolicyName: 'AdministratorAccess',
                PolicyArn: 'arn:aws:iam::aws:policy/AdministratorAccess',
              },
            ],
          });

        // Act
        const findings = await service.scanAll();

        // Assert
        const adminFinding = findings.find(f => f.title === 'IAM Role Has AdministratorAccess');
        expect(adminFinding).toBeDefined();
        expect(adminFinding?.severity).toBe('high');
        expect(adminFinding?.resourceType).toBe('IAM_ROLE');
      });
    });

    describe('IAM Error Handling', () => {
      it('should handle AccessDenied for IAM gracefully', async () => {
        // Arrange
        mockS3Send.mockResolvedValue({ Buckets: [] });
        mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
        mockIAMSend.mockRejectedValue({
          name: 'AccessDenied',
          message: 'User is not authorized to perform iam:ListPolicies',
        });

        // Act
        const findings = await service.scanAll();

        // Assert - Should not throw
        expect(findings).toBeDefined();
      });
    });
  });

  // ============================================================
  // Retry Logic Tests
  // ============================================================

  describe('Retry Logic', () => {
    it('should retry on ThrottlingException', async () => {
      // Arrange
      mockS3Send
        .mockRejectedValueOnce({
          name: 'ThrottlingException',
          message: 'Rate exceeded',
        })
        .mockResolvedValueOnce({ Buckets: [] });

      mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
      mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });

      // Act
      await service.scanAll();

      // Assert
      expect(mockS3Send).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 status code', async () => {
      // Arrange
      mockS3Send
        .mockRejectedValueOnce({
          name: 'TooManyRequestsException',
          $metadata: { httpStatusCode: 429 },
        })
        .mockResolvedValueOnce({ Buckets: [] });

      mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
      mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });

      // Act
      await service.scanAll();

      // Assert
      expect(mockS3Send).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 Service Unavailable', async () => {
      // Arrange
      mockS3Send
        .mockRejectedValueOnce({
          name: 'ServiceUnavailable',
          $metadata: { httpStatusCode: 503 },
        })
        .mockResolvedValueOnce({ Buckets: [] });

      mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
      mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });

      // Act
      await service.scanAll();

      // Assert
      expect(mockS3Send).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      // Arrange
      mockS3Send.mockRejectedValue({
        name: 'ValidationException',
        message: 'Invalid parameter',
      });

      mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
      mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });

      // Act
      await service.scanAll();

      // Assert - Should only attempt once
      expect(mockS3Send).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Multi-Region Scanning Tests
  // ============================================================

  describe('Multi-Region Scanning', () => {
    it('should scan multiple regions', async () => {
      // Arrange
      mockS3Send.mockResolvedValue({ Buckets: [] });
      mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
      mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });

      // Act
      const findings = await service.scanAllRegions(mockCredentials);

      // Assert
      expect(findings).toBeDefined();
      expect(Array.isArray(findings)).toBe(true);
    });

    it('should continue scanning other regions if one fails', async () => {
      // Arrange
      mockS3Send.mockResolvedValue({ Buckets: [] });
      mockEC2Send
        .mockRejectedValueOnce({
          name: 'NetworkingError',
          message: 'Network error',
        })
        .mockResolvedValue({ SecurityGroups: [] });
      mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });

      // Act
      const findings = await service.scanAllRegions(mockCredentials);

      // Assert - Should not throw, continues with other regions
      expect(findings).toBeDefined();
    });
  });

  // ============================================================
  // Severity Classification Tests
  // ============================================================

  describe('Severity Classification', () => {
    it('should classify public S3 bucket as critical', async () => {
      // Arrange
      mockS3Send
        .mockResolvedValueOnce({
          Buckets: [{ Name: 'public-bucket', CreationDate: new Date() }],
        })
        .mockResolvedValueOnce({
          Grants: [
            {
              Grantee: {
                Type: 'Group',
                URI: 'http://acs.amazonaws.com/groups/global/AllUsers',
              },
              Permission: 'READ',
            },
          ],
        })
        .mockRejectedValueOnce({ name: 'NoSuchPublicAccessBlockConfiguration' })
        .mockRejectedValueOnce({ name: 'NoSuchBucketPolicy' })
        .mockResolvedValueOnce({ ServerSideEncryptionConfiguration: {} });

      mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
      mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });

      // Act
      const findings = await service.scanAll();

      // Assert
      const publicFinding = findings.find(f => f.title === 'S3 Bucket Has Public Access');
      expect(publicFinding?.severity).toBe('critical');
    });

    it('should classify SSH unrestricted access as high', async () => {
      // Arrange
      mockS3Send.mockResolvedValue({ Buckets: [] });
      mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });
      mockEC2Send.mockResolvedValue({
        SecurityGroups: [
          {
            GroupId: 'sg-ssh',
            GroupName: 'ssh-sg',
            IpPermissions: [
              {
                FromPort: 22,
                ToPort: 22,
                IpProtocol: 'tcp',
                IpRanges: [{ CidrIp: '0.0.0.0/0' }],
              },
            ],
          },
        ],
      });

      // Act
      const findings = await service.scanAll();

      // Assert
      const sshFinding = findings.find(f => f.title?.includes('Port 22'));
      expect(sshFinding?.severity).toBe('high');
    });

    it('should classify IAM wildcard policy as high', async () => {
      // Arrange
      const wildcardPolicy = {
        Statement: [{ Effect: 'Allow', Action: '*', Resource: '*' }],
      };

      mockS3Send.mockResolvedValue({ Buckets: [] });
      mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
      mockIAMSend
        .mockResolvedValueOnce({
          Policies: [
            {
              PolicyName: 'WildcardPolicy',
              Arn: 'arn:aws:iam::123456789012:policy/WildcardPolicy',
              DefaultVersionId: 'v1',
            },
          ],
        })
        .mockResolvedValueOnce({
          PolicyVersion: {
            Document: encodeURIComponent(JSON.stringify(wildcardPolicy)),
          },
        })
        .mockResolvedValueOnce({ Users: [] })
        .mockResolvedValueOnce({ Roles: [] });

      // Act
      const findings = await service.scanAll();

      // Assert
      const iamFinding = findings.find(f => f.title === 'IAM Policy Contains Wildcard Permissions');
      expect(iamFinding?.severity).toBe('high');
    });

    it('should classify S3 encryption missing as medium', async () => {
      // Arrange
      const sslPolicy = JSON.stringify({
        Statement: [
          {
            Effect: 'Deny',
            Principal: '*',
            Action: 's3:*',
            Resource: 'arn:aws:s3:::test-bucket/*',
            Condition: { Bool: { 'aws:SecureTransport': 'false' } },
          },
        ],
      });

      mockS3Send
        .mockResolvedValueOnce({
          Buckets: [{ Name: 'test-bucket', CreationDate: new Date() }],
        })
        .mockResolvedValueOnce({ Grants: [] })
        .mockResolvedValueOnce({
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            IgnorePublicAcls: true,
            BlockPublicPolicy: true,
            RestrictPublicBuckets: true,
          },
        })
        .mockResolvedValueOnce({ Policy: sslPolicy }) // For public access check
        .mockResolvedValueOnce({ Policy: sslPolicy }) // For SSL enforcement check
        .mockRejectedValueOnce({ name: 'ServerSideEncryptionConfigurationNotFoundError' });

      mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
      mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });

      // Act
      const findings = await service.scanAll();

      // Assert
      const encryptionFinding = findings.find(f => f.title === 'S3 Bucket Does Not Have Encryption Enabled');
      expect(encryptionFinding?.severity).toBe('medium');
    });
  });

  // ============================================================
  // Finding Normalization Tests
  // ============================================================

  describe('Finding Normalization', () => {
    it('should include all required fields in findings', async () => {
      // Arrange
      mockS3Send
        .mockResolvedValueOnce({
          Buckets: [{ Name: 'test-bucket', CreationDate: new Date() }],
        })
        .mockResolvedValueOnce({
          Grants: [
            {
              Grantee: {
                Type: 'Group',
                URI: 'http://acs.amazonaws.com/groups/global/AllUsers',
              },
              Permission: 'READ',
            },
          ],
        })
        .mockRejectedValueOnce({ name: 'NoSuchPublicAccessBlockConfiguration' })
        .mockRejectedValueOnce({ name: 'NoSuchBucketPolicy' })
        .mockResolvedValueOnce({ ServerSideEncryptionConfiguration: {} });

      mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
      mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });

      // Act
      const findings = await service.scanAll();

      // Assert
      const finding = findings[0];
      expect(finding).toHaveProperty('findingId');
      expect(finding).toHaveProperty('title');
      expect(finding).toHaveProperty('description');
      expect(finding).toHaveProperty('severity');
      expect(finding).toHaveProperty('category');
      expect(finding).toHaveProperty('resourceId');
      expect(finding).toHaveProperty('resourceType');
      expect(finding).toHaveProperty('region');
      expect(finding).toHaveProperty('remediation');
      expect(finding).toHaveProperty('compliance');
      expect(finding).toHaveProperty('metadata');
      expect(finding).toHaveProperty('firstObservedAt');
      expect(finding).toHaveProperty('lastObservedAt');
    });

    it('should include remediation steps in findings', async () => {
      // Arrange
      mockS3Send
        .mockResolvedValueOnce({
          Buckets: [{ Name: 'test-bucket', CreationDate: new Date() }],
        })
        .mockResolvedValueOnce({
          Grants: [
            {
              Grantee: {
                Type: 'Group',
                URI: 'http://acs.amazonaws.com/groups/global/AllUsers',
              },
              Permission: 'READ',
            },
          ],
        })
        .mockRejectedValueOnce({ name: 'NoSuchPublicAccessBlockConfiguration' })
        .mockRejectedValueOnce({ name: 'NoSuchBucketPolicy' })
        .mockResolvedValueOnce({ ServerSideEncryptionConfiguration: {} });

      mockEC2Send.mockResolvedValue({ SecurityGroups: [] });
      mockIAMSend.mockResolvedValue({ Policies: [], Users: [], Roles: [] });

      // Act
      const findings = await service.scanAll();

      // Assert
      const finding = findings[0];
      expect(finding.remediation).toBeDefined();
      expect(finding.remediation!.length).toBeGreaterThan(0);
    });
  });
});
