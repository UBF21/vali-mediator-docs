import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'introduction',
      label: 'Introduction',
    },
    {
      type: 'doc',
      id: 'installation',
      label: 'Installation',
    },
    {
      type: 'doc',
      id: 'quick-start',
      label: 'Quick Start',
    },
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        'core/requests',
        'core/notifications',
        'core/fire-and-forget',
        'core/streaming',
        'core/send-all',
      ],
    },
    {
      type: 'category',
      label: 'Pipeline',
      items: [
        'pipeline/behaviors',
        'pipeline/processors',
        'pipeline/timeout',
        'pipeline/notification-filter',
        'pipeline/dead-letter-queue',
      ],
    },
    {
      type: 'category',
      label: 'Result Pattern',
      items: [
        'result/overview',
        'result/error-types',
        'result/functional-ops',
      ],
    },
    {
      type: 'category',
      label: 'Resilience',
      items: [
        'resilience/overview',
        'resilience/retry',
        'resilience/circuit-breaker',
        'resilience/timeout',
        'resilience/bulkhead',
        'resilience/hedge',
        'resilience/rate-limiter',
        'resilience/chaos',
        'resilience/fallback',
        'resilience/combining',
        'resilience/handler-integration',
      ],
    },
    {
      type: 'category',
      label: 'Caching',
      items: [
        'caching/overview',
        'caching/icacheable',
        'caching/invalidation',
        'caching/custom-store',
      ],
    },
    {
      type: 'category',
      label: 'Observability',
      items: [
        'observability/overview',
        'observability/tracing',
        'observability/metrics',
        'observability/observers',
      ],
    },
    {
      type: 'category',
      label: 'Idempotency',
      items: [
        'idempotency/overview',
        'idempotency/custom-store',
      ],
    },
    {
      type: 'category',
      label: 'ASP.NET Core',
      items: [
        'aspnetcore/overview',
      ],
    },
    {
      type: 'doc',
      id: 'dependency-injection',
      label: 'Dependency Injection',
    },
    {
      type: 'doc',
      id: 'migration',
      label: 'Migration Guide',
    },
  ],
};

export default sidebars;
