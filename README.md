# @attriax/react

React provider and hooks for Attriax JavaScript integrations.

## Overview

`@attriax/react` stays intentionally thin. It wraps `@attriax/js` with a
provider, lifecycle-aware initialization, deep-link subscriptions, and page
tracking hooks without introducing router or framework lock-in.

This package is open source under the Apache License, Version 2.0.

Attriax website: https://attriax.com

## Requirements

- React 18 or 19.
- `@attriax/js` available alongside this package.
- A browser-rendered application tree for `AttriaxProvider` initialization.
- An active Attriax project token.

## Installation

```bash
npm install react react-dom @attriax/react @attriax/js
```

## Usage

```tsx
import { AttriaxProvider, useAttriax } from '@attriax/react';

function CheckoutPage() {
  const { attriax, synchronizationState } = useAttriax();

  async function completePurchase() {
    await attriax.tracking.recordEvent('purchase_completed', {
      eventData: {
        value: 99,
        currency: 'USD',
      },
    });
  }

  async function createInviteLink() {
    const result = await attriax.deepLinks.createDynamicLink({
      destinationUrl: 'https://attriax.com/invite',
      group: 'react_demo',
      socialPreview: {
        title: 'React invite',
        description: 'Open the app with my invite attached.',
      },
      data: {
        inviterId: 'user_123',
      },
    });

    console.log(result.link.shortUrl);
  }

  return (
    <div>
      <button onClick={() => void completePurchase()}>
        State: {synchronizationState}
      </button>
      <button onClick={() => void createInviteLink()}>
        Create invite link
      </button>
    </div>
  );
}

export function App() {
  return (
    <AttriaxProvider
      autoInit
      config={{
        projectToken: 'ax_your_project_token',
        gdprEnabled: true,
      }}
    >
      <CheckoutPage />
    </AttriaxProvider>
  );
}
```

## Automatic Page Tracking

The underlying `@attriax/js` client enables automatic page tracking by
default. After initialization, it records the current page and tracks History
API navigation changes for single-page applications.

Disable automatic page tracking when your React app already emits manual route
events:

```tsx
<AttriaxProvider
  config={{
    projectToken: 'ax_your_project_token',
    automaticPageTracking: false,
  }}
>
  <App />
</AttriaxProvider>
```

## Manual Page Tracking

Use `useAttriaxPageView()` only when you need custom route names or you have
disabled automatic page tracking:

```tsx
import { AttriaxProvider, useAttriaxPageView } from '@attriax/react';

function CheckoutPage() {
  useAttriaxPageView('/checkout', {
    effectKey: '/checkout',
    previousPageName: '/cart',
  });

  return null;
}
```

## Push Notification Attribution

`useAttriaxRecordNotification()` returns a stable callback that mirrors the
underlying `@attriax/js` `tracking.recordNotification(type, notificationId,
options?)` surface. Attriax never sends pushes itself — you call this from your
own push handler (a service-worker `push` / `notificationclick` listener, or a
hybrid native bridge), forwarding any Attriax `linkId` / `campaignId` reference
embedded in the payload. The call routes through the same offline queue and
consent gates as other tracking.

