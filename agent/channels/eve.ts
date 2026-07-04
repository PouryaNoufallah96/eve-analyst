import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";

// HTTP entrypoint (routes under /eve/v1/...).
//  - vercelOidc(): lets the eve TUI and Vercel deployments reach the agent.
//  - localDev():   opens localhost for `eve dev`.
// For a fully public demo endpoint you can add `none()` from eve/channels/auth as
// the last entry, but that makes the deployed agent world-readable, so it is left off.
export default eveChannel({
  auth: [vercelOidc(), localDev()],
});
