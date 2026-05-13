import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  Attriax,
  AttriaxProvider,
  useAttriax,
  useAttriaxPageView,
} from '../src';
import { AttriaxSynchronizationState } from '@attriax/js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('@attriax/react', () => {
  it('overrides custom sdk metadata with the React client runtime marker', () => {
    const attriax = new Attriax({
      appToken: 'ax_test_token',
      sdkMetadata: {
        clientRuntime: 'custom',
        retained: 'yes',
      },
    });

    expect((attriax as any).configValue.sdkMetadata).toMatchObject({
      clientRuntime: 'react',
      retained: 'yes',
    });
  });

  it('provides the client instance and tracks page views from the hook', async () => {
    const recordPageView = vi.fn().mockResolvedValue(undefined);

    const instance = {
      isInitialized: true,
      isFirstLaunch: false,
      synchronization: {
        state: AttriaxSynchronizationState.Synchronized,
        isSynchronized: true,
        subscribe: () => () => undefined,
      },
      deepLinks: {
        stream: {
          subscribe: () => () => undefined,
        },
      },
      recordPageView,
    } as any;

    function TestComponent() {
      const { attriax } = useAttriax();
      useAttriaxPageView('/pricing', {
        effectKey: '/pricing',
      });

      return <div data-client={attriax === instance ? 'same' : 'different'} />;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AttriaxProvider instance={instance} autoInit={false}>
          <TestComponent />
        </AttriaxProvider>,
      );
    });

    expect(container.querySelector('[data-client="same"]')).not.toBeNull();
    expect(recordPageView).toHaveBeenCalledWith(
      '/pricing',
      expect.objectContaining({ source: 'react_hook' }),
    );
  });

  it('retracks a page view when tracked options change', async () => {
    const recordPageView = vi.fn().mockResolvedValue(undefined);

    const instance = {
      isInitialized: true,
      isFirstLaunch: false,
      synchronization: {
        state: AttriaxSynchronizationState.Synchronized,
        isSynchronized: true,
        subscribe: () => () => undefined,
      },
      deepLinks: {
        stream: {
          subscribe: () => () => undefined,
        },
      },
      recordPageView,
    } as any;

    function TestComponent({ previousPageName }: { previousPageName?: string }) {
      useAttriaxPageView('/pricing', {
        effectKey: 'pricing',
        previousPageName,
      });

      return null;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AttriaxProvider instance={instance} autoInit={false}>
          <TestComponent previousPageName="/landing" />
        </AttriaxProvider>,
      );
    });

    await act(async () => {
      root.render(
        <AttriaxProvider instance={instance} autoInit={false}>
          <TestComponent previousPageName="/checkout" />
        </AttriaxProvider>,
      );
    });

    expect(recordPageView).toHaveBeenNthCalledWith(
      1,
      '/pricing',
      expect.objectContaining({ previousPageName: '/landing', source: 'react_hook' }),
    );
    expect(recordPageView).toHaveBeenNthCalledWith(
      2,
      '/pricing',
      expect.objectContaining({ previousPageName: '/checkout', source: 'react_hook' }),
    );
  });
});