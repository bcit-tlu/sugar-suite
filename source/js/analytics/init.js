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
import { version } from '../../../package.json';

var SESSION_KEY = 'otel_session_id';

// Public OTel gateway (flux-fleet opentelemetry-collector-public); CORS allows
// *.ltc.bcit.ca and learn.bcit.ca, so CDN-hosted pages inside D2L can export
var LOGS_ENDPOINT = 'https://telemetry.ltc.bcit.ca/v1/logs';

// Stack frames from sugar-suite assets (sugar-suite.*.ltc.bcit.ca, CDN
// /sugar-suite/<sha>/, or a copied lat.js/experimental.js)
var SUGAR_SUITE_FRAME = /sugar-suite|\/(lat|experimental)\.js/i;

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
  var host = window.location.hostname;
  return host.endsWith('.ltc.bcit.ca') || host === 'learn.bcit.ca';
}

function isLocal() {
  var host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

// Browser-wide session ID (localStorage, shared across tabs/reloads); falls
// back to in-memory if storage is blocked. Re-read on every call so tabs that
// raced on first load converge on the last-written value. A missing key
// (first load or cleared storage) always starts a fresh session
function getSessionId() {
  try {
    var stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, stored);
    }
    _sessionId = stored;
  } catch (e) {
    _sessionId = _sessionId || 'no-storage';
  }
  return _sessionId;
}

// Drop query string and fragment; they can carry tokens or other identifiers
function stripUrl(url) {
  return url ? url.split(/[?#]/)[0] : '';
}

function getCommonAttributes() {
  return {
    'session.id': getSessionId(),
    'user_agent': navigator.userAgent,
    'screen_resolution': screen.width + 'x' + screen.height,
    'referrer': stripUrl(document.referrer),
  };
}

// Strip query/fragment from every URL in free text. Developer-written URLs can
// hold raw quotes (?token="x"), so an unquoted query runs to whitespace; a URL
// opened by a quote or < ends at its closer when outer text follows. A trailing
// :line:col stack position and closing/punctuation characters are kept
var URL_WITH_QUERY = /(["'`<]?)(\b[a-z][\w+.-]*:\/\/[^\s?#]*)([?#]\S*)/gi;
var CLOSER_END = /^[\s.,;:!?)\]}>]?$/;
var KEPT_SUFFIX = /((?::\d+){1,2})?([)\]}>"'`]*[.,;:!?]*)$/;

function stripUrlQueries(text) {
  if (typeof text !== 'string') {
    return text;
  }
  return text.replace(URL_WITH_QUERY, function (match, open, base, rest) {
    var close = open === '<' ? '>' : open;
    var end = rest.length;
    if (close && base.indexOf(close) === -1) {
      for (var i = rest.indexOf(close); i !== -1; i = rest.indexOf(close, i + 1)) {
        if (CLOSER_END.test(rest.charAt(i + 1))) {
          end = i;
          break;
        }
      }
    }
    var suffix = rest.slice(0, end).match(KEPT_SUFFIX);
    return open + base + (suffix[1] || '') + suffix[2] + stripUrlQueries(rest.slice(end));
  });
}

// ErrorsInstrumentation listens on window, so drop exceptions raised by the
// host page (D2L) and keep only those with a sugar-suite stack frame
function sugarSuiteErrorsOnly(processor) {
  return {
    onEmit: function (record, context) {
      if (record.eventName === 'exception') {
        var stack = record.attributes['exception.stacktrace'];
        if (typeof stack !== 'string' || !SUGAR_SUITE_FRAME.test(stack)) {
          return;
        }
        // Script URLs and messages can carry tokens; records are mutable during onEmit
        record.setAttribute('exception.stacktrace', stripUrlQueries(stack));
        record.setAttribute('exception.message', stripUrlQueries(record.attributes['exception.message']));
      }
      processor.onEmit(record, context);
    },
    forceFlush: function () {
      return processor.forceFlush();
    },
    shutdown: function () {
      return processor.shutdown();
    },
  };
}

function createLoggerProvider() {
  var resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'sugar-suite',
    [ATTR_SERVICE_VERSION]: version,
  });

  // Dev prints to console; prod batches to the public collector
  var processor = isProduction()
    ? new BatchLogRecordProcessor(new OTLPLogExporter({ url: LOGS_ENDPOINT }))
    : new SimpleLogRecordProcessor(new ConsoleLogRecordExporter());

  return new LoggerProvider({ resource, processors: [sugarSuiteErrorsOnly(processor)] });
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
  // or on hosts that are neither production nor local dev
  if (window.otelAnalytics || !(isProduction() || isLocal())) {
    return;
  }

  _loggerProvider = createLoggerProvider();
  logs.setGlobalLoggerProvider(_loggerProvider);

  registerInstrumentations({
    instrumentations: [new ErrorsInstrumentation()],
  });

  logEvent('sugar_suite_loaded', {
    url: stripUrl(window.location.href),
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
