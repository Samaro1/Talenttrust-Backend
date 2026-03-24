import express, { Request, Response } from 'express';
import {
  DataRetentionManager,
  RetentionConfig,
  RetentionPeriod,
  DataEntityType,
  DataClassification,
  ArchivalStorageType,
} from './retention';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize data retention manager with default configuration
const retentionConfig: RetentionConfig = {
  enabled: true,
  storageBasePath: process.env.STORAGE_BASE_PATH || '/data',
  archiveBasePath: process.env.ARCHIVE_BASE_PATH || '/archive',
  checksIntervalMs: parseInt(process.env.RETENTION_CHECK_INTERVAL || '3600000', 10), // 1 hour default
  batchSize: parseInt(process.env.RETENTION_BATCH_SIZE || '100', 10),
  automaticArchival: process.env.AUTO_ARCHIVAL !== 'false',
  automaticDeletion: process.env.AUTO_DELETION === 'true',
  postArchivalRetentionDays: parseInt(process.env.POST_ARCHIVAL_DAYS || '30', 10),
  complianceStandard: process.env.COMPLIANCE_STANDARD || 'GDPR',
  encryptionEnabled: process.env.ENCRYPTION_ENABLED !== 'false',
};

const retentionManager = new DataRetentionManager(retentionConfig);

// Set up default retention policies
const setupDefaultPolicies = () => {
  // Contract retention policy: 2 years
  const contractPolicy = retentionManager.createRetentionPolicy({
    name: 'Contract Retention Policy',
    description: 'Stores contracts for 2 years as per compliance requirements',
    entityType: DataEntityType.CONTRACT,
    period: RetentionPeriod.TWO_YEARS,
    classification: DataClassification.CONFIDENTIAL,
    archivalType: ArchivalStorageType.COLD_STORAGE,
    encryptArchive: true,
    allowPermanentRetention: false,
    isActive: true,
  });

  retentionManager.setDefaultPolicy(DataEntityType.CONTRACT, contractPolicy.id);

  // Transaction retention policy: 1 year
  const transactionPolicy = retentionManager.createRetentionPolicy({
    name: 'Transaction Retention Policy',
    description: 'Stores transactions for 1 year for audit and compliance',
    entityType: DataEntityType.TRANSACTION,
    period: RetentionPeriod.ONE_YEAR,
    classification: DataClassification.INTERNAL,
    archivalType: ArchivalStorageType.COLD_STORAGE,
    encryptArchive: false,
    allowPermanentRetention: false,
    isActive: true,
  });

  retentionManager.setDefaultPolicy(DataEntityType.TRANSACTION, transactionPolicy.id);

  // Audit log retention policy: 2 years
  const auditPolicy = retentionManager.createRetentionPolicy({
    name: 'Audit Log Retention Policy',
    description: 'Retains audit logs for 2 years for compliance verification',
    entityType: DataEntityType.AUDIT_LOG,
    period: RetentionPeriod.TWO_YEARS,
    classification: DataClassification.RESTRICTED,
    archivalType: ArchivalStorageType.ENCRYPTED_ARCHIVE,
    encryptArchive: true,
    allowPermanentRetention: true,
    isActive: true,
  });

  retentionManager.setDefaultPolicy(DataEntityType.AUDIT_LOG, auditPolicy.id);
};

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'talenttrust-backend' });
});

app.get('/api/v1/contracts', (_req: Request, res: Response) => {
  res.json({ contracts: [] });
});

// Data retention management endpoints
app.post('/api/v1/retention/policies', (req: Request, res: Response) => {
  try {
    const policy = retentionManager.createRetentionPolicy(req.body);
    res.status(201).json(policy);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create policy',
    });
  }
});

app.get('/api/v1/retention/policies', (_req: Request, res: Response) => {
  const policies = retentionManager.getActivePolicies();
  res.json(policies);
});

app.post('/api/v1/retention/data', async (req: Request, res: Response) => {
  try {
    const { data, policyId, actor } = req.body;
    const result = await retentionManager.storeData(data, policyId, actor || 'api');
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to store data',
    });
  }
});

app.get('/api/v1/retention/data/:dataId', async (req: Request, res: Response) => {
  try {
    const data = await retentionManager.retrieveData(req.params.dataId);
    if (!data) {
      res.status(404).json({ error: 'Data not found' });
      return;
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve data',
    });
  }
});

app.get('/api/v1/retention/status/:dataId', async (req: Request, res: Response) => {
  try {
    const status = await retentionManager.getRetentionStatus(req.params.dataId);
    if (!status) {
      res.status(404).json({ error: 'Data not found' });
      return;
    }
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get status',
    });
  }
});

app.get('/api/v1/retention/audit-logs', (req: Request, res: Response) => {
  try {
    const logs = retentionManager.getAuditLogs();
    res.json(logs);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve audit logs',
    });
  }
});

app.get('/api/v1/retention/compliance-report', (req: Request, res: Response) => {
  try {
    const report = retentionManager.getComplianceReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate report',
    });
  }
});

app.listen(PORT, () => {
  console.log(`TalentTrust API listening on http://localhost:${PORT}`);

  // Setup default retention policies
  setupDefaultPolicies();

  // Start automated retention processing if enabled
  if (retentionConfig.enabled) {
    retentionManager.startAutomatedProcessing();
    console.log('Data retention management enabled and automated checks started');
  }
});
