// deno-lint-ignore-file no-explicit-any
// Custom Yoga loader for Deno

import initYogaModule from "yoga-wasm-web";
import { dirname, fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";

let yoga: any = null;

export async function loadYoga(): Promise<any> {
  if (yoga) return yoga;

  // Find the yoga wasm file in the npm cache
  const cacheDir = Deno.env.get("DENO_DIR") ||
    join(Deno.env.get("HOME") || "", "Library", "Caches", "deno");

  const wasmPath = join(
    cacheDir,
    "npm",
    "registry.npmjs.org",
    "yoga-wasm-web",
    "0.3.3",
    "dist",
    "yoga.wasm"
  );

  try {
    // Read the WASM file
    const wasmBytes = await Deno.readFile(wasmPath);

    // Initialize with the WASM bytes
    yoga = await initYogaModule(wasmBytes);
    return yoga;
  } catch (error) {
    // Fallback: try to fetch from CDN
    console.error("Failed to load local WASM, trying CDN...");

    const response = await fetch(
      "https://unpkg.com/yoga-wasm-web@0.3.3/dist/yoga.wasm"
    );
    const wasmBytes = await response.arrayBuffer();

    yoga = await initYogaModule(wasmBytes);
    return yoga;
  }
}

export type { Yoga, Node } from "yoga-wasm-web";
