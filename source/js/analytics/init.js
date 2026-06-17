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

var { version } = pkg;

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

function getSessionId() {
  var id = localStorage.getItem('otel_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('otel_session_id', id);
  }
  return id;
}

function isProduction() {
  return (
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.ltc.bcit.ca')
  );
}

var _loggerProvider = null;

function init() {
  var prod = isProduction();

  var resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'sugar-suite',
    [ATTR_SERVICE_VERSION]: version,
  });

  var logExporter = prod
    ? new OTLPLogExporter({ url: '/v1/logs' })
    : new ConsoleLogRecordExporter();

  var processor = prod
    ? new BatchLogRecordProcessor(logExporter)
    : new SimpleLogRecordProcessor(logExporter);

  _loggerProvider = new LoggerProvider({
    resource,
    processors: [processor],
  });

  logs.setGlobalLoggerProvider(_loggerProvider);

  registerInstrumentations({
    instrumentations: [new ErrorsInstrumentation()],
  });

  var sessionId = getSessionId();
  var commonAttributes = {
    'user_agent': navigator.userAgent,
    'screen_resolution': screen.width + 'x' + screen.height,
    'referrer': document.referrer || '',
    'session.id': sessionId,
  };

  // Emit sugar_suite_loaded
  logEvent('sugar_suite_loaded', {
    url: window.location.href,
    ...commonAttributes,
  });

  // Scan for components and emit component_initialized per type
  Object.keys(COMPONENT_SELECTORS).forEach(function (type) {
    var selector = COMPONENT_SELECTORS[type];
    var elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      logEvent('component_initialized', {
        'component_type': type,
        'count': String(elements.length),
        ...commonAttributes,
      });
    }
  });

  // Flush pending logs on tab close / navigate away
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      if (_loggerProvider) {
        _loggerProvider.forceFlush();
      }
    }
  });
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
  var sessionId = getSessionId();
  logEvent(eventName, {
    'session.id': sessionId,
    'user_agent': navigator.userAgent,
    'screen_resolution': screen.width + 'x' + screen.height,
    'referrer': document.referrer || '',
    ...attributes,
  });
}

// Auto-init on load
init();

// Expose global API for use in feature modules
window.otelAnalytics = {
  logEvent: logEvent,
  trackEvent: trackEvent,
};
