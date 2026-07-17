import React, { FormEvent, useEffect, useMemo, useState } from 'react';

type BackendStatus = {
  available: boolean;
  engine: string;
  status: string;
  source?: string;
  error?: string;
};

type TorStatus = {
  configured: boolean;
  reachable: boolean;
  host: string;
  port: number;
  configPath?: string;
  socksPorts: string[];
  controlPorts: string[];
  dataDirectory?: string;
  torBinary?: string;
  portMatches?: boolean;
  searchedPaths: string[];
  checkedAt: string;
};

type PageMetadata = {
  url: string;
  canonical?: string;
  title?: string;
  description?: string;
  h1?: string;
  status: number;
  contentType?: string;
  contentLength?: number;
  lang?: string;
  robots?: string[];
  emails?: string[];
  phoneNumbers?: string[];
  primaryImage?: string;
};

type PageResult = {
  parentUrl?: string;
  depth: number;
  links?: string[];
  skippedReason?: string;
  metadata: PageMetadata;
};

type CrawlError = {
  url: string;
  parentUrl?: string;
  depth: number;
  message: string;
};

type CrawlReport = {
  schemaVersion: number;
  engine: string;
  target: string;
  maxDepth: number;
  usesTor: boolean;
  startedAt: string;
  durationMs: number;
  pages: PageResult[] | null;
  errors: CrawlError[] | null;
};

type CrawlJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  report?: CrawlReport;
  error?: string;
};

type Tab = 'overview' | 'pages' | 'intelligence' | 'tree';

