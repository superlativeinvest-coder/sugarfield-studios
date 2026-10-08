import { isAbsolute, join, resolve } from "node:path";

export function artifactRootFromArgs(args: readonly string[] = process.argv.slice(2), environment: Record<string, string | undefined> = process.env): string | undefined {
  const inline = args.find((arg) => arg.startsWith("--artifact-root="))?.slice("--artifact-root=".length);
  const index = args.indexOf("--artifact-root");
  const value = inline ?? (index >= 0 ? args[index + 1] : undefined) ?? environment.POKOPIA_ARTIFACT_ROOT;
  return value ? resolve(value) : undefined;
}

export function resolveArtifactSourcePath(sourcePath: string, artifactRoot?: string): string {
  if (isAbsolute(sourcePath)) return sourcePath;
  if (!artifactRoot) return resolve(sourcePath);
  const relative = sourcePath.replace(/^PRODUCTS[\\/]/i, "");
  return join(artifactRoot, ...relative.split(/[\\/]/));
}
