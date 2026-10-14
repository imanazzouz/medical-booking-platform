import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "./src/lib/observability/sentry-scrubber";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.DEPLOYMENT_ENV ?? "unknown",
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, databaseQueryData: false },
  tracesSampleRate: 0,
  maxBreadcrumbs: 0,
  beforeSend: scrubSentryEvent,
  beforeSendTransaction: () => null,
});
