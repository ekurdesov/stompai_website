import {
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { db, logAnalyticsEvent } from "./firebase-client.js";
import { notifyEmailAlert } from "./email-alert.js";

const triggers = document.querySelectorAll("[data-contact-trigger]");

if (triggers.length > 0) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="signup-modal" data-contact-modal hidden>
      <div class="signup-backdrop" data-contact-close></div>
      <div class="signup-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button type="button" class="signup-close" aria-label="Close contact dialog" data-contact-close>&times;</button>
        <p class="section-label">Contact</p>
        <h2 id="contact-title">Send Us a Message</h2>
        <p class="signup-copy">Share your email and message and we will get back to you as soon as we can.</p>
        <form class="signup-form" data-contact-form>
          <label class="signup-label" for="contact-email">Email</label>
          <input id="contact-email" name="email" type="email" class="signup-input" placeholder="you@example.com" autocomplete="email" required>
          <label class="signup-label" for="contact-message">Message</label>
          <textarea id="contact-message" name="message" class="signup-input contact-textarea" placeholder="How can we help?" required></textarea>
          <button type="submit" class="btn btn-amazon signup-submit">Send Message</button>
          <p class="signup-status" data-contact-status aria-live="polite"></p>
        </form>
      </div>
    </div>
    <div class="signup-modal" data-contact-success-modal hidden>
      <div class="signup-backdrop"></div>
      <div class="signup-dialog signup-dialog-confirm" role="dialog" aria-modal="true" aria-labelledby="contact-success-title">
        <p class="section-label">Contact</p>
        <h2 id="contact-success-title">Thanks for your message</h2>
        <p class="signup-copy">We will get back to you in 72 hours.</p>
        <button type="button" class="btn btn-amazon signup-submit" data-contact-success-close>OK</button>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  const modal = document.querySelector("[data-contact-modal]");
  const successModal = document.querySelector("[data-contact-success-modal]");
  const form = document.querySelector("[data-contact-form]");
  const status = document.querySelector("[data-contact-status]");
  const emailInput = document.querySelector("#contact-email");
  const messageInput = document.querySelector("#contact-message");
  const successCloseButton = document.querySelector("[data-contact-success-close]");
  const closeTargets = document.querySelectorAll("[data-contact-close]");
  const submitButton = form?.querySelector("button[type=submit]");

  function openModal() {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    logAnalyticsEvent("contact_modal_open", {
      page: window.location.pathname,
    });
    window.setTimeout(() => emailInput.focus(), 0);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    status.textContent = "";
    status.className = "signup-status";
    form.reset();
  }

  function openSuccessModal() {
    successModal.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => successCloseButton.focus(), 0);
  }

  function closeSuccessModal() {
    successModal.hidden = true;
    document.body.style.overflow = "";
    closeModal();
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal();
    });
  });

  closeTargets.forEach((node) => node.addEventListener("click", closeModal));
  successCloseButton.addEventListener("click", closeSuccessModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    } else if (event.key === "Escape" && !successModal.hidden) {
      closeSuccessModal();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const message = messageInput.value.trim();

    if (!email || !message) {
      status.textContent = "Please enter your email and message.";
      status.className = "signup-status error";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    status.textContent = "Sending your message...";
    status.className = "signup-status";

    try {
      await addDoc(collection(db, "contactMessages"), {
        email,
        message,
        page: window.location.pathname,
        createdAt: serverTimestamp(),
        userAgent: window.navigator.userAgent,
        status: "new",
      });

      try {
        await notifyEmailAlert({
          type: "contact",
          email,
          message,
          page: window.location.pathname,
        });
      } catch (error) {
        console.error("Contact alert email failed", error);
        logAnalyticsEvent("contact_alert_error", {
          page: window.location.pathname,
        });
      }

      logAnalyticsEvent("contact_submit", {
        page: window.location.pathname,
      });
      status.textContent = "";
      status.className = "signup-status";
      submitButton.disabled = false;
      submitButton.textContent = "Send Message";
      openSuccessModal();
    } catch (error) {
      logAnalyticsEvent("contact_submit_error", {
        page: window.location.pathname,
      });
      status.textContent = "Message failed to send. Please try again.";
      status.className = "signup-status error";
      submitButton.disabled = false;
      submitButton.textContent = "Send Message";
    }
  });
}
