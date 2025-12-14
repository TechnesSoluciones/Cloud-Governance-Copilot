/**
 * Mock for @azure/arm-costmanagement
 *
 * Mocks the Azure Cost Management client for testing
 */

export class CostManagementClient {
  public usageDetails: any;
  public query: any;

  constructor(credential: any, subscriptionId: string) {
    this.usageDetails = {
      list: jest.fn(),
    };

    this.query = {
      usage: jest.fn(),
    };
  }
}

export const QueryOperator = {
  In: 'In',
};

export const QueryGranularity = {
  Daily: 'Daily',
  Monthly: 'Monthly',
};

export const QueryTimeframeType = {
  Custom: 'Custom',
};

export const QueryDefinitionType = {
  Usage: 'Usage',
};
