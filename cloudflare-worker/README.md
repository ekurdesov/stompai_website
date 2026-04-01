# Cloudflare Worker Email Alerts

This Worker sends email notifications through Resend after the website has already saved a submission in Firestore.

It supports both:

- the `contactMessages` contact form flow
- the `earlyAccessSignups` early access flow

## 1. Create the Worker

1. In Cloudflare, go to `Workers & Pages`.
2. Create a new Worker.
3. Replace the default code with `contact-alert-worker.js`.

## 2. Add Worker secrets

In the Worker settings, add these secrets:

- `RESEND_API_KEY`
- `ALERT_TO_EMAIL`
- `ALERT_FROM_EMAIL`

Recommended values:

- `ALERT_TO_EMAIL`: your inbox, for example `you@gmail.com`
- `ALERT_FROM_EMAIL`: a verified sender on your Resend domain, for example `alerts@stompai.com`

## 3. Update allowed origins if needed

The Worker only accepts requests from the origins listed in `contact-alert-worker.js`.

If you use a different local dev host or another production host, add it there before deploying.

## 4. Add the Worker URL to the site

In `js/email-alert.js`, replace:

```js
https://stompai-contact-alert.<your-subdomain>.workers.dev
```

with your real Worker URL.

## 5. Publish the site

After that, both frontend flows do this:

1. save the submission in Firestore
2. call the Worker
3. Worker sends the email through Resend

If the Worker call fails, the Firestore save still succeeds.
