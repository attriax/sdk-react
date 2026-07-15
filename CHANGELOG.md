# Changelog

## 0.6.0

- Align the React wrapper release with `@attriax/js` 0.6.0.
- Inherit the new `consent.ccpa` surface (`doNotSell` / `usPrivacy`) from the browser runtime.
- Inherit the public `flush()`, the batch body-size cap raised from 48 KiB to 256 KiB, and the session rotation that now triggers when the configured app identity (`appVersion`, `appBuildNumber`, `appPackageName`) changes.
- Fix: `useAttriaxPageView` no longer re-fires on every render when callers pass an inline options object. The effect now re-fires only on `pageName` / `effectKey` / `disabled` changes and reads the remaining option values fresh at fire time, so inline `parameters` no longer inflate page and event counts.

## 0.5.0

- Align the React wrapper release with `@attriax/js` 0.5.0.
- Inherit best-effort app-open handling: app-open is now fire-and-forget and no longer blocks event, session, or deep-link delivery.
- Inherit capped, jittered exponential retry backoff that honors a server `Retry-After` header for failed requests.
- Pick up the new deep-link referrer methods and analytics-event keys, serialized consent reconciliation, and the clamped session-continuation window from the browser runtime.

## 0.4.1

- Align the React wrapper release with `@attriax/js` 0.4.1.
- Remove the deprecated GDPR auto-detection toggle from provider documentation and examples because the underlying browser runtime no longer exposes it.

## 0.4.0

- Align the React wrapper release with `@attriax/js` 0.4.0.
- Update provider docs, examples, and hooks to use the grouped browser SDK surfaces (`attriax.tracking.*`, `attriax.deepLinks.*`) and explicit `autoInit` opt-in.
- `useAttriaxClient()` now exposes the underlying public JS instance shape directly, and provider coverage now exercises the wrapped tracking facade and React runtime metadata injection.

## 0.3.0

- Align the React wrapper release with `@attriax/js` 0.3.0.
- Re-export browser SDK GDPR consent helpers and types so React consent UI can stay on the wrapper import surface.
- Include package-local GDPR and anonymous analytics documentation in the published package.
- Document GDPR-aware provider setup, pending dispatch gates, anonymous analytics behavior, and not-required consent handling inherited from the browser SDK.

## 0.2.0

- Align the React wrapper release with `@attriax/js` 0.2.0

## 0.1.0

- Update types for `@attriax/js` changes

## 0.0.1

- First public Attriax React SDK release.
- Added provider, hooks, and page-view helpers on top of `@attriax/js`.
