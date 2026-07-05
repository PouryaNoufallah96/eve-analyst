import { defineSandbox, defaultBackend } from "eve/sandbox";

// The analysis sandbox runs untrusted, model-written code, so we lock it down:
// no network access at all. Eve's default network policy is "allow-all"; pinning
// deny-all on whichever backend is selected (Docker locally, Vercel Sandbox in
// production) makes "runs in an isolated sandbox with no network" actually true.
export default defineSandbox({
  backend: defaultBackend({
    docker: { networkPolicy: "deny-all" },
    vercel: { networkPolicy: "deny-all" },
    microsandbox: { networkPolicy: "deny-all" },
  }),
});
