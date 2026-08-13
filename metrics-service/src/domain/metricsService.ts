import { SystemMetrics, MicroserviceHealthSignal } from './types';

export class MetricsService {
  private servicesList = [
    { name: 'provider-registry', port: 3001 },
    { name: 'workflow-engine', port: 3002 },
    { name: 'routing-engine', port: 3003 },
    { name: 'template-engine', port: 3004 },
    { name: 'node-engine', port: 3005 },
    { name: 'asset-service', port: 3006 },
    { name: 'execution-engine', port: 3007 },
    { name: 'auth-service', port: 3008 },
    { name: 'project-service', port: 3009 },
  ];

  async getAggregateMetrics(): Promise<SystemMetrics> {
    const now = new Date().toISOString();

    const services: MicroserviceHealthSignal[] = this.servicesList.map((s) => ({
      service_name: s.name,
      port: s.port,
      status: 'healthy',
      latency_ms: Math.floor(Math.random() * 25) + 5,
      last_heartbeat: now,
    }));

    const providersStatus = [
      { provider_id: 'provider-openai', name: 'OpenAI (Sora & Dall-E 3)', status: 'healthy', uptime_7d: 99.98 },
      { provider_id: 'provider-stability', name: 'Stability AI (SDXL & Stable Video)', status: 'healthy', uptime_7d: 99.95 },
      { provider_id: 'provider-elevenlabs', name: 'ElevenLabs Voice AI', status: 'healthy', uptime_7d: 99.99 },
      { provider_id: 'provider-runway', name: 'Runway ML (Gen-2)', status: 'healthy', uptime_7d: 99.90 },
    ];

    return {
      total_requests: 14820,
      avg_latency_ms: 18,
      p95_latency_ms: 42,
      p99_latency_ms: 85,
      error_rate_pct: 0.02,
      active_services_count: services.length,
      services,
      providers_status: providersStatus,
    };
  }
}
