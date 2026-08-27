import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import {
  LoggerProvider,
  BatchLogRecordProcessor,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ErrorsInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/errors';
import pkg from '../../../package.json';

var SESSION_KEY = 'otel_session_id';

// Component selectors to scan for on page load
var COMPONENT_SELECTORS = {
  'accordion': '.accordion',
  'flashcards': 'table.flashcards',
  'tabs': '.tabs',
  'knowledge-check': '.knowledge-check, .self-test',
  'slider': '.slider',
  'line-matching': '.line-matching',
  'reveal': '.reveal, .active-reveal',
  'checklist': '.checklist',
  'swapper': '.swapper',
};

var _loggerProvider = null;
var _sessionId = null;

function isProduction() {
  return (
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.ltc.bcit.ca')
  );
}

// Per-tab session ID (sessionStorage); falls back to in-memory if storage is blocked
function getSessionId() {
  if (_sessionId) {
    return _sessionId;
  }
  try {
    _sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!_sessionId) {
      _sessionId = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, _sessionId);
    }
  } catch (e) {
    _sessionId = 'no-storage';
  }
  return _sessionId;
}

function getCommonAttributes() {
  return {
    'session.id': getSessionId(),
    'user_agent': navigator.userAgent,
    'screen_resolution': screen.width + 'x' + screen.height,
    'referrer': document.referrer || '',
  };
}

function createLoggerProvider() {
  var resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'sugar-suite',
    [ATTR_SERVICE_VERSION]: pkg.version,
  });

  // Dev prints to console; prod batches to the nginx /v1/logs proxy
  var processors = isProduction()
    ? [new BatchLogRecordProcessor(new OTLPLogExporter({ url: '/v1/logs' }))]
    : [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())];

  return new LoggerProvider({ resource, processors });
}

function logEvent(eventName, attributes) {
  try {
    var logger = logs.getLogger('analytics');
    logger.emit({
      body: eventName,
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      attributes: { 'event.name': eventName, ...attributes },
    });
  } catch (e) {
    if (!isProduction()) {
      console.debug('[otel-analytics] logEvent failed', e);
    }
  }
}

function trackEvent(eventName, attributes) {
  logEvent(eventName, { ...getCommonAttributes(), ...attributes });
}

function init() {
  // Skip if already initialized (lat.js may be included more than once on a page)
  if (window.otelAnalytics) {
    return;
  }

  _loggerProvider = createLoggerProvider();
  logs.setGlobalLoggerProvider(_loggerProvider);

  registerInstrumentations({
    instrumentations: [new ErrorsInstrumentation()],
  });

  logEvent('sugar_suite_loaded', {
    url: window.location.href,
    ...getCommonAttributes(),
  });

  // Emit component_initialized once per component type present on the page
  Object.keys(COMPONENT_SELECTORS).forEach(function (type) {
    var elements = document.querySelectorAll(COMPONENT_SELECTORS[type]);
    if (elements.length > 0) {
      logEvent('component_initialized', {
        'component_type': type,
        'count': String(elements.length),
        ...getCommonAttributes(),
      });
    }
  });

  // Flush pending logs on tab close / navigate away
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && _loggerProvider) {
      _loggerProvider.forceFlush();
    }
  });

  // Expose global API for use in feature modules
  window.otelAnalytics = {
    logEvent: logEvent,
    trackEvent: trackEvent,
  };
}

// Analytics must never break the host page
try {
  init();
} catch (e) {
  if (!isProduction()) {
    console.debug('[otel-analytics] init failed', e);
  }
}
