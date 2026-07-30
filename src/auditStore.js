const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function pageOutcome(page) {
  return {
    url: page.metadata?.url,
    parentUrl: page.parentUrl || null,
    depth: page.depth,
    status: page.metadata?.status,
    contentType: page.metadata?.contentType || null,
    contentLength: page.metadata?.contentLength ?? null,
    skippedReason: page.skippedReason || null,
  };
}

function extractedDataProvenance(pages) {
  const emails = [];
  const phoneNumbers = [];
  const metadata = [];
  for (const page of pages) {
    const sourceUrl = page.metadata?.url;
    for (const value of page.metadata?.emails || []) {
      emails.push({ value, sourceUrl, field: 'metadata.emails' });
    }
    for (const value of page.metadata?.phoneNumbers || []) {
      phoneNumbers.push({ value, sourceUrl, field: 'metadata.phoneNumbers' });
    }
    metadata.push({
      sourceUrl,
      values: {
        canonical: page.metadata?.canonical || null,
        title: page.metadata?.title || null,
        description: page.metadata?.description || null,
        h1: page.metadata?.h1 || null,
        lang: page.metadata?.lang || null,
        robots: page.metadata?.robots || [],
        primaryImage: page.metadata?.primaryImage || null,
      },
    });
  }
  return { emails, phoneNumbers, metadata };
}

function buildAuditArtifact({ auditId, startedAt, completedAt, intent, configuration, backend, job }) {
  const report = job.report || {};
  const pages = report.pages || [];
  return {
    schemaVersion: 1,
    auditId,
    startedAt,
    completedAt,
    intent,
    configuration,
    backend: {
      engine: backend.engine || 'gotor',
      version: backend.version || null,
      source: backend.source || null,
      statusAtStart: backend.status || 'unknown',
    },
    outcome: {
      jobId: job.id || null,
      status: job.status,
      cancelled: job.status === 'cancelled',
      error: job.error || null,
      durationMs: report.durationMs ?? null,
      pages: pages.map(pageOutcome),
      failures: report.errors || [],
    },
    extractedData: extractedDataProvenance(pages),
  };
}

class RunAuditStore {
  constructor(directory) {
    this.directory = directory;
    this.latestPath = null;
  }

  createId() {
    return crypto.randomUUID();
  }

  write(artifact) {
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const timestamp = artifact.startedAt.replace(/[:.]/g, '-');
    const artifactPath = path.join(this.directory, `${timestamp}-${artifact.auditId}.json`);
    const descriptor = fs.openSync(artifactPath, 'wx', 0o600);
    try {
      fs.writeFileSync(descriptor, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    if (process.platform !== 'win32') {
      fs.chmodSync(artifactPath, 0o400);
    }
    this.latestPath = artifactPath;
    return artifactPath;
  }

  getLatestPath() {
    return this.latestPath;
  }
}

async function runCrawlWithAudit({ backend, auditStore, normalized }) {
  const auditId = auditStore.createId();
  const startedAt = new Date().toISOString();
  const backendStatus = await backend.status();
  let job;
  try {
    job = await backend.runCrawl(normalized.request);
  } catch (error) {
    job = {
      id: null,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const completedAt = new Date().toISOString();
  const artifact = buildAuditArtifact({
    auditId,
    startedAt,
    completedAt,
    intent: normalized.intent,
    configuration: normalized.request,
    backend: backendStatus,
    job,
  });
  const artifactPath = auditStore.write(artifact);
  return {
    ...job,
    audit: { id: auditId, artifactPath, createdAt: completedAt },
  };
}

module.exports = {
  RunAuditStore,
  buildAuditArtifact,
  runCrawlWithAudit,
};
