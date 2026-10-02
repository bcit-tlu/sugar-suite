/**
 * OTel analytics tests (local dev host: console exporter)
 */

const analyticsBundle = require('./helpers/analytics-bundle');

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

const sourceError = (src) => {
  const error = new Error('boom');
  error.stack = 'Error: boom\n    at f (' + src + ':1:1)';
  return error;
};

describe('OTel analytics (local dev)', () => {
  let records;

  beforeAll(async () => {
    document.body.innerHTML = '<div class="accordion"></div><div class="tabs"></div><div class="tabs"></div>';
    window.history.replaceState(null, '', '/page.html?token=secret#frag');
    records = [];
    jest.spyOn(console, 'dir').mockImplementation((record) => records.push(record));
    (0, eval)(analyticsBundle());
    await flush();
  });

  beforeEach(() => {
    records.length = 0;
  });

  test('exposes the global API', () => {
    expect(typeof window.otelAnalytics.trackEvent).toBe('function');
    expect(typeof window.otelAnalytics.logEvent).toBe('function');
  });

  test('ignores a second initialization', () => {
    const api = window.otelAnalytics;
    (0, eval)(analyticsBundle());
    expect(window.otelAnalytics).toBe(api);
  });

  test('trackEvent emits an analytics record with common attributes', async () => {
    window.otelAnalytics.trackEvent('tab_switch', { tab_index: '1' });
    await flush();

    expect(records).toHaveLength(1);
    const [record] = records;
    expect(record.body).toBe('tab_switch');
    expect(record.resource.attributes['service.name']).toBe('sugar-suite');
    expect(record.attributes).toMatchObject({
      'event.name': 'tab_switch',
      tab_index: '1',
      'session.id': localStorage.getItem('otel_session_id'),
    });
  });

  test('adopts a session ID written by a concurrently loaded tab', async () => {
    const ownId = localStorage.getItem('otel_session_id');
    // Simulates tab B overwriting tab A's ID after both read an empty store
    localStorage.setItem('otel_session_id', 'other-tab-id');
    window.otelAnalytics.trackEvent('tab_switch');
    await flush();

    expect(ownId).toBeTruthy();
    expect(ownId).not.toBe('other-tab-id');
    expect(records[0].attributes['session.id']).toBe('other-tab-id');
  });

  test('keeps exceptions with a sugar-suite stack frame', async () => {
    window.dispatchEvent(new ErrorEvent('error', {
      error: sourceError('https://cdn.example/sugar-suite/abc1234/js/lat.js'),
    }));
    window.dispatchEvent(new ErrorEvent('error', {
      error: sourceError('https://learn.bcit.ca/shared/LAT/js/lat.js'),
    }));
    await flush();

    expect(records.map((r) => r.eventName)).toEqual(['exception', 'exception']);
  });

  test('strips URL query strings and fragments from exception stack and message', async () => {
    const error = new Error('load failed https://cdn.example/x.json?sig=s3cret#a');
    error.stack = [
      'Error: load failed https://cdn.example/x.json?sig=s3cret#a',
      '    at f (https://cdn.example/sugar-suite/abc/js/lat.js?token=t0k:1:2)',
      '    at https://cdn.example/sugar-suite/abc/js/lat.js?t=a:5#frag:3:4',
      'g@https://cdn.example/sugar-suite/abc/js/lat.js?token=t0k:7:8',
    ].join('\n');
    window.dispatchEvent(new ErrorEvent('error', { error }));
    await flush();

    expect(records).toHaveLength(1);
    const attrs = records[0].attributes;
    expect(attrs['exception.stacktrace']).toBe([
      'Error: load failed https://cdn.example/x.json',
      '    at f (https://cdn.example/sugar-suite/abc/js/lat.js:1:2)',
      '    at https://cdn.example/sugar-suite/abc/js/lat.js:3:4',
      'g@https://cdn.example/sugar-suite/abc/js/lat.js:7:8',
    ].join('\n'));
    expect(attrs['exception.message']).toBe('load failed https://cdn.example/x.json');
  });

  test('drops exceptions raised by the host page', async () => {
    window.dispatchEvent(new ErrorEvent('error', {
      error: sourceError('https://learn.bcit.ca/d2l/lp/navbars/main.js'),
    }));
    window.dispatchEvent(new ErrorEvent('error', { error: 'string error' }));
    await flush();

    expect(records).toHaveLength(0);
  });
});
