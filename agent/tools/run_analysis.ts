import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Run a short, self-contained Python 3 script in an isolated sandbox for deeper analysis or " +
    "to render a chart. The script runs in /workspace with no network access. Fetch the data " +
    "with run_sql first, then embed it in the script as literals. Print results to stdout.",
  inputSchema: z.object({
    python: z.string().describe("A self-contained Python 3 script. Print results to stdout."),
    filename: z.string().default("analysis.py").describe("Filename for the script in the sandbox."),
  }),
  async execute({ python, filename }, ctx) {
    const sandbox = await ctx.getSandbox();
    await sandbox.writeTextFile({ path: filename, content: python });
    const result = await sandbox.run({ command: `python3 ${filename}` });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: (result as { exitCode?: number }).exitCode ?? null,
    };
  },
});
