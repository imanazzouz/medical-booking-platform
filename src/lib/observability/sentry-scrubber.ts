import type { Event } from "@sentry/nextjs";

const safeErrorTypes = new Set([
  "Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "EvalError", "URIError", "AggregateError", "DOMException",
]);

function safeErrorType(value: string | undefined): string {
  return value && safeErrorTypes.has(value) ? value : "CustomError";
}

function safeSourcePath(value: string | undefined): string | undefined {
  return value?.split(/[?#]/, 1)[0]?.slice(0, 512);
}

/** Keep useful error locations while removing request data, local variables, and source context. */
export function scrubSentryEvent<E extends Event>(event: E): E {
  const exceptions = event.exception?.values?.map((exception) => ({
    type: safeErrorType(exception.type),
    value: "[redacted]",
    mechanism: exception.mechanism ? {
      type: exception.mechanism.type,
      handled: exception.mechanism.handled,
      synthetic: exception.mechanism.synthetic,
    } : undefined,
    stacktrace: exception.stacktrace ? {
      frames: exception.stacktrace.frames?.map((frame) => ({
        filename: safeSourcePath(frame.filename),
        abs_path: safeSourcePath(frame.abs_path),
        function: frame.function?.slice(0, 128),
        module: frame.module?.slice(0, 128),
        lineno: frame.lineno,
        colno: frame.colno,
        in_app: frame.in_app,
        platform: frame.platform,
      })),
    } : undefined,
  }));

  return {
    event_id: event.event_id,
    type: event.type,
    timestamp: event.timestamp,
    level: event.level,
    platform: event.platform,
    release: event.release,
    environment: event.environment,
    logger: event.logger,
    exception: exceptions ? { values: exceptions } : undefined,
    // Deliberately omit request URLs/query/body, user identity, tags, contexts, extras, and breadcrumbs.
    message: undefined,
    logentry: undefined,
    request: undefined,
    user: undefined,
    tags: undefined,
    contexts: undefined,
    extra: undefined,
    breadcrumbs: [],
  } as unknown as E;
}
