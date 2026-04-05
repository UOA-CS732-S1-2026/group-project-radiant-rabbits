const {
  TextEncoder: NodeTextEncoder,
  TextDecoder: NodeTextDecoder,
} = require("util");

if (typeof global.TextEncoder === "undefined") {
  (global as any).TextEncoder = NodeTextEncoder;
}

if (typeof global.TextDecoder === "undefined") {
  (global as any).TextDecoder = NodeTextDecoder;
}

process.env.AUTH_GITHUB_ID = "fake-id";
process.env.AUTH_GITHUB_SECRET = "fake-secret";
process.env.NEXTAUTH_SECRET = "fake-nextauth-secret";

process.env.SUPPRESS_JEST_WARNINGS = "true";
