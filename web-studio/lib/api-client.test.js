import { apiClient } from './api-client';

// Mock fetch for testing
global.fetch = jest.fn();

describe('ApiClient', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('getProviders', () => {
    it('should fetch providers with correct parameters', async () => {
      const mockResponse = {
        providers: [
          { id: '1', slug: 'test', display_name: 'Test Provider', status: 'active' }
        ],
        next_cursor: null
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiClient.getProviders({ status: 'active', limit: 10 });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/providers'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Server error'
          }
        })
      });

      await expect(apiClient.getProviders()).rejects.toThrow('Server error');
    });
  });

  describe('createProvider', () => {
    it('should create a new provider', async () => {
      const mockProvider = {
        provider: {
          id: '1',
          slug: 'new-provider',
          display_name: 'New Provider',
          status: 'active'
        },
        credentialRef: {
          id: 'cred-1',
          secret_key: 'vault/new-provider/prod'
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProvider
      });

      const result = await apiClient.createProvider({
        slug: 'new-provider',
        display_name: 'New Provider',
        secret_key: 'vault/new-provider/prod'
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/providers'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('new-provider')
        })
      );
      expect(result).toEqual(mockProvider);
    });
  });

  describe('getCapabilities', () => {
    it('should fetch capabilities with type and region', async () => {
      const mockResponse = {
        capabilities: [
          {
            id: 'cap-1',
            capability_type: 'text-to-image',
            model_id: 'dall-e-3',
            quality_score: 0.95
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiClient.getCapabilities('text-to-image', 'us-east-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/capabilities'),
        expect.stringContaining('type=text-to-image'),
        expect.stringContaining('region=us-east-1')
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getHealthSummary', () => {
    it('should fetch health summary', async () => {
      const mockResponse = {
        health_summary: [
          {
            id: 'health-1',
            provider_id: 'provider-1',
            status: 'healthy',
            latency_ms: 150,
            availability_7d: 0.99
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiClient.getHealthSummary();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/providers/health-summary')
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
