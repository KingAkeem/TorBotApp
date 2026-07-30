const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildExportPayload,
  normalizeCrawlRequest,
  normalizeExportRequest,
  normalizeTargetURL,
  normalizeTorStatusRequest,
} = require('../src/ipcValidation');

function validCrawl(overrides = {}) {
  return {
    url: 'https://example.com/path#section',
    depth: 2,
    useTor: true,
    socks5Host: '127.0.0.1',
    socks5Port: 9050,
    authorizedUseConfirmed: true,
    ...overrides,
  };
}

test('normalizeCrawlRequest returns a bounded GoTor request and audit intent', () => {
  const normalized = normalizeCrawlRequest(validCrawl());
  assert.equal(normalized.intent.target, 'https://example.com/path');
  assert.equal(normalized.intent.domain, 'example.com');
  assert.equal(normalized.intent.routingMode, 'tor');
  assert.equal(normalized.intent.authorizedUseConfirmed, true);
  assert.equal(normalized.request.depth, 2);
  assert.equal(normalized.request.requestsPerSecond, 5);
  assert.equal(normalized.request.perHostParallel, 2);
  assert.equal('authorizedUseConfirmed' in normalized.request, false);
});

test('normalizeCrawlRequest rejects malformed IPC payloads', () => {
  assert.throws(() => normalizeCrawlRequest(null), /crawl request is required/i);
  assert.throws(() => normalizeCrawlRequest([]), /crawl request is required/i);
  assert.throws(
    () => normalizeCrawlRequest(validCrawl({ unexpected: true })),
    /Unsupported request field/,
  );
  assert.throws(() => normalizeCrawlRequest(validCrawl({ depth: '2' })), /Depth must/);
  assert.throws(() => normalizeCrawlRequest(validCrawl({ useTor: 'yes' })), /routing mode/);
  assert.throws(
    () => normalizeCrawlRequest(validCrawl({ authorizedUseConfirmed: false })),
    /authorized/,
  );
  assert.throws(
    () => normalizeCrawlRequest(validCrawl({ socks5Host: '127.0.0.1/path' })),
    /SOCKS5 host/,
  );
});

test('target validation rejects unsafe schemes, credentials, and non-public hosts', () => {
  const unsafeTargets = [
    'file:///etc/passwd',
    'https://user:password@example.com',
    'http://localhost:8080',
    'http://service.internal',
    'http://127.0.0.1',
    'http://10.20.30.40',
    'http://169.254.169.254/latest/meta-data',
    'http://192.168.1.2',
    'http://[::1]',
    'http://[fc00::1]',
    'http://[::ffff:127.0.0.1]',
  ];
  for (const target of unsafeTargets) {
    assert.throws(() => normalizeTargetURL(target), undefined, target);
  }
  assert.equal(normalizeTargetURL('http://example.onion').hostname, 'example.onion');
  assert.equal(normalizeTargetURL('https://93.184.216.34').hostname, '93.184.216.34');
});

test('Tor status and export IPC requests require exact validated fields', () => {
  assert.deepEqual(
    normalizeTorStatusRequest({ host: '127.0.0.1', port: 9050 }),
    { host: '127.0.0.1', port: 9050 },
  );
  assert.throws(
    () => normalizeTorStatusRequest({ host: '127.0.0.1', port: 0 }),
    /between 1 and 65535/,
  );
  assert.throws(
    () => normalizeTorStatusRequest({ host: '127.0.0.1', port: 9050, command: 'x' }),
    /Unsupported request field/,
  );

  const auditId = '7ea2e490-5f0d-4c98-8e83-3d350e0a14f7';
  assert.throws(
    () => normalizeExportRequest({
      auditId,
      includeEmails: true,
      includePhoneNumbers: false,
      sensitiveDataReviewed: false,
    }),
    /Review and confirm/,
  );
  assert.deepEqual(
    normalizeExportRequest({
      auditId,
      includeEmails: false,
      includePhoneNumbers: false,
      sensitiveDataReviewed: false,
    }),
    {
      auditId,
      includeEmails: false,
      includePhoneNumbers: false,
      sensitiveDataReviewed: false,
    },
  );
});

test('buildExportPayload excludes sensitive fields unless they were reviewed', () => {
  const auditId = '7ea2e490-5f0d-4c98-8e83-3d350e0a14f7';
  const report = {
    pages: [{
      metadata: {
        url: 'https://example.com/',
        title: 'Example',
        emails: ['owner@example.com'],
        phoneNumbers: ['+1-202-555-0100'],
      },
    }],
  };
  const redacted = JSON.parse(JSON.stringify(buildExportPayload(report, {
    auditId,
    includeEmails: false,
    includePhoneNumbers: false,
    sensitiveDataReviewed: false,
  }, '2026-07-30T12:00:00.000Z')));
  assert.equal('emails' in redacted.report.pages[0].metadata, false);
  assert.equal('phoneNumbers' in redacted.report.pages[0].metadata, false);
  assert.equal(redacted.report.pages[0].metadata.title, 'Example');

  const reviewed = buildExportPayload(report, {
    auditId,
    includeEmails: true,
    includePhoneNumbers: false,
    sensitiveDataReviewed: true,
  }, '2026-07-30T12:00:00.000Z');
  assert.deepEqual(reviewed.report.pages[0].metadata.emails, ['owner@example.com']);
  assert.equal(reviewed.report.pages[0].metadata.phoneNumbers, undefined);
});
