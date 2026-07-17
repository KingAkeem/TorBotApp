const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { GotorBackend, requestJSON } = require('../src/gotorBackend');

function listen(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

function send(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
}

test('requestJSON surfaces API errors', async () => {
  const fixture = await listen((_request, response) => {
    send(response, 400, { error: 'bad crawl input' });
  });
  try {
    await assert.rejects(
      requestJSON('GET', `${fixture.url}/failure`),
      /bad crawl input/,
    );
  } finally {
    fixture.server.close();
  }
});

test('GotorBackend runs a job through an external API', async () => {
  let reads = 0;
  const fixture = await listen((request, response) => {
    if (request.url === '/_readyz' || request.url === '/_healthz') {
      send(response, 200, { status: 'ok', engine: 'gotor' });
      return;
    }
    if (request.url === '/api/v1/tor/status?host=127.0.0.1&port=9050') {
      send(response, 200, {
        configured: true,
        reachable: true,
        host: '127.0.0.1',
        port: 9050,
        configPath: '/etc/tor/torrc',
        socksPorts: ['9050'],
        controlPorts: ['9051'],
        searchedPaths: ['/etc/tor/torrc'],
      });
      return;
    }
    if (request.method === 'POST' && request.url === '/api/v1/jobs') {
      send(response, 202, { id: 'job-1', status: 'queued' });
      return;
    }
    if (request.method === 'GET' && request.url === '/api/v1/jobs/job-1') {
      reads += 1;
      send(response, 200, reads > 1
        ? {
            id: 'job-1',
            status: 'completed',
            report: { pages: [], errors: [] },
          }
        : { id: 'job-1', status: 'running' });
      return;
    }
    send(response, 404, { error: 'not found' });
  });

  const backend = new GotorBackend({ apiURL: fixture.url });
  try {
    const status = await backend.status();
    assert.equal(status.available, true);
    const torStatus = await backend.torStatus('127.0.0.1', 9050);
    assert.equal(torStatus.reachable, true);
    assert.equal(torStatus.configPath, '/etc/tor/torrc');
    const job = await backend.runCrawl({
      url: 'https://example.com',
      depth: 0,
      useTor: false,
    });
    assert.equal(job.status, 'completed');
    assert.ok(reads >= 2);
  } finally {
    backend.stop();
    fixture.server.close();
  }
});
