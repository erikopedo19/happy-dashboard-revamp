// Run this in a terminal that has Node.js installed:
//   node scripts/generate-vapid-keys.mjs
// It prints a VAPID key pair and the Supabase CLI command to set the secrets.

import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
  publicKeyEncoding: { format: "jwk" },
  privateKeyEncoding: { format: "jwk" },
});

const x = Buffer.from(publicKey.x, "base64url");
const y = Buffer.from(publicKey.y, "base64url");
const publicKeyBytes = Buffer.concat([Buffer.from([0x04]), x, y]);

const vapidPublicKey = publicKeyBytes.toString("base64url");
const vapidPrivateKey = privateKey.d;
const vapidSubject = "mailto:admin@cutzioo.com";

console.log("\n=== VAPID Keys ===\n");
console.log("Public Key:\n" + vapidPublicKey + "\n");
console.log("Private Key:\n" + vapidPrivateKey + "\n");
console.log("Subject:\n" + vapidSubject + "\n");

console.log("=== Supabase CLI ===\n");
console.log(
  `supabase secrets set VAPID_PUBLIC_KEY="${vapidPublicKey}" VAPID_PRIVATE_KEY="${vapidPrivateKey}" VAPID_SUBJECT="${vapidSubject}"\n`
);
console.log("Or add these as project secrets in the Supabase Dashboard.\n");
