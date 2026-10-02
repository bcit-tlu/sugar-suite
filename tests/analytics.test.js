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

  test('starts a new session when storage is cleared', async () => {
    window.otelAnalytics.trackEvent('tab_switch');
    const oldId = localStorage.getItem('otel_session_id');
    localStorage.clear();
    window.otelAnalytics.trackEvent('tab_switch');
    await flush();

    const newId = records[1].attributes['session.id'];
    expect(records[0].attributes['session.id']).toBe(oldId);
    expect(newId).toBeTruthy();
    expect(newId).not.toBe(oldId);
    expect(localStorage.getItem('otel_session_id')).toBe(newId);
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
      'Error: load failed https://cdn.example/x.json?REDACTED',
      '    at f (https://cdn.example/sugar-suite/abc/js/lat.js?REDACTED:1:2)',
      '    at https://cdn.example/sugar-suite/abc/js/lat.js?REDACTED:3:4',
      'g@https://cdn.example/sugar-suite/abc/js/lat.js?REDACTED:7:8',
    ].join('\n'));
    expect(attrs['exception.message']).toBe('load failed https://cdn.example/x.json?REDACTED');
  });

  test('redacts queries from quoted URLs and URLs containing parentheses', async () => {
    const message = [
      'Failed to load "https://x.example/a.json?sig=s1".',
      '{"u":"https://x.example/a?t=s2","v":2}',
      "['https://x.example/a?t=s3','https://y.example/b?k=s4']",
      '<https://x.example/a?t=s5>',
      'see https://x.example/a)b?t=s6',
      'Failed (https://x.example/a?t=s8).',
      'bad https://x.example/a?t=s9, retrying',
      'ids https://x.example/a?ids=1,2&sig=s10 end',
      'paren https://x.example/a?t=a).s11 end',
      'raw https://x.example/a?token="s12" end',
      "single 'https://x.example/a?token=\"s13\"' end",
      'double "https://x.example/a?token="s14"" end',
      'ambiguous "https://x.example/a?t="s15",s16" end',
      'digits https://x.example/a?t=s17:12 end',
      'pair (https://x.example/a?t=s18:12:34)',
      'frag https://x.example/a#s21 end',
      'empty https://x.example/a? end',
    ].join(' ');
    const error = new Error(message);
    error.stack = 'Error: ' + message +
      '\n    at f (https://cdn.example/sugar-suite/abc/js/lat.js?t=a)s7:1:2)' +
      '\n    at async h (https://cdn.example/sugar-suite/abc/js/lat.js?t=s20:12:34:5:6)' +
      '\ng@https://cdn.example/sugar-suite/abc/js/lat.js?t=s19:12:7:8';
    window.dispatchEvent(new ErrorEvent('error', { error }));
    await flush();

    const expected = [
      'Failed to load "https://x.example/a.json?REDACTED".',
      '{"u":"https://x.example/a?REDACTED}',
      "['https://x.example/a?REDACTED']",
      '<https://x.example/a?REDACTED>',
      'see https://x.example/a)b?REDACTED',
      'Failed (https://x.example/a?REDACTED).',
      'bad https://x.example/a?REDACTED, retrying',
      'ids https://x.example/a?REDACTED end',
      'paren https://x.example/a?REDACTED end',
      'raw https://x.example/a?REDACTED" end',
      "single 'https://x.example/a?REDACTED\"' end",
      'double "https://x.example/a?REDACTED"" end',
      'ambiguous "https://x.example/a?REDACTED" end',
      'digits https://x.example/a?REDACTED end',
      'pair (https://x.example/a?REDACTED)',
      'frag https://x.example/a#REDACTED end',
      'empty https://x.example/a? end',
    ].join(' ');
    const attrs = records[0].attributes;
    expect(attrs['exception.message']).toBe(expected);
    expect(attrs['exception.stacktrace']).toBe('Error: ' + expected +
      '\n    at f (https://cdn.example/sugar-suite/abc/js/lat.js?REDACTED:1:2)' +
      '\n    at async h (https://cdn.example/sugar-suite/abc/js/lat.js?REDACTED:5:6)' +
      '\ng@https://cdn.example/sugar-suite/abc/js/lat.js?REDACTED:7:8');
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
