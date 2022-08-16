import esbuild from "esbuild";
import mdx from "@mdx-js/esbuild";

await esbuild.build({
  entryPoints: ["./src/extension.ts"],
  outfile: "out/main.js",
  format: "cjs",
  plugins: [mdx()],
  platform: "node",
  bundle: true,
  external: ["vscode"],
});
