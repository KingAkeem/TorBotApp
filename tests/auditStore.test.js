const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  RunAuditStore,
  buildAuditArtifact,
  runCrawlWithAudit,
} = require('../src/auditStore');

function completedJob(status = 'completed') {
  return {
    id: 'job-1',
    status,
    report: {
      durationMs: 25,
      pages: [{
        depth: 0,
        links: [],
        metadata: {
          url: 'https://example.com/',
          status: 200,
          title: 'Example',
          description: 'Fixture page',
          emails: ['owner@example.com'],
          phoneNumbers: ['+1-202-555-0100'],
        },
      }],
      errors: [{
        url: 'https://example.com/missing',
        depth: 1,
        message: 'not found',
      }],
    },
  };
}

function auditInput(job = completedJob()) {
  return {
    auditId: 'f1f11bd8-fb48-4377-a836-df1bb240cb81',
    startedAt: '2026-07-30T12:00:00.000Z',
    completedAt: '2026-07-30T12:00:01.000Z',
    intent: {
      target: 'https://example.com/',
      domain: 'example.com',
      routingMode: 'direct',
      authorizedUseConfirmed: true,
    },
    configuration: { url: 'https://example.com/', depth: 1, useTor: false },
    backend: { engine: 'gotor', version: null, source: '/opt/gotor', status: 'ok' },
    job,
  };
}

test('buildAuditArtifact records outcomes and extracted-data provenance', () => {
  const artifact = buildAuditArtifact(auditInput());
  assert.equal(artifact.outcome.status, 'completed');
  assert.equal(artifact.outcome.cancelled, false);
  assert.equal(artifact.outcome.pages[0].status, 200);
  assert.equal(artifact.outcome.failures[0].message, 'not found');
  assert.deepEqual(artifact.extractedData.emails[0], {
    value: 'owner@example.com',
    sourceUrl: 'https://example.com/',
    field: 'metadata.emails',
  });
  assert.equal(artifact.extractedData.phoneNumbers[0].sourceUrl, 'https://example.com/');
  assert.equal(artifact.extractedData.metadata[0].values.title, 'Example');
});

test('RunAuditStore writes each artifact once', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'torbot-audit-'));
  try {
    const store = new RunAuditStore(directory);
    const artifact = buildAuditArtifact(auditInput(completedJob('cancelled')));
    const artifactPath = store.write(artifact);
    assert.equal(store.getLatestPath(), artifactPath);
    assert.equal(JSON.parse(fs.readFileSync(artifactPath, 'utf8')).outcome.cancelled, true);
    assert.throws(() => store.write(artifact), /EEXIST/);
    if (process.platform !== 'win32') {
      assert.equal(fs.statSync(artifactPath).mode & 0o777, 0o400);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('runCrawlWithAudit returns a receipt for failed runs', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'torbot-audit-'));
  const backend = {
    status: async () => ({
      available: true,
      engine: 'gotor',
      version: null,
      source: 'fixture API',
      status: 'ok',
    }),
    runCrawl: async () => {
      throw new Error('fixture failure');
    },
  };
  try {
    const result = await runCrawlWithAudit({
      backend,
      auditStore: new RunAuditStore(directory),
      normalized: {
        intent: auditInput().intent,
        request: auditInput().configuration,
      },
    });
    assert.equal(result.status, 'failed');
    assert.equal(result.error, 'fixture failure');
    assert.equal(fs.existsSync(result.audit.artifactPath), true);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
