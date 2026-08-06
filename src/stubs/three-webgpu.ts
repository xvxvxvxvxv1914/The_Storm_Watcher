/**
 * Stub for `three/webgpu`, aliased in vite.config.ts.
 *
 * `three-globe` and `three-render-objects` import from it unconditionally, which
 * dragged three's entire WebGPU build into the bundle: 2.06 MB of the 3.63 MB of
 * source in `globe-vendor`, for code neither globe ever reaches.
 *
 * Both uses are opt-in:
 *  - `three-render-objects` picks `useWebGPU ? WebGPURenderer : WebGLRenderer`,
 *    and nothing in this app sets that flag.
 *  - `three-globe` uses `StorageInstancedBufferAttribute` only inside
 *    `computeGeoKde`, the GPU path of the **heatmap layer**, which already falls
 *    back to a CPU implementation when `navigator.gpu` is missing. AuroraGlobe
 *    and ISSGlobe use neither heatmaps nor any other data layer — only
 *    globeImageUrl, the atmosphere and HTML markers.
 *
 * These throw rather than no-op: if a future change does reach one of those
 * paths, it should fail loudly here instead of rendering something subtly wrong.
 */

const notBundled = (name: string): never => {
  throw new Error(
    `${name} is not available: three/webgpu is stubbed out in vite.config.ts to keep ` +
    `three's WebGPU build (2 MB) out of the bundle. Remove the alias if the app now needs WebGPU.`,
  );
};

export class WebGPURenderer {
  constructor() { notBundled('WebGPURenderer'); }
}

export class StorageInstancedBufferAttribute {
  constructor() { notBundled('StorageInstancedBufferAttribute'); }
}
