// Types for the generator, so src/data/blog/blogMetadata.test.ts can import it
// to check the committed metadata.ts against a fresh build.
export function buildMetadataSource(): Promise<string>;
