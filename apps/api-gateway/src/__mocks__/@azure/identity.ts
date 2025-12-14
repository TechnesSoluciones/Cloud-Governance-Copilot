/**
 * Mock for @azure/identity
 *
 * Mocks Azure authentication for testing
 */

export class ClientSecretCredential {
  private tenantId: string;
  private clientId: string;
  private clientSecret: string;

  constructor(tenantId: string, clientId: string, clientSecret: string) {
    this.tenantId = tenantId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async getToken(scopes: string | string[]): Promise<any> {
    return {
      token: 'mock-access-token',
      expiresOnTimestamp: Date.now() + 3600000,
    };
  }
}

export class DefaultAzureCredential {
  async getToken(scopes: string | string[]): Promise<any> {
    return {
      token: 'mock-access-token',
      expiresOnTimestamp: Date.now() + 3600000,
    };
  }
}
