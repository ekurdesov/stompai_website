export const CONTACT_ALERT_WORKER_URL =
  "https://stompai-contact-alert.stompaiads.workers.dev";

export async function notifyEmailAlert(payload) {
  if (
    !CONTACT_ALERT_WORKER_URL ||
    CONTACT_ALERT_WORKER_URL.includes("<your-subdomain>")
  ) {
    return;
  }

  const response = await fetch(CONTACT_ALERT_WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Worker returned ${response.status}`);
  }
}
