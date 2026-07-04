import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

// Slack channel. Credentials flow through Vercel Connect, so there is no bot token
// or signing secret in code. The same agent that answers over HTTP now answers Slack
// @mentions and DMs in threads, with human-in-the-loop approvals rendered as buttons.
//
// To activate (one-time), provision a Connect Slack client and point its trigger at
// eve's Slack route, then deploy (see README "Enable Slack"):
//   export FF_CONNECT_ENABLED=1
//   vercel connect create slack --triggers
//   vercel connect attach <uid> --triggers --trigger-path /eve/v1/slack --yes
//   VERCEL_USE_EXPERIMENTAL_FRAMEWORKS=1 vercel deploy --prod
export default slackChannel({
  credentials: connectSlackCredentials("slack/eve-analyst"),
  threadContext: { since: "last-agent-reply" },
});
