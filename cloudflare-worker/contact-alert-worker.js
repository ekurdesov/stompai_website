const ALLOWED_ORIGINS = new Set([
  "https://stompai.com",
  "https://www.stompai.com",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

function buildCorsHeaders(origin) {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return {};
  }

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendEmail(env, payload) {
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await resendResponse.text();
  console.log("Resend status", resendResponse.status);
  console.log("Resend body", responseText);

  if (!resendResponse.ok) {
    throw new Error(responseText || "Resend request failed");
  }
}

function buildEmailPayload(env, body) {
  const type = body?.type === "early_access" ? "early_access" : "contact";
  const email = body?.email?.trim()?.toLowerCase();
  const page = body?.page?.trim() || "/";
  const submittedAt = new Date().toISOString();

  if (!email) {
    throw new Error("Email is required");
  }

  if (type === "contact") {
    const message = body?.message?.trim();

    if (!message) {
      throw new Error("Message is required");
    }

    const safeMessage = escapeHtml(message).replaceAll("\n", "<br>");

    return {
      from: env.ALERT_FROM_EMAIL,
      to: [env.ALERT_TO_EMAIL],
      reply_to: email,
      subject: `New Stompai contact message from ${email}`,
      text: [
        "A new contact message was submitted on stompai.com.",
        "",
        `Email: ${email}`,
        `Page: ${page}`,
        `Submitted at: ${submittedAt}`,
        "",
        "Message:",
        message,
      ].join("\n"),
      html: `
        <h2>New Stompai contact form submission</h2>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Page:</strong> ${escapeHtml(page)}</p>
        <p><strong>Submitted at:</strong> ${escapeHtml(submittedAt)}</p>
        <p><strong>Message:</strong><br>${safeMessage}</p>
      `,
    };
  }

  return {
    from: env.ALERT_FROM_EMAIL,
    to: [env.ALERT_TO_EMAIL],
    reply_to: email,
    subject: `New Stompai early access signup from ${email}`,
    text: [
      "A new early access signup was submitted on stompai.com.",
      "",
      `Email: ${email}`,
      `Page: ${page}`,
      `Submitted at: ${submittedAt}`,
    ].join("\n"),
    html: `
      <h2>New Stompai early access signup</h2>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Page:</strong> ${escapeHtml(page)}</p>
      <p><strong>Submitted at:</strong> ${escapeHtml(submittedAt)}</p>
    `,
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    const corsHeaders = buildCorsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "POST") {
      return json(
        { error: "Method not allowed" },
        { status: 405, headers: corsHeaders }
      );
    }

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json(
        { error: "Origin not allowed" },
        { status: 403, headers: corsHeaders }
      );
    }

    if (!env.RESEND_API_KEY || !env.ALERT_TO_EMAIL || !env.ALERT_FROM_EMAIL) {
      return json(
        { error: "Worker is not configured" },
        { status: 500, headers: corsHeaders }
      );
    }

    try {
      const body = await request.json();
      const emailPayload = buildEmailPayload(env, body);
      await sendEmail(env, emailPayload);

      return json({ ok: true }, { headers: corsHeaders });
    } catch (error) {
      return json(
        {
          error: "Failed to send alert email",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 502, headers: corsHeaders }
      );
    }
  },
};