const formatBytes = (value?: number) => {
  if (!value || value < 0) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (durationMs: number) => {
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
};

const pageLabel = (page: PageResult) =>
  page.metadata.title?.trim() || new URL(page.metadata.url).hostname;

function StatusBadge({ status }: { status: number }) {
  const tone = status >= 200 && status < 300
    ? 'success'
    : status >= 300 && status < 400
      ? 'warning'
      : 'danger';
  return <span className={`status-badge ${tone}`}>{status || 'ERR'}</span>;
}

function ExternalLink({ url, children }: { url: string; children?: React.ReactNode }) {
  return (
    <button
      className="external-link"
      type="button"
      title={url}
      onClick={() => window.torbot.openExternal(url)}
    >
      {children || url}
    </button>
  );
}

function TreeNode({
  page,
  childrenByParent,
  seen,
}: {
  page: PageResult;
  childrenByParent: Map<string, PageResult[]>;
  seen: Set<string>;
}) {
  if (seen.has(page.metadata.url)) return null;
  const nextSeen = new Set(seen);
  nextSeen.add(page.metadata.url);
  const children = childrenByParent.get(page.metadata.url) || [];

  return (
    <li className="tree-node">
      <div className="tree-node-row">
        <span className="tree-branch" />
        <span className="tree-depth">{page.depth}</span>
        <div className="tree-copy">
          <ExternalLink url={page.metadata.url}>{pageLabel(page)}</ExternalLink>
          <span>{page.metadata.url}</span>
        </div>
        <StatusBadge status={page.metadata.status} />
      </div>
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <TreeNode
              key={child.metadata.url}
              page={child}
              childrenByParent={childrenByParent}
              seen={nextSeen}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function App() {
  const [url, setURL] = useState('');
  const [depth, setDepth] = useState(1);
  const [useTor, setUseTor] = useState(true);
  const [socks5Host, setSOCKS5Host] = useState('127.0.0.1');
  const [socks5Port, setSOCKS5Port] = useState(9050);
  const [backend, setBackend] = useState<BackendStatus | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(true);
  const [torStatus, setTorStatus] = useState<TorStatus | null>(null);
  const [checkingTor, setCheckingTor] = useState(false);
  const [torError, setTorError] = useState('');
  const [running, setRunning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [report, setReport] = useState<CrawlReport | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const checkTor = async (host = socks5Host, port = socks5Port) => {
    setCheckingTor(true);
    setTorError('');
    try {
      const result = await window.torbot.getTorStatus({ host, port });
      setTorStatus(result);
    } catch (statusError) {
      setTorStatus(null);
      setTorError(statusError instanceof Error ? statusError.message : String(statusError));
    } finally {
      setCheckingTor(false);
    }
  };

  const checkBackend = async () => {
    setCheckingBackend(true);
    const result = await window.torbot.getBackendStatus();
    setBackend(result);
    setCheckingBackend(false);
    if (result.available) {
      await checkTor();
    }
  };

  useEffect(() => {
    void checkBackend();
  }, []);

  const pages = report?.pages || [];
  const errors = report?.errors || [];
  const emails = useMemo(
    () => Array.from(new Set(pages.flatMap((page) => page.metadata.emails || []))).sort(),
    [pages],
  );
  const phoneNumbers = useMemo(
    () => Array.from(new Set(pages.flatMap((page) => page.metadata.phoneNumbers || []))).sort(),
    [pages],
  );
  const discoveredURLs = useMemo(
    () => new Set(pages.flatMap((page) => page.links || [])).size,
    [pages],
  );
  const successfulPages = pages.filter(
    (page) => page.metadata.status >= 200 && page.metadata.status < 400,
  ).length;
  const skippedPages = pages.filter((page) => page.skippedReason).length;

  const childrenByParent = useMemo(() => {
    const result = new Map<string, PageResult[]>();
    for (const page of pages) {
      if (!page.parentUrl) continue;
      const children = result.get(page.parentUrl) || [];
      children.push(page);
      result.set(page.parentUrl, children);
    }
    return result;
  }, [pages]);
  const roots = pages.filter(
    (page) => !page.parentUrl || !pages.some((candidate) => candidate.metadata.url === page.parentUrl),
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Use an HTTP or HTTPS URL.');
      }
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'Enter a valid URL.');
      return;
    }

    setRunning(true);
    setReport(null);
    setActiveTab('overview');
    try {
      const job = await window.torbot.startCrawl({
        url,
        depth,
        useTor,
        socks5Host,
        socks5Port,
      }) as CrawlJob;
      if (job.status === 'completed' && job.report) {
        setReport(job.report);
        setNotice(`Crawl completed with ${job.report.pages?.length || 0} fetched pages.`);
      } else if (job.status === 'cancelled') {
        if (job.report) setReport(job.report);
        setNotice('Crawl cancelled. Partial results are shown when available.');
      } else {
        setError(job.error || `Crawl ended with status “${job.status}”.`);
      }
    } catch (crawlError) {
      setError(crawlError instanceof Error ? crawlError.message : String(crawlError));
      void checkBackend();
    } finally {
      setRunning(false);
      setCancelling(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      await window.torbot.cancelCrawl();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : String(cancelError));
      setCancelling(false);
    }
  };

  const rootPage = pages[0];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <strong>TB</strong>
          </div>
          <div>
            <p>OSINT CRAWLER</p>
            <h1>TorBot</h1>
          </div>
        </div>
        <div className={`backend-pill ${backend?.available ? 'online' : 'offline'}`}>
          <span className="pulse-dot" />
          <div>
            <strong>
              {checkingBackend
                ? 'Connecting to GoTor'
                : backend?.available
                  ? 'GoTor ready'
                  : 'GoTor unavailable'}
            </strong>
            <small>{backend?.source || 'Local crawl service'}</small>
          </div>
        </div>
      </header>

      <main className="workspace">
        <aside className="control-panel">
          <div className="section-kicker">NEW INVESTIGATION</div>
          <h2>Map a target</h2>
          <p className="panel-intro">
            Crawl link relationships and surface contact intelligence through Tor or a direct
            connection.
          </p>

          <section className={`tor-config-card ${torStatus?.reachable ? 'ready' : 'not-ready'}`}>
            <div className="tor-config-heading">
              <div>
                <span className="tor-icon" aria-hidden="true">◉</span>
                <div>
                  <strong>Tor configuration</strong>
                  <small>Local proxy and torrc diagnostic</small>
                </div>
              </div>
              <span className="tor-state">
                {checkingTor
                  ? 'CHECKING'
                  : torStatus?.reachable
                    ? 'READY'
                    : 'NOT READY'}
              </span>
            </div>

            <dl className="tor-config-grid">
              <div>
                <dt>SOCKS endpoint</dt>
                <dd>
                  <code>{socks5Host}:{socks5Port}</code>
                  <span className={torStatus?.reachable ? 'value-good' : 'value-bad'}>
                    {torStatus?.reachable ? 'Reachable' : 'Unreachable'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Configuration</dt>
                <dd>
                  <code title={torStatus?.configPath || torStatus?.searchedPaths.join('\n')}>
                    {torStatus?.configPath || 'No torrc found'}
                  </code>
                  <span className={torStatus?.configured ? 'value-good' : 'value-warn'}>
                    {torStatus?.configured ? 'Configured' : 'Not detected'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Configured ports</dt>
                <dd>
                  <code>{torStatus?.socksPorts.length ? torStatus.socksPorts.join(', ') : '—'}</code>
                  {torStatus?.portMatches === false && (
                    <span className="value-bad">Port mismatch</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Control port</dt>
                <dd><code>{torStatus?.controlPorts.length ? torStatus.controlPorts.join(', ') : '—'}</code></dd>
              </div>
              <div>
                <dt>Data directory</dt>
                <dd><code title={torStatus?.dataDirectory}>{torStatus?.dataDirectory || '—'}</code></dd>
              </div>
              <div>
                <dt>Tor executable</dt>
                <dd><code title={torStatus?.torBinary}>{torStatus?.torBinary || 'Not on PATH'}</code></dd>
              </div>
            </dl>

            {torError && <p className="tor-diagnostic-error">{torError}</p>}
            <button
              className="check-tor-button"
              type="button"
              onClick={() => checkTor()}
              disabled={checkingTor || !backend?.available}
            >
              {checkingTor ? <span className="spinner" /> : <span aria-hidden="true">↻</span>}
              Check Tor again
            </button>
          </section>

          <form onSubmit={submit}>
            <label className="field">
              <span>Target URL</span>
              <input
                type="url"
                value={url}
                onChange={(event) => setURL(event.target.value)}
                placeholder="http://example.onion"
                autoComplete="off"
                required
                disabled={running}
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Crawl depth</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={depth}
                  onChange={(event) => setDepth(Number(event.target.value))}
                  disabled={running}
                />
              </label>
              <div className="depth-note">
                <strong>{depth === 0 ? 'Root only' : `${depth} link ${depth === 1 ? 'level' : 'levels'}`}</strong>
                <span>Max 10</span>
              </div>
            </div>

            <label className="toggle-card">
              <div>
                <span>Route through Tor</span>
                <small>SOCKS5 proxy protects the crawler’s origin</small>
              </div>
              <input
                type="checkbox"
                checked={useTor}
                onChange={(event) => setUseTor(event.target.checked)}
                disabled={running}
              />
              <span className="toggle-track" aria-hidden="true">
                <span />
              </span>
            </label>

            <details className="advanced-settings" open={useTor}>
              <summary>Connection settings</summary>
              <div className="field-row proxy-fields">
                <label className="field">
                  <span>SOCKS5 host</span>
                  <input
                  value={socks5Host}
                    onChange={(event) => {
                      setSOCKS5Host(event.target.value);
                      setTorStatus(null);
                    }}
                    disabled={running || !useTor}
                  />
                </label>
                <label className="field port-field">
                  <span>Port</span>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={socks5Port}
                    onChange={(event) => {
                      setSOCKS5Port(Number(event.target.value));
                      setTorStatus(null);
                    }}
                    disabled={running || !useTor}
                  />
                </label>
              </div>
            </details>

            {!running ? (
              <button
                className="primary-action"
                type="submit"
                disabled={
                  !backend?.available ||
                  checkingBackend ||
                  (useTor && (!torStatus?.reachable || checkingTor))
                }
              >
                <span>Run crawl</span>
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button
                className="cancel-action"
                type="button"
                onClick={cancel}
                disabled={cancelling}
              >
                <span className="spinner" />
                {cancelling ? 'Stopping crawl…' : 'Cancel crawl'}
              </button>
            )}
          </form>

          {!checkingBackend && !backend?.available && (
            <div className="backend-error">
              <strong>Backend setup required</strong>
              <p>{backend?.error}</p>
              <button type="button" onClick={checkBackend}>Retry connection</button>
            </div>
          )}

          <div className="scope-note">
            <span>!</span>
            Only crawl systems you own or are authorized to assess.
          </div>
        </aside>

        <section className="results-panel">
          {(error || notice) && (
            <div className={`message-banner ${error ? 'error' : 'notice'}`}>
              <span>{error ? '!' : '✓'}</span>
              <p>{error || notice}</p>
              <button type="button" onClick={() => { setError(''); setNotice(''); }}>×</button>
            </div>
          )}

          {running && (
            <div className="running-state">
              <div className="radar" aria-hidden="true">
                <span />
                <span />
                <i />
              </div>
              <div className="section-kicker">CRAWL IN PROGRESS</div>
              <h2>Following the signal</h2>
              <p>
                GoTor is fetching pages, respecting per-host limits, and extracting link and
                contact intelligence.
              </p>
              <div className="running-meta">
                <span>{useTor ? 'TOR ROUTED' : 'DIRECT'}</span>
                <span>DEPTH {depth}</span>
                <span>5 RPS LIMIT</span>
              </div>
            </div>
          )}

          {!running && !report && (
            <div className="empty-state">
              <div className="empty-grid" aria-hidden="true">
                <span className="node root-node" />
                <span className="node node-a" />
                <span className="node node-b" />
                <span className="node node-c" />
                <i className="line line-a" />
                <i className="line line-b" />
                <i className="line line-c" />
              </div>
              <div className="section-kicker">READY FOR INPUT</div>
              <h2>Turn a URL into a map</h2>
              <p>
                Results will organize every fetched page, relationship, email, phone number,
                response status, and crawl error in one workspace.
              </p>
              <div className="capability-row">
                <span>Link graph</span>
                <span>Contact intel</span>
                <span>Live status</span>
              </div>
            </div>
          )}

          {!running && report && (
            <div className="report">
              <div className="report-heading">
                <div>
                  <div className="section-kicker">CRAWL REPORT</div>
                  <h2>{rootPage ? pageLabel(rootPage) : new URL(report.target).hostname}</h2>
                  <ExternalLink url={report.target}>{report.target}</ExternalLink>
                </div>
                <div className="report-meta">
                  <span>{report.usesTor ? 'TOR' : 'DIRECT'}</span>
                  <strong>{formatDuration(report.durationMs)}</strong>
                </div>
              </div>

              <div className="summary-grid">
                <div className="metric-card">
                  <span>Fetched pages</span>
                  <strong>{pages.length}</strong>
                  <small>{successfulPages} reachable</small>
                </div>
                <div className="metric-card">
                  <span>Discovered URLs</span>
                  <strong>{discoveredURLs}</strong>
                  <small>Across depth {report.maxDepth}</small>
                </div>
                <div className="metric-card">
                  <span>Contacts</span>
                  <strong>{emails.length + phoneNumbers.length}</strong>
                  <small>{emails.length} email · {phoneNumbers.length} phone</small>
                </div>
                <div className="metric-card">
                  <span>Exceptions</span>
                  <strong>{errors.length + skippedPages}</strong>
                  <small>{errors.length} failed · {skippedPages} skipped</small>
                </div>
              </div>

              <nav className="tabs" aria-label="Report sections">
                {([
                  ['overview', 'Overview'],
                  ['pages', `Pages ${pages.length}`],
                  ['intelligence', `Intelligence ${emails.length + phoneNumbers.length}`],
                  ['tree', 'Relationship tree'],
                ] as [Tab, string][]).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? 'active' : ''}
                    onClick={() => setActiveTab(tab)}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <div className="tab-content">
                {activeTab === 'overview' && (
                  <div className="overview-grid">
                    <article className="detail-card">
                      <div className="card-heading">
                        <span>ROOT PROFILE</span>
                        {rootPage && <StatusBadge status={rootPage.metadata.status} />}
                      </div>
                      {rootPage ? (
                        <dl>
                          <div><dt>Title</dt><dd>{rootPage.metadata.title || '—'}</dd></div>
                          <div><dt>Content type</dt><dd>{rootPage.metadata.contentType || '—'}</dd></div>
                          <div><dt>Response size</dt><dd>{formatBytes(rootPage.metadata.contentLength)}</dd></div>
                          <div><dt>Language</dt><dd>{rootPage.metadata.lang || '—'}</dd></div>
                          <div><dt>Description</dt><dd>{rootPage.metadata.description || '—'}</dd></div>
                        </dl>
                      ) : (
                        <p className="muted">The root page could not be fetched.</p>
                      )}
                    </article>
                    <article className="detail-card">
                      <div className="card-heading">
                        <span>CRAWL HEALTH</span>
                        <span className={errors.length ? 'health-warn' : 'health-ok'}>
                          {errors.length ? 'ATTENTION' : 'CLEAN'}
                        </span>
                      </div>
                      <div className="health-list">
                        <div><span>Successful responses</span><strong>{successfulPages}</strong></div>
                        <div><span>Skipped content</span><strong>{skippedPages}</strong></div>
                        <div><span>Fetch failures</span><strong>{errors.length}</strong></div>
                      </div>
                      {errors.length > 0 && (
                        <div className="error-list">
                          {errors.slice(0, 4).map((crawlError) => (
                            <div key={`${crawlError.url}-${crawlError.message}`}>
                              <strong>{crawlError.url}</strong>
                              <span>{crawlError.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  </div>
                )}

                {activeTab === 'pages' && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Page</th>
                          <th>Depth</th>
                          <th>Size</th>
                          <th>Contacts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pages.map((page) => (
                          <tr key={page.metadata.url}>
                            <td><StatusBadge status={page.metadata.status} /></td>
                            <td>
                              <ExternalLink url={page.metadata.url}>{pageLabel(page)}</ExternalLink>
                              <small>{page.metadata.url}</small>
                              {page.skippedReason && <em>{page.skippedReason}</em>}
                            </td>
                            <td><span className="depth-chip">D{page.depth}</span></td>
                            <td>{formatBytes(page.metadata.contentLength)}</td>
                            <td>{(page.metadata.emails?.length || 0) + (page.metadata.phoneNumbers?.length || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'intelligence' && (
                  <div className="intel-grid">
                    <article className="detail-card">
                      <div className="card-heading"><span>EMAIL ADDRESSES</span><strong>{emails.length}</strong></div>
                      <div className="intel-list">
                        {emails.length
                          ? emails.map((email) => <code key={email}>{email}</code>)
                          : <p className="muted">No email addresses found.</p>}
                      </div>
                    </article>
                    <article className="detail-card">
                      <div className="card-heading"><span>PHONE NUMBERS</span><strong>{phoneNumbers.length}</strong></div>
                      <div className="intel-list">
                        {phoneNumbers.length
                          ? phoneNumbers.map((phone) => <code key={phone}>{phone}</code>)
                          : <p className="muted">No phone numbers found.</p>}
                      </div>
                    </article>
                  </div>
                )}

                {activeTab === 'tree' && (
                  <div className="tree-view">
                    {roots.length > 0 ? (
                      <ul className="tree-root">
                        {roots.map((page) => (
                          <TreeNode
                            key={page.metadata.url}
                            page={page}
                            childrenByParent={childrenByParent}
                            seen={new Set()}
                          />
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No relationship data was returned.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
