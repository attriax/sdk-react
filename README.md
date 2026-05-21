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
- An active Attriax app token.

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
    await attriax.recordEvent('purchase_completed', {
      eventData: {
        value: 99,
        currency: 'USD',
      },
    });
  }

  async function createInviteLink() {
    const result = await attriax.createDynamicLink({
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
      config={{
        appToken: 'ax_your_app_token',
        gdprEnabled: true,
        gdprAutoDetect: true,
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
    appToken: 'ax_your_app_token',
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

## GDPR Consent

`gdprEnabled` defaults to `false`. Turn it on only when the underlying browser
runtime should wait for a GDPR decision before sending GDPR-gated tracking
activity. `gdprAutoDetect` defaults to `true` and lets the SDK derive an
initial GDPR state automatically.

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

See [docs/gdpr-and-anonymous-analytics.md](docs/gdpr-and-anonymous-analytics.md) for the full GDPR and anonymous analytics behavior inherited from `@attriax/js`, including how pending consent defers network dispatch, how `AttriaxGdprConsentState.NotRequired` maps to the `not_required` wire value, and how denied analytics is stored without device identity.

## Included APIs

- `AttriaxProvider` - creates or accepts an `@attriax/js` client and runs
  browser-side initialization automatically.
- `useAttriax()` - returns the SDK instance plus state snapshot.
- `useAttriaxClient()` - returns only the SDK instance.
- `useAttriaxState()` - returns the current initialization and synchronization state.
- `useAttriaxDeepLinks()` - subscribes to deep-link events.
- `useAttriaxPageView()` - emits standardized page-view events from React effects.

## Dynamic Link Creation

The React package keeps dynamic-link creation on the underlying `attriax`
client so hooks stay thin and framework-agnostic.

```tsx
import { useAttriax } from '@attriax/react';

function InviteButton() {
  const { attriax } = useAttriax();

  async function handleClick() {
    const result = await attriax.createDynamicLink({
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
