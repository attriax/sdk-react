import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  Attriax,
  AttriaxGdprConsentState,
  AttriaxProvider,
  useAttriax,
  useAttriaxClient,
  useAttriaxPageView,
} from "../src";
import { AttriaxSynchronizationState } from "@attriax/js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("@attriax/react", () => {
  it("overrides custom sdk metadata with the React client runtime marker", () => {
    const attriax = new Attriax({
      projectToken: "ax_test_token",
      sdkMetadata: {
        clientRuntime: "custom",
        retained: "yes",
      },
    });

    expect((attriax as any).client.configValue.sdkMetadata).toMatchObject({
      clientRuntime: "react",
      retained: "yes",
    });
  });

  it("re-exports GDPR consent state values from the browser SDK", () => {
    expect(AttriaxGdprConsentState.NotRequired).toBe("not_required");
  });

  it("provides the client instance and tracks page views from the hook", async () => {
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
      tracking: {
        recordPageView,
      },
    } as any;

    function TestComponent() {
      const { attriax } = useAttriax();
      useAttriaxPageView("/pricing", {
        effectKey: "/pricing",
      });

      return <div data-client={attriax === instance ? "same" : "different"} />;
    }

    const container = document.createElement("div");
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
      "/pricing",
      expect.objectContaining({ source: "react_hook" }),
    );
  });

  it("returns the provided public JS instance from useAttriaxClient", async () => {
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
      tracking: {
        recordPageView: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    function TestComponent() {
      const attriax = useAttriaxClient();
      return <div data-client={attriax === instance ? "same" : "different"} />;
    }

    const container = document.createElement("div");
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
  });

  it("retracks a page view with fresh option values when the effect key changes", async () => {
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
      tracking: {
        recordPageView,
      },
    } as any;

    function TestComponent({
      effectKey,
      previousPageName,
    }: {
      effectKey: string;
      previousPageName?: string;
    }) {
      useAttriaxPageView("/pricing", {
        effectKey,
        previousPageName,
      });

      return null;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AttriaxProvider instance={instance} autoInit={false}>
          <TestComponent effectKey="visit-1" previousPageName="/landing" />
        </AttriaxProvider>,
      );
    });

    await act(async () => {
      root.render(
        <AttriaxProvider instance={instance} autoInit={false}>
          <TestComponent effectKey="visit-2" previousPageName="/checkout" />
        </AttriaxProvider>,
      );
    });

    expect(recordPageView).toHaveBeenNthCalledWith(
      1,
      "/pricing",
      expect.objectContaining({
        previousPageName: "/landing",
        source: "react_hook",
      }),
    );
    expect(recordPageView).toHaveBeenNthCalledWith(
      2,
      "/pricing",
      expect.objectContaining({
        previousPageName: "/checkout",
        source: "react_hook",
      }),
    );
  });

  it("does not retrack when an inline parameters object changes identity between renders", async () => {
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
      tracking: {
        recordPageView,
      },
    } as any;

    function TestComponent({ renderPass }: { renderPass: number }) {
      // A fresh object literal on every render must not re-fire the effect.
      useAttriaxPageView("/pricing", {
        parameters: { plan: "startup" },
      });

      return <span data-render-pass={renderPass} />;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AttriaxProvider instance={instance} autoInit={false}>
          <TestComponent renderPass={1} />
        </AttriaxProvider>,
      );
    });

    await act(async () => {
      root.render(
        <AttriaxProvider instance={instance} autoInit={false}>
          <TestComponent renderPass={2} />
        </AttriaxProvider>,
      );
    });

    expect(recordPageView).toHaveBeenCalledTimes(1);
    expect(recordPageView).toHaveBeenCalledWith(
      "/pricing",
      expect.objectContaining({
        parameters: { plan: "startup" },
        source: "react_hook",
      }),
    );
  });
});
