export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/Reisekosten";

export function withBasePath(path: string) {
  if (!path.startsWith("/")) throw new Error("App-Pfade müssen mit / beginnen.");
  if (!basePath) return path;
  return path === "/" ? basePath : `${basePath}${path}`;
}
