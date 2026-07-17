const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const readline = require('readline');

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

function requestJSON(method, rawURL, body) {
  return new Promise((resolve, reject) => {
    const target = new URL(rawURL);
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const request = http.request(
      {
        method,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        headers: payload
          ? {
              'content-type': 'application/json',
              'content-length': payload.length,
            }
          : undefined,
        timeout: 10_000,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let value = {};
          try {
            value = text ? JSON.parse(text) : {};
          } catch {
            reject(new Error(`GoTor returned an invalid JSON response (${response.statusCode}).`));
            return;
          }
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(value.error || `GoTor request failed (${response.statusCode}).`));
            return;
          }
          resolve(value);
        });
      },
    );
    request.on('timeout', () => request.destroy(new Error('GoTor API request timed out.')));
    request.on('error', reject);
    if (payload) {
      request.write(payload);
    }
    request.end();
  });
}

function executableName() {
  return process.platform === 'win32' ? 'gotor.exe' : 'gotor';
}

class GotorBackend {
  constructor(options = {}) {
    this.appRoot = options.appRoot || path.resolve(__dirname, '..');
    this.resourcesPath = options.resourcesPath;
    this.externalURL = options.apiURL || process.env.GOTOR_API_URL || '';
    this.apiURL = this.externalURL;
    this.child = null;
    this.startPromise = null;
    this.activeJobID = null;
    this.lastError = '';
    this.source = this.externalURL ? `External API · ${this.externalURL}` : '';
    this.stopping = false;
  }

  resolveCommand() {
    const name = executableName();
    const candidates = [
      process.env.GOTOR_BIN,
      this.resourcesPath && path.join(this.resourcesPath, name),
      path.resolve(this.appRoot, '..', 'gotor', 'bin', name),
    ].filter(Boolean);
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return {
          command: candidate,
          args: [],
          cwd: path.dirname(candidate),
          source: candidate,
        };
      }
    }

    const sourceDirectory = path.resolve(this.appRoot, '..', 'gotor');
    if (fs.existsSync(path.join(sourceDirectory, 'go.mod'))) {
      const pathEntries = (process.env.PATH || '').split(path.delimiter);
      const goName = process.platform === 'win32' ? 'go.exe' : 'go';
      const hasGo = pathEntries.some((entry) => fs.existsSync(path.join(entry, goName)));
      if (hasGo) {
        return {
          command: 'go',
          args: ['run', './cmd/main'],
          cwd: sourceDirectory,
          source: `${sourceDirectory} (go run)`,
        };
      }
    }

    throw new Error(
      'GoTor is not available. Build the sibling repository with `npm run setup:gotor` or set GOTOR_BIN.',
    );
  }

  async ensureStarted() {
    if (this.apiURL) {
      await requestJSON('GET', `${this.apiURL}/_readyz`);
      return;
    }
    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = new Promise((resolve, reject) => {
      let settled = false;
      const command = this.resolveCommand();
      this.source = command.source;
      this.stopping = false;
      this.child = spawn(
        command.command,
        [
          ...command.args,
          '-s',
          '-server-host',
          '127.0.0.1',
          '-server-port',
          '0',
          '-log-format',
          'json',
          '-log-level',
          'info',
        ],
        {
          cwd: command.cwd,
          env: { ...process.env },
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        },
      );

      const timeout = setTimeout(() => {
        finish(new Error('Timed out while starting the GoTor API.'));
      }, 30_000);
      const errors = [];

      const finish = (error, url) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        if (error) {
          this.lastError = error.message;
          this.startPromise = null;
          reject(error);
          return;
        }
        this.apiURL = url;
        this.lastError = '';
        resolve();
      };

      readline.createInterface({ input: this.child.stdout }).on('line', (line) => {
        try {
          const event = JSON.parse(line);
          if (event.event === 'ready' && event.url) {
            finish(null, event.url);
          }
        } catch {
          // Only the ready event is part of the stdout protocol.
        }
      });
      readline.createInterface({ input: this.child.stderr }).on('line', (line) => {
        errors.push(line);
        if (errors.length > 20) {
          errors.shift();
        }
      });
      this.child.once('error', finish);
      this.child.once('exit', (code, signal) => {
        const wasStopping = this.stopping;
        this.child = null;
        this.apiURL = this.externalURL;
        this.startPromise = null;
        if (!settled) {
          const detail = errors.at(-1) || `exit code ${code}, signal ${signal}`;
          finish(new Error(`GoTor exited before it was ready: ${detail}`));
        } else if (!wasStopping && code !== 0) {
          this.lastError = errors.at(-1) || `GoTor exited with code ${code}.`;
        }
      });
    });

    return this.startPromise;
  }

  async status() {
    try {
      await this.ensureStarted();
      const health = await requestJSON('GET', `${this.apiURL}/_healthz`);
      return {
        available: true,
        engine: health.engine || 'gotor',
        status: health.status || 'ok',
        source: this.source,
      };
    } catch (error) {
      return {
        available: false,
        engine: 'gotor',
        status: 'unavailable',
        source: this.source,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async runCrawl(crawlRequest) {
    if (this.activeJobID) {
      throw new Error('A crawl is already running.');
    }
    await this.ensureStarted();
    const started = await requestJSON('POST', `${this.apiURL}/api/v1/jobs`, crawlRequest);
    this.activeJobID = started.id;

    try {
      while (true) {
        const job = await requestJSON(
          'GET',
          `${this.apiURL}/api/v1/jobs/${encodeURIComponent(started.id)}`,
        );
        if (TERMINAL_STATUSES.has(job.status)) {
          return job;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } finally {
      this.activeJobID = null;
    }
  }

  async torStatus(host = '127.0.0.1', port = 9050) {
    await this.ensureStarted();
    const query = new URLSearchParams({
      host: String(host),
      port: String(port),
    });
    return requestJSON('GET', `${this.apiURL}/api/v1/tor/status?${query}`);
  }

  async cancelActive() {
    if (!this.activeJobID || !this.apiURL) {
      return null;
    }
    return requestJSON(
      'POST',
      `${this.apiURL}/api/v1/jobs/${encodeURIComponent(this.activeJobID)}/cancel`,
    );
  }

  stop() {
    this.stopping = true;
    if (this.child && !this.child.killed) {
      this.child.kill('SIGTERM');
    }
    this.child = null;
    this.apiURL = this.externalURL;
    this.startPromise = null;
    this.activeJobID = null;
  }
}

module.exports = { GotorBackend, requestJSON };
