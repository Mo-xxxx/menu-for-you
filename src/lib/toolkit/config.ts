/** Where the accessibility toolkit lives, and how this app names itself there. */
export const TOOLKIT_URL = "https://toolkit-service-774429076434.us-central1.run.app";
export const APP_ID = "dining-assistant";
/** The SDK is a remote module, so it is read as a function, never bundled. */
export const TOOLKIT_SDK_URL = () => `${TOOLKIT_URL}/sdk/adapter-mcp.js`;
