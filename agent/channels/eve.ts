import { eveChannel } from "eve/channels/eve";
import { localDev, none, vercelOidc } from "eve/channels/auth";

// HTTP entrypoint (routes under /eve/v1/...).
//  - vercelOidc(): lets the eve TUI and Vercel deployments reach the agent.
//  - localDev():   opens localhost for `eve dev`.
//  - none():       PUBLIC DEMO. Anyone can reach the deployed endpoint anonymously.
//                  This is intentional so the agent is easy to try from the video.
//                  For a real deployment, remove none() and put your auth provider
//                  (Auth.js, Clerk, httpBasic, etc.) here instead.
export default eveChannel({
  auth: [vercelOidc(), localDev(), none()],
});
