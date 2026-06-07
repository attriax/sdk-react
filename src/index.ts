import {
  Attriax as BaseAttriax,
  AttriaxSynchronizationState,
} from "@attriax/js";
import type {
  AttriaxAdEventType,
  AttriaxConfig,
  AttriaxCreateDynamicLinkOptions,
  AttriaxCreateDynamicLinkResult,
  AttriaxDeepLinkEvent,
  AttriaxDynamicLinkRecord,
  AttriaxGdprConsentValues,
  AttriaxInitOptions,
  AttriaxPageViewOptions,
  AttriaxRecordAdEventOptions,
  AttriaxRecordAdRevenueOptions,
  AttriaxRecordPurchaseOptions,
} from "@attriax/js";
import {
  createElement,
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export {
  AttriaxApiError,
  AttriaxConsent,
  AttriaxGdprConsent,
  AttriaxGdprConsentState,
  AttriaxSynchronizationState,
} from "@attriax/js";
export type {
  AttriaxAdEventType,
  AttriaxConfig,
  AttriaxCreateDynamicLinkOptions,
  AttriaxCreateDynamicLinkResult,
  AttriaxDeepLinkEvent,
  AttriaxDynamicLinkRecord,
  AttriaxGdprConsentValues,
  AttriaxInitOptions,
  AttriaxPageViewOptions,
  AttriaxRecordAdEventOptions,
  AttriaxRecordAdRevenueOptions,
  AttriaxRecordPurchaseOptions,
} from "@attriax/js";

export class Attriax extends BaseAttriax {
  constructor(config: AttriaxConfig) {
    super(withReactSdkMetadata(config));
  }
}

/** Current Attriax state exposed by `useAttriax()`. */
export interface AttriaxContextValue {
  attriax: BaseAttriax;
  isInitialized: boolean;
  isFirstLaunch: boolean;
  synchronizationState: AttriaxSynchronizationState;
}

/** Props accepted by `AttriaxProvider`. */
export interface AttriaxProviderProps {
  children: ReactNode;
  config?: AttriaxConfig;
  instance?: BaseAttriax;
  /**
   * Auto-initialize the SDK inside a browser effect on mount. Defaults to
   * `false` because automatic initialization can race with SSR / Suspense
   * and silently swallow init errors. Opt in explicitly by setting `autoInit`
   * to `true` if you want the provider to manage `init()` for you.
   */
  autoInit?: boolean;
  initOptions?: AttriaxInitOptions;
  onInitError?: (error: unknown) => void;
}

/** State-only snapshot returned by `useAttriaxState()`. */
export interface AttriaxStateSnapshot {
  isInitialized: boolean;
  isFirstLaunch: boolean;
  synchronizationState: AttriaxSynchronizationState;
}

/** Options for `useAttriaxPageView()`. */
export interface UseAttriaxPageViewOptions extends AttriaxPageViewOptions {
  disabled?: boolean;
  effectKey?: string | number;
}

const AttriaxContext = createContext<AttriaxContextValue | null>(null);

/**
 * React provider that owns an `@attriax/js` client and initializes it inside a
 * browser effect.
 */
export function AttriaxProvider({
  children,
  config,
  instance,
  autoInit = false,
  initOptions,
  onInitError,
}: AttriaxProviderProps) {
  const attriaxRef = useRef<BaseAttriax | null>(null);
  const ownsInstanceRef = useRef(false);

  if (instance) {
    if (
      ownsInstanceRef.current &&
      attriaxRef.current &&
      attriaxRef.current !== instance
    ) {
      attriaxRef.current.dispose();
    }
    attriaxRef.current = instance;
    ownsInstanceRef.current = false;
  } else if (!attriaxRef.current || !ownsInstanceRef.current) {
    if (!config) {
      throw new Error(
        "AttriaxProvider requires either a config or an Attriax instance.",
      );
    }
    attriaxRef.current = new Attriax(config);
    ownsInstanceRef.current = true;
  }

  const attriax = attriaxRef.current;

  const [snapshot, setSnapshot] = useState(() => createSnapshot(attriax));

  useEffect(() => {
    return () => {
      if (ownsInstanceRef.current) {
        attriax.dispose();
        attriaxRef.current = null;
      }
    };
  }, [attriax]);

  useEffect(() => {
    const unsubscribe = attriax.synchronization.subscribe(() => {
      setSnapshot(createSnapshot(attriax));
    });

    return unsubscribe;
  }, [attriax]);

  useEffect(() => {
    if (!autoInit || attriax.isInitialized) {
      setSnapshot(createSnapshot(attriax));
      return;
    }

    let cancelled = false;
    void attriax
      .init(initOptions)
      .then(() => {
        if (!cancelled) {
          setSnapshot(createSnapshot(attriax));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSnapshot(createSnapshot(attriax));
          if (onInitError) {
            try {
              onInitError(error);
            } catch (callbackError) {
              console.error(
                "[Attriax React] onInitError callback threw.",
                callbackError,
              );
            }
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attriax, autoInit, initOptions, onInitError]);

  const value: AttriaxContextValue = {
    attriax,
    isInitialized: snapshot.isInitialized,
    isFirstLaunch: snapshot.isFirstLaunch,
    synchronizationState: snapshot.synchronizationState,
  };

  return createElement(AttriaxContext.Provider, { value }, children);
}

/** Returns the Attriax client plus its current initialization snapshot. */
export function useAttriax(): AttriaxContextValue {
  const value = useContext(AttriaxContext);
  if (!value) {
    throw new Error("useAttriax must be used within an AttriaxProvider.");
  }
  return value;
}

/** Returns only the underlying Attriax browser client. */
export function useAttriaxClient(): BaseAttriax {
  return useAttriax().attriax;
}

function withReactSdkMetadata(config: AttriaxConfig): AttriaxConfig {
  return {
    ...config,
    sdkMetadata: {
      ...(config.sdkMetadata ?? {}),
      clientRuntime: "react",
    },
  };
}

/** Returns only the current Attriax state snapshot. */
export function useAttriaxState(): AttriaxStateSnapshot {
  const { isInitialized, isFirstLaunch, synchronizationState } = useAttriax();

  return {
    isInitialized,
    isFirstLaunch,
    synchronizationState,
  };
}

/** Subscribes a React effect to Attriax deep-link events. */
export function useAttriaxDeepLinks(
  listener: (event: AttriaxDeepLinkEvent) => void,
): void {
  const { attriax } = useAttriax();
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    return attriax.deepLinks.stream.subscribe((event: AttriaxDeepLinkEvent) => {
      listenerRef.current(event);
    });
  }, [attriax]);
}

/**
 * Tracks a manual page view from a React effect. Disable this hook when the
 * underlying web client already uses automatic page tracking.
 */
export function useAttriaxPageView(
  pageName: string,
  options: UseAttriaxPageViewOptions = {},
): void {
  const { attriax, isInitialized } = useAttriax();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!isInitialized || options.disabled) {
      return;
    }

    void attriax.tracking.recordPageView(pageName, {
      ...optionsRef.current,
      source: optionsRef.current.source ?? "react_hook",
    });
  }, [
    attriax,
    isInitialized,
    pageName,
    options.disabled,
    options.effectKey,
    options.pageClass,
    options.pageTitle,
    options.previousPageName,
    options.parameters,
    options.source,
  ]);
}

function createSnapshot(attriax: BaseAttriax): AttriaxStateSnapshot {
  return {
    isInitialized: attriax.isInitialized,
    isFirstLaunch: attriax.isFirstLaunch,
    synchronizationState: attriax.synchronization.state,
  };
}
