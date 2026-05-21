# GDPR And Anonymous Analytics

`@attriax/react` uses the browser runtime from `@attriax/js`, so GDPR behavior is the same as the JavaScript SDK. This package provides React hooks and provider wiring around those technical controls. It is not legal advice, and it does not replace your consent UI, privacy policy, lawful-basis assessment, data processing terms, or regional compliance review.

## Consent Scope

Consent is regulation-scoped. GDPR lives under `attriax.consent.gdpr`, so future regulations can be added without changing the GDPR API shape.

GDPR consent has these states:

- `unknown`: no local or remote decision is available yet.
- `pending`: GDPR consent appears required and the app should ask the user.
- `granted`: a user decision has been recorded, including category values.
- `not_required` (`AttriaxGdprConsentState.NotRequired`): GDPR consent is not required for this app session or install.

Use `state`, `values`, and `isWaitingForConsent` to drive privacy UI. Use `needsConsent({ localOnly: true })` for a local timezone-based precheck, and `needsConsent()` when the app can call the API for the server-side region decision.

## Pending Consent

When GDPR is enabled and the state is `unknown` or `pending`, the SDK may queue local event, crash, session, and deep-link activity, but it does not send network tracking requests. Network dispatch resumes only after consent is resolved to `granted` or `not_required`.

If work was buffered while GDPR was pending and the final state is `AttriaxGdprConsentState.NotRequired`, analytics-capable requests regain normal device identity before dispatch because consent is not required for that region/session.

Attribution-only activity, user identity updates, uninstall tokens, and app-open attribution are not sent while consent is waiting.

## Consent Records

GDPR consent check and write requests use an SDK-generated consent ID. They do not send `deviceId`, `deviceIdSource`, app-user ID, external user ID, IP address, or user-agent as request-body consent identifiers.

Like any HTTPS API, the backend receives network metadata such as source IP and user-agent. GDPR consent checks may use that request context transiently for region decisions. It is not stored on consent records.

The backend consent record is keyed by app and consent ID. It stores the consent state, optional category values, region metadata, and timestamps. It is intentionally not linked to a tracked device or app user.

## Category Behavior

When consent is granted for a category, matching SDK requests can include device identity where the request type requires identified tracking.

When analytics or ad-events consent is denied after a pending period, queued analytics-capable activity may still be sent without device identity if your integration allows anonymous analytics. Treat that as a separate lawful-basis/product decision in your consent and privacy design.

Attribution, user identity, uninstall tracking, and install attribution require attribution consent. If attribution is denied, those requests are withheld rather than anonymized.

## Anonymous Analytics

Anonymous analytics means the SDK does not send Attriax device identity, app-user identity, or external user identity. It is not a promise of irreversible legal anonymization by itself.

Anonymous traffic is bound server-side to anonymous sessions, not to device IDs or app users. The backend derives a daily salted hash from request context and app ID, then groups anonymous events, crashes, sessions, and deep-link diagnostics under an anonymous session ID. Raw IP and user-agent values are not stored in anonymous session rows.

Daily salts limit long-term linkability and are pruned after a short operational window. While a salt exists, anonymous session data should still be treated as daily-scoped pseudonymous data for GDPR analysis. Anonymous analytics is useful for aggregate counts, trends, crash volume, and deep-link diagnostics, but it intentionally does not support user explorer history, uninstall tracking, cross-day identity stitching, or attribution decisions.

## App Responsibilities

Your app should:

- Enable GDPR handling only when you want the SDK to gate GDPR-regulated tracking.
- Present clear consent UI before calling `setConsent`.
- Store and expose privacy choices in your app settings.
- Call `reset()` when the app needs to re-ask.
- Avoid putting personal data, secrets, or direct identifiers in event names, metadata, page names, crash reasons, or custom properties unless you have an appropriate lawful basis.
