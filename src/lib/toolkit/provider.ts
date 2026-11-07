import { APP_ID, TOOLKIT_URL } from "./config";
import { ACCESS_ADAPTERS, currentTextSize, type AdapterLike } from "./adapters";

/**
 * Connects this app to the accessibility toolkit, so the toolkit's profiles
 * can switch the app's own accessibility settings while the app is open.
 *
 * The toolkit's SDK is a remote module: it is imported only when a person
 * presses Connect, never during server rendering.
 */

type ToolkitStatus = { state: string; message?: string; providerId?: string };

type AdapterSpec = {
  id: string;
  name: string;
  description: string;
  supportAreas: string[];
  adapter: AdapterLike;
  inputSchema?: Record<string, unknown>;
  parameters?: () => Record<string, unknown>;
};

const SPECS: AdapterSpec[] = [
  {
    id: "larger-text",
    name: "Larger text",
    description: "Shows the app's words bigger, at two sizes.",
    supportAreas: ["vision"],
    adapter: ACCESS_ADAPTERS["larger-text"],
    inputSchema: {
      type: "object",
      properties: { size: { type: "string", enum: ["xl", "xxl"], description: "How big: xl is large, xxl is extra large." } },
      additionalProperties: false,
    },
    parameters: currentTextSize,
  },
  {
    id: "high-contrast",
    name: "High contrast",
    description: "Dark text and strong borders on a pale background.",
    supportAreas: ["vision"],
    adapter: ACCESS_ADAPTERS["high-contrast"],
  },
  {
    id: "large-targets",
    name: "Large tap targets",
    description: "Makes every button and box tall enough to hit easily.",
    supportAreas: ["motor"],
    adapter: ACCESS_ADAPTERS["large-targets"],
  },
  {
    id: "reduce-motion",
    name: "Reduce motion",
    description: "Stops animations and fades.",
    supportAreas: ["sensory", "vision"],
    adapter: ACCESS_ADAPTERS["reduce-motion"],
  },
  {
    id: "slow-speech",
    name: "Slower speech",
    description: "Reads summaries out loud more slowly.",
    supportAreas: ["hearing", "cognitive"],
    adapter: ACCESS_ADAPTERS["slow-speech"],
  },
  {
    id: "auto-read",
    name: "Read screens aloud",
    description: "Speaks each screen's heading when it opens.",
    supportAreas: ["vision"],
    adapter: ACCESS_ADAPTERS["auto-read"],
  },
  {
    id: "captions",
    name: "Captions",
    description: "Shows everything the app says out loud as text on screen.",
    supportAreas: ["hearing"],
    adapter: ACCESS_ADAPTERS.captions,
  },
  {
    id: "picture-summaries",
    name: "Picture summaries",
    description: "Shows dish summaries as large picture tiles.",
    supportAreas: ["cognitive", "reading"],
    adapter: ACCESS_ADAPTERS["picture-summaries"],
  },
];

const TOKEN_KEY = "dining-assistant.toolkit-token";
const PROVIDER_ID = "dining-assistant";

export function savedToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private mode: the token lasts for this page only */
  }
}

export function forgetToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to forget */
  }
}

let handle: {
  ready: Promise<unknown>;
  status: ToolkitStatus;
  providerId?: string;
  close: () => Promise<void>;
} | null = null;

export function toolkitStatus(): ToolkitStatus | null {
  return handle ? { ...handle.status } : null;
}

export function isToolkitConnected(): boolean {
  return handle?.status?.state === "connected";
}

/**
 * Open the live control channel. Throws with a plain-language message when the
 * address, token or network is wrong, so the screen can say what to do next.
 */
export async function connectToolkit({
  token,
  onStatus,
}: {
  token: string;
  onStatus?: (s: ToolkitStatus) => void;
}): Promise<ToolkitStatus> {
  const t = token.trim();
  if (!t.startsWith("aat_")) throw new Error("The toolkit token must start with aat_. Find it on the toolkit's Account & tokens page.");
  if (handle) {
    await handle.close().catch(() => {});
    handle = null;
  }

  const url = TOOLKIT_SDK_URL();
  const sdk = await import(/* @vite-ignore */ url);
  const { defineDescriptor, createAdapterProvider, connectToToolkit, fromToggleAdapter, detectBrowserPlatform } = sdk;

  const origin = typeof location === "undefined" ? "https://safe-bite-nearby.lovable.app" : location.origin;
  const application = {
    appId: APP_ID,
    name: "Dining Assistant",
    version: "1.0.0",
    description: "Voice-first help finding safe, affordable food nearby.",
    surfaces: ["web"],
    supportedPlatforms: [{ environment: "web-page" }],
    platform: detectBrowserPlatform(),
  };

  const registrations = SPECS.map((spec) => {
    const descriptor = defineDescriptor({
      appId: APP_ID,
      id: spec.id,
      name: spec.name,
      description: spec.description,
      version: "1.0.0",
      supportAreas: spec.supportAreas,
      surfaces: ["web"],
      targets: [{ platforms: ["*"], urls: [`${origin}/*`] }],
      ...(spec.inputSchema ? { inputSchema: spec.inputSchema } : {}),
    });
    return fromToggleAdapter({
      descriptor,
      adapter: spec.adapter,
      ...(spec.parameters ? { parameters: spec.parameters } : {}),
    });
  });

  const provider = createAdapterProvider({
    application,
    adapters: registrations,
    instructions:
      "Dining Assistant helps people find food nearby that is safe for them. These adapters change how the app looks and sounds. Allergy, diet, budget and distance checks are never changed by them.",
  });

  handle = connectToToolkit({
    url: TOOLKIT_URL,
    token: t,
    provider,
    providerId: PROVIDER_ID,
    label: typeof location === "undefined" ? "Dining Assistant" : `${location.pathname}`,
    onStatus: (s: ToolkitStatus) => {
      try {
        onStatus?.({ ...s });
      } catch {
        /* a status listener must not break the connection */
      }
    },
  });

  await handle.ready;
  return { ...handle.status };
}

export async function disconnectToolkit(): Promise<void> {
  const h = handle;
  handle = null;
  if (h) await h.close().catch(() => {});
}
