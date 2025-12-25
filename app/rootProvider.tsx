"use client";
import { ReactNode, useEffect, useRef, useState } from "react";
import { base, baseSepolia } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";
import sdk from "@farcaster/miniapp-sdk";

export function RootProvider({ children }: { children: ReactNode }) {
  const configuredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
  const configuredChain = (process.env.NEXT_PUBLIC_CHAIN || "").toLowerCase();
  const chain =
    configuredChainId === baseSepolia.id || configuredChain === "basesepolia"
      ? baseSepolia
      : base;

  const [providerKey, setProviderKey] = useState(0);
  const lastInitRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const initProvider = async () => {
      const now = Date.now();
      if (now - lastInitRef.current < 1000) return;
      lastInitRef.current = now;

      try {
        sdk.actions.ready();
      } catch {
      }

      const maxAttempts = 6;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (cancelled) return;
        try {
          const provider = await sdk.wallet.getEthereumProvider();
          if (provider) {
            (window as any).ethereum = provider;
            setProviderKey((k) => k + 1);
            return;
          }
        } catch {
        }

        await sleep(250 + attempt * 250);
      }
    };

    const t = setTimeout(() => {
      initProvider();
    }, 200);

    const onFocus = () => {
      initProvider();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") initProvider();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(t);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <OnchainKitProvider
      key={providerKey}
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={chain}
      config={{
        appearance: {
          mode: "auto",
        },
        wallet: {
          display: "modal",
          preference: "all",
        },
      }}
      miniKit={{
        enabled: true,
        autoConnect: true,
        notificationProxyUrl: undefined,
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