The three lifecycle types are `"received"` (deliverability), `"opened"`
(re-engagement attribution), and `"dismissed"` (best-effort — the web
Notification API's `onclose` is unreliable across browsers/OS). `source`
(`"fcm"` | `"apns"` | `"other"`) is inferred from `payload` when omitted.

```tsx
import { useEffect } from 'react';
import { useAttriaxRecordNotification } from '@attriax/react';

function PushAttributionBridge() {
  const recordNotification = useAttriaxRecordNotification();

  useEffect(() => {
    const channel = navigator.serviceWorker;
    if (!channel) {
      return;
    }

    // The service worker posts the click/push payload to the page, where the
    // hook has access to the live Attriax client.
    function handleMessage(event: MessageEvent) {
      const message = event.data;
      if (!message || message.type !== 'attriax-notification') {
        return;
      }

      void recordNotification(message.lifecycle, message.notificationId, {
        linkId: message.payload?.attriax_link_id,
        campaignId: message.payload?.attriax_campaign_id,
        title: message.payload?.title,
        // `source` omitted — inferred from the forwarded FCM/APNs payload.
        payload: message.payload,
        flushImmediately: true,
      });
    }

    channel.addEventListener('message', handleMessage);
    return () => channel.removeEventListener('message', handleMessage);
  }, [recordNotification]);

  return null;
}
```

```tsx
// service-worker.ts — forward the click to the page for the React hook to record.
self.addEventListener('notificationclick', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        client.postMessage({
          type: 'attriax-notification',
          lifecycle: 'opened',
          notificationId: event.notification.data?.notificationId,
          payload: event.notification.data,
        });
      }
    }),
  );
});
```

When you record directly from the service worker instead (no page available),
call the `@attriax/js` `tracking` surface there — see the `@attriax/js` README
"Push Notification Attribution" section for the worker-side snippets.

## GDPR Consent

`gdprEnabled` defaults to `false`. Turn it on only when the underlying browser
runtime should gate GDPR-regulated tracking. Anonymous-capable activity still
sends immediately while consent is unresolved, while attribution-only work
stays withheld until consent allows it.

```tsx
import { AttriaxGdprConsentState, useAttriax } from '@attriax/react';

function PrivacyButton() {
  const { attriax } = useAttriax();

  async function handleClick() {
    const needsConsent = await attriax.consent.gdpr.needsConsent({
      localOnly: true,
    });
    if (!needsConsent) {
      attriax.consent.gdpr.setNotRequired();
      return;
    }

    attriax.consent.gdpr.setConsent({
      analytics: true,
      attribution: true,
      adEvents: false,
    });

    console.log(attriax.consent.gdpr.state === AttriaxGdprConsentState.Granted);
  }

  return <button onClick={() => void handleClick()}>Review privacy choices</button>;
}
```

See [docs/gdpr-and-anonymous-analytics.md](docs/gdpr-and-anonymous-analytics.md) for the full GDPR and anonymous analytics behavior inherited from `@attriax/js`, including how unresolved consent still sends anonymous-capable traffic immediately, how `AttriaxGdprConsentState.NotRequired` maps to the `not_required` wire value, and how denied analytics is stored without device identity.

## Included APIs

- `AttriaxProvider` - creates or accepts an `@attriax/js` client and can run
  browser-side initialization for you when `autoInit` is set to `true`.
- `useAttriax()` - returns the SDK instance plus state snapshot.
- `useAttriaxClient()` - returns only the SDK instance.
- `useAttriaxState()` - returns the current initialization and synchronization state.
- `useAttriaxDeepLinks()` - subscribes to deep-link events.
- `useAttriaxRecordNotification()` - returns a stable callback for recording
  push-notification attribution events forwarded from your own push handler.
- `useAttriaxPageView()` - emits standardized page-view events from React effects.

## Dynamic Link Creation

The React package keeps dynamic-link creation on the underlying `attriax`
client so hooks stay thin and framework-agnostic.

```tsx
import { useAttriax } from '@attriax/react';

function InviteButton() {
  const { attriax } = useAttriax();

  async function handleClick() {
    const result = await attriax.deepLinks.createDynamicLink({
      destinationUrl: 'https://attriax.com/invite',
      group: 'creator-program',
      data: {
        creatorId: 'alex',
      },
    });

    await navigator.clipboard.writeText(result.link.shortUrl);
  }

  return <button onClick={() => void handleClick()}>Create invite link</button>;
}
```

## Design Notes

- No router dependency is bundled. Consumers can pass route-derived values into
  `useAttriaxPageView()` when they want manual page naming.
- `autoInit` defaults to `false`; set it explicitly when you want the provider
  to call `init()` inside a browser effect for the owned SDK instance.
- Provider auto-initialization runs only in a browser effect. In SSR frameworks,
  mount `AttriaxProvider` only in client-rendered trees because the underlying
  browser SDK depends on `window`, `history`, and `localStorage`.
- The React package depends on `@attriax/js` and keeps React itself as a peer
  dependency.

## Validation

```bash
npm run typecheck
npm run test
npm run build
```

## License

Apache-2.0. See `LICENSE`.
