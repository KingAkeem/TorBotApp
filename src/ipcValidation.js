const net = require('net');

const CRAWL_KEYS = new Set([
  'url',
  'depth',
  'useTor',
  'socks5Host',
  'socks5Port',
  'authorizedUseConfirmed',
]);
const TOR_STATUS_KEYS = new Set(['host', 'port']);
const EXPORT_KEYS = new Set([
  'auditId',
  'includeEmails',
  'includePhoneNumbers',
  'sensitiveDataReviewed',
]);

function assertRecord(input, message) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(message);
  }
}

function assertOnlyKeys(input, allowed) {
  const unknown = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new Error(`Unsupported request field: ${unknown[0]}.`);
  }
}

function normalizeHost(value, label) {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a hostname or IP address.`);
  }
  const host = value.trim();
  if (
    !host ||
    host.length > 255 ||
    /\s|[/@?#]/.test(host) ||
    (!net.isIP(host) && !/^[a-z0-9.-]+$/i.test(host))
  ) {
    throw new Error(`${label} must be a hostname or IP address.`);
  }
  return host;
}

function isDisallowedIPv4(host) {
  const [a, b] = host.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isDisallowedIPv6(host) {
  const normalized = host.toLowerCase();
  if (normalized === '::' || normalized === '::1') return true;
  if (/^f[cd]/.test(normalized) || /^fe[89ab]/.test(normalized)) return true;
  return normalized.startsWith('::ffff:');
}

function isDisallowedTargetHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }
  const version = net.isIP(host);
  return version === 4
    ? isDisallowedIPv4(host)
    : version === 6 && isDisallowedIPv6(host);
}

function normalizeTargetURL(value) {
  if (typeof value !== 'string' || value.length > 2048) {
    throw new Error('Enter a valid absolute URL.');
  }
  let parsedURL;
  try {
    parsedURL = new URL(value);
  } catch {
    throw new Error('Enter a valid absolute URL.');
  }
  if (!['http:', 'https:'].includes(parsedURL.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs can be crawled.');
  }
  if (parsedURL.username || parsedURL.password) {
    throw new Error('Target URLs must not contain credentials.');
  }
  if (isDisallowedTargetHost(parsedURL.hostname)) {
    throw new Error('Local, private, and infrastructure target addresses are not allowed.');
  }
  parsedURL.hash = '';
  return parsedURL;
}

function normalizeCrawlRequest(input) {
  assertRecord(input, 'A crawl request is required.');
  assertOnlyKeys(input, CRAWL_KEYS);

  const parsedURL = normalizeTargetURL(input.url);
  if (!Number.isInteger(input.depth) || input.depth < 0 || input.depth > 10) {
    throw new Error('Depth must be a whole number between 0 and 10.');
  }
  if (typeof input.useTor !== 'boolean') {
    throw new Error('Crawl routing mode must be explicitly selected.');
  }
  if (input.authorizedUseConfirmed !== true) {
    throw new Error('Confirm that you are authorized to crawl this target.');
  }

  const socks5Host = normalizeHost(input.socks5Host, 'SOCKS5 host');
  if (!Number.isInteger(input.socks5Port) || input.socks5Port < 1 || input.socks5Port > 65535) {
    throw new Error('SOCKS5 port must be between 1 and 65535.');
  }

  return {
    intent: {
      target: parsedURL.toString(),
      domain: parsedURL.hostname,
      routingMode: input.useTor ? 'tor' : 'direct',
      authorizedUseConfirmed: true,
    },
    request: {
      url: parsedURL.toString(),
      depth: input.depth,
      useTor: input.useTor,
      socks5Host,
      socks5Port: input.socks5Port,
      workers: 12,
      queueSize: 2048,
      requestsPerSecond: 5,
      burst: 5,
      perHostParallel: 2,
      perHostDelayMs: 100,
      maxResponseBytes: 5 * 1024 * 1024,
      allowNonHtml: false,
      randomizeHeaders: true,
    },
  };
}

function normalizeTorStatusRequest(input = {}) {
  assertRecord(input, 'A Tor status request is required.');
  assertOnlyKeys(input, TOR_STATUS_KEYS);
  const host = normalizeHost(input.host ?? '127.0.0.1', 'Tor SOCKS5 host');
  const port = input.port ?? 9050;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Tor SOCKS5 port must be between 1 and 65535.');
  }
  return { host, port };
}

function normalizeExportRequest(input) {
  assertRecord(input, 'An export request is required.');
  assertOnlyKeys(input, EXPORT_KEYS);
  if (typeof input.auditId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.auditId)) {
    throw new Error('The export does not match a completed crawl.');
  }
  if (typeof input.includeEmails !== 'boolean' || typeof input.includePhoneNumbers !== 'boolean') {
    throw new Error('Select which sensitive data should be included.');
  }
  if ((input.includeEmails || input.includePhoneNumbers) && input.sensitiveDataReviewed !== true) {
    throw new Error('Review and confirm sensitive data before exporting it.');
  }
  return {
    auditId: input.auditId,
    includeEmails: input.includeEmails,
    includePhoneNumbers: input.includePhoneNumbers,
    sensitiveDataReviewed: input.sensitiveDataReviewed === true,
  };
}

function buildExportPayload(report, options, exportedAt = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    exportedAt,
    sourceAuditId: options.auditId,
    sensitiveData: {
      reviewed: options.sensitiveDataReviewed,
      emailsIncluded: options.includeEmails,
      phoneNumbersIncluded: options.includePhoneNumbers,
    },
    report: {
      ...report,
      pages: (report.pages || []).map((page) => ({
        ...page,
        metadata: {
          ...page.metadata,
          emails: options.includeEmails ? page.metadata?.emails : undefined,
          phoneNumbers: options.includePhoneNumbers ? page.metadata?.phoneNumbers : undefined,
        },
      })),
    },
  };
}

module.exports = {
  buildExportPayload,
  isDisallowedTargetHost,
  normalizeCrawlRequest,
  normalizeExportRequest,
  normalizeTargetURL,
  normalizeTorStatusRequest,
};
