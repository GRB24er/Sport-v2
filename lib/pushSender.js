// Server-side helper to send Web Push notifications.
// Uses the `web-push` library, which must be installed via `npm install`.

import PushSubscription from "@/models/PushSubscription";
import Settings from "@/models/Settings";

let webpush;
async function getWebPush() {
  if (webpush) return webpush;
  try {
    const mod = await import("web-push");
    webpush = mod.default || mod;
  } catch (e) {
    throw new Error("web-push package not installed. Run `npm install web-push`.");
  }
  return webpush;
}

async function configureVapid() {
  const wp = await getWebPush();
  const s = (await Settings.findOne({ key: "main" }).lean()) || {};
  const publicKey = s.vapidPublicKey || process.env.VAPID_PUBLIC_KEY;
  const privateKey = s.vapidPrivateKey || process.env.VAPID_PRIVATE_KEY;
  const subject = s.vapidSubject || process.env.VAPID_SUBJECT || "mailto:support@betgenius.ai";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys not configured. Generate with `npx web-push generate-vapid-keys` and save to Settings or env.");
  }
  wp.setVapidDetails(subject, publicKey, privateKey);
  return wp;
}

// Send a push notification to one or many users.
// `target` can be a userId string, an array of userIds, or { roleAll: true } to send to every subscriber.
export async function sendPush(target, payload) {
  const wp = await configureVapid();

  let query = {};
  if (target?.roleAll) {
    query = {};
  } else if (Array.isArray(target)) {
    query = { userId: { $in: target } };
  } else if (target) {
    query = { userId: target };
  } else {
    return { sent: 0, failed: 0 };
  }

  const subs = await PushSubscription.find(query).lean();
  const body = JSON.stringify(payload);

  let sent = 0;
  let failed = 0;
  const deadEndpoints = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body,
          { TTL: 60 * 60 * 12 }
        );
        sent++;
      } catch (err) {
        failed++;
        // Subscription is gone — clean up
        if (err.statusCode === 404 || err.statusCode === 410) {
          deadEndpoints.push(sub.endpoint);
        } else {
          console.error("Push send error:", err.statusCode, err.body?.slice?.(0, 200));
        }
      }
    })
  );

  if (deadEndpoints.length) {
    await PushSubscription.deleteMany({ endpoint: { $in: deadEndpoints } });
  }

  return { sent, failed, cleaned: deadEndpoints.length };
}
