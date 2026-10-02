/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://learn.bcit.ca/d2l/le/content/1/viewContent/2/View?ou=1#top"}
 */

/**
 * OTel analytics tests (production host: OTLP export to the public collector)
 */

const { TextEncoder, TextDecoder } = require('util');
const analyticsBundle = require('./helpers/analytics-bundle');

describe('OTel analytics (production)', () => {
  let requests;

  beforeAll(() => {
    window.TextEncoder = window.TextEncoder || TextEncoder;
    requests = [];
    window.fetch = jest.fn((url, options) => {
      requests.push({ url, options });
      return Promise.resolve({ ok: true, status: 200, headers: { get: () => null } });
    });
    document.body.innerHTML = '<div class="accordion"></div>';
    (0, eval)(analyticsBundle());
  });

  test('flushes to the public collector on visibilitychange', async () => {
    window.otelAnalytics.trackEvent('reveal_clicked', {});
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(requests.length).toBeGreaterThan(0);
    const { url, options } = requests[0];
    expect(url).toBe('https://telemetry.ltc.bcit.ca/v1/logs');
    expect(options.method).toBe('POST');
    // Only Content-Type is CORS-allowed by the public collector
    expect(Object.keys(options.headers)).toEqual(['Content-Type']);

    const body = JSON.parse(new TextDecoder().decode(options.body));
    const resource = body.resourceLogs[0].resource.attributes;
    expect(resource).toContainEqual({ key: 'service.name', value: { stringValue: 'sugar-suite' } });

    const logRecords = body.resourceLogs[0].scopeLogs.flatMap((s) => s.logRecords);
    const loaded = logRecords.find((r) => r.body.stringValue === 'sugar_suite_loaded');
    const urlAttr = loaded.attributes.find((a) => a.key === 'url');
    expect(urlAttr.value.stringValue).toBe('https://learn.bcit.ca/d2l/le/content/1/viewContent/2/View');
    expect(logRecords.map((r) => r.body.stringValue)).toEqual(
      expect.arrayContaining(['sugar_suite_loaded', 'component_initialized', 'reveal_clicked'])
    );
  });
});
