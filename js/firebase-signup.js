import {
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { db, logAnalyticsEvent } from "./firebase-client.js";

const modal = document.querySelector("[data-signup-modal]");
const successModal = document.querySelector("[data-signup-success-modal]");
const triggers = document.querySelectorAll("[data-early-access-trigger]");
const form = document.querySelector("[data-signup-form]");
const status = document.querySelector("[data-signup-status]");
const emailInput = document.querySelector("#signup-email");
const successCloseButton = document.querySelector("[data-signup-success-close]");

if (modal && successModal && triggers.length > 0 && form && status && emailInput && successCloseButton) {
  const closeTargets = modal.querySelectorAll("[data-signup-close]");
  const submitButton = form.querySelector('button[type="submit"]');

  function openModal() {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    logAnalyticsEvent("lead_modal_open", {
      modal_name: "studio_early_access",
      page: "studio",
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

  triggers.forEach((trigger) => trigger.addEventListener("click", openModal));
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
    if (!email) {
      status.textContent = "Please enter your email.";
      status.className = "signup-status error";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
    status.textContent = "Saving your early access request...";
    status.className = "signup-status";

    try {
      await addDoc(collection(db, "earlyAccessSignups"), {
        email,
        page: "studio",
        createdAt: serverTimestamp(),
        source: window.location.pathname,
        userAgent: window.navigator.userAgent,
        outreached: false,
        partner: 0,
      });

      logAnalyticsEvent("generate_lead", {
        form_name: "studio_early_access",
        page: "studio",
      });
      status.textContent = "";
      status.className = "signup-status";
      submitButton.disabled = false;
      submitButton.textContent = "Submit";
      openSuccessModal();
    } catch (error) {
      logAnalyticsEvent("lead_submit_error", {
        form_name: "studio_early_access",
        page: "studio",
      });
      status.textContent = "Signup failed. Check Firebase rules and try again.";
      status.className = "signup-status error";
      submitButton.disabled = false;
      submitButton.textContent = "Submit";
    }
  });
}
