export default async function handler(request) {
  const mod = await import("../dist/server/server.js");
  return mod.default.fetch(request, {}, {});
}
