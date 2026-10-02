/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.com/"}
 */

/**
 * OTel analytics tests (unknown host: analytics stays disabled)
 */

const analyticsBundle = require('./helpers/analytics-bundle');

test('does not initialize on hosts that are neither production nor local', () => {
  const dir = jest.spyOn(console, 'dir').mockImplementation(() => {});
  (0, eval)(analyticsBundle());
  expect(window.otelAnalytics).toBeUndefined();
  expect(dir).not.toHaveBeenCalled();
});
