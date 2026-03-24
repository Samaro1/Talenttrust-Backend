# TalentTrust Backend

Express API for the TalentTrust decentralized freelancer escrow protocol. Handles contract metadata, reputation, and integration with Stellar/Soroban.

## Features

- **Smart Contract Integration**: Handles contract metadata and lifecycle management
- **Reputation System**: Tracks and manages freelancer reputation
- **Data Retention Controls**: Configurable compliance-ready data retention and archival
- **Audit Logging**: Complete audit trail for compliance verification
- **GDPR/CCPA Ready**: Built-in support for major compliance frameworks

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup

```bash
# Clone and enter the repo
git clone <your-repo-url>
cd talenttrust-backend

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start dev server (with hot reload)
npm run dev

# Start production server
npm start
```

## Scripts

| Script   | Description                    |
|----------|--------------------------------|
| `npm run build` | Compile TypeScript to `dist/`  |
| `npm run start` | Run production server          |
| `npm run dev`   | Run with ts-node-dev           |
| `npm test`      | Run Jest tests                 |
| `npm run lint`  | Run ESLint                     |

## Data Retention Controls

The backend includes configurable **Data Retention Controls** for managing data lifecycle and compliance requirements.

### Overview

Implement GDPR/CCPA-compliant data retention with:
- Configurable retention policies per data type
- Automatic data archival and deletion
- Compliance audit logging
- Data classification and encryption controls
- Support for multiple storage backends

### Quick Start

```typescript
import { DataRetentionManager, RetentionConfig } from './retention';

const config: RetentionConfig = {
  enabled: true,
  storageBasePath: '/data',
  archiveBasePath: '/archive',
  checksIntervalMs: 3600000,
  batchSize: 100,
  automaticArchival: true,
  automaticDeletion: false,
  postArchivalRetentionDays: 30,
  complianceStandard: 'GDPR',
  encryptionEnabled: true,
};

const manager = new DataRetentionManager(config);

// Create retention policy
const policy = manager.createRetentionPolicy({
  name: 'Contract Retention',
  description: 'Retain contracts for 2 years',
  entityType: 'contract',
  period: '2y',
  classification: 'confidential',
  archivalType: 'cold_storage',
  encryptArchive: true,
  allowPermanentRetention: false,
  isActive: true,
});
```

### API Endpoints

**Policies:**
- `POST /api/v1/retention/policies` - Create policy
- `GET /api/v1/retention/policies` - List active policies

**Data Management:**
- `POST /api/v1/retention/data` - Store data
- `GET /api/v1/retention/data/:dataId` - Retrieve data
- `GET /api/v1/retention/status/:dataId` - Get status

**Compliance:**
- `GET /api/v1/retention/audit-logs` - View audit trail
- `GET /api/v1/retention/compliance-report` - Compliance summary

### Documentation

See [docs/DATA_RETENTION.md](docs/DATA_RETENTION.md) for comprehensive documentation including:
- Detailed architecture overview
- Complete API reference
- Usage examples and patterns
- Security considerations and threat analysis
- Compliance framework implementation
- Testing strategy and coverage

## Contributing

1. Fork the repo and create a branch from `main`.
2. Install deps, run tests and build: `npm install && npm test && npm run build`.
3. Open a pull request. CI runs build (and tests when present) on push/PR to `main`.

## CI/CD

GitHub Actions runs on push and pull requests to `main`:

- Install dependencies
- Build the project (`npm run build`)

Keep the build passing before merging.

## License

MIT
