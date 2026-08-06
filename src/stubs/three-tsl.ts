/**
 * Stub for `three/tsl` (Three Shading Language), aliased in vite.config.ts.
 *
 * `three-globe` does `import * as tsl from 'three/tsl'` at module scope but only
 * reads from it inside `computeGeoKde` — the WebGPU path of the heatmap layer,
 * which this app never uses. See src/stubs/three-webgpu.ts for the full
 * reasoning; without the alias this module pulls in another 34 kB and keeps
 * three's WebGPU build alive.
 *
 * The exported names are exactly the ones three-globe destructures. Reading them
 * is safe; calling one throws, so an unexpected code path fails loudly.
 */

const notBundled = (name: string) => (): never => {
  throw new Error(
    `three/tsl.${name} is not available: three/tsl is stubbed out in vite.config.ts. ` +
    `Remove the alias if the app now needs WebGPU compute shaders.`,
  );
};

export const Fn = notBundled('Fn');
export const If = notBundled('If');
export const Loop = notBundled('Loop');
export const uniform = notBundled('uniform');
export const storage = notBundled('storage');
export const instanceIndex = notBundled('instanceIndex');
export const float = notBundled('float');
export const sqrt = notBundled('sqrt');
export const sin = notBundled('sin');
export const cos = notBundled('cos');
export const asin = notBundled('asin');
export const exp = notBundled('exp');
export const negate = notBundled('negate');
