import { defineAppConfig } from "@agent-native/core/server";

export default defineAppConfig({
  app: {
    // This name appears in transactional emails. Change it to your product name.
    name: "Digest Room Agent",
    // The source template keeps a renamed app from inheriting first-party email branding.
    sourceTemplate: "chat",
    // The Digest Room is the app's home: the morning desk is where the day starts.
    homePath: "/room",
    // Optional: use your own absolute HTTPS logo URL in transactional emails.
    // logoUrl: "https://example.com/logo.png",
  },
});
