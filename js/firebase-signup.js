import {
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { db } from "./firebase-client.js";

const modal = document.querySelector("[data-signup-modal]");
const trigger = document.querySelector("[data-early-access-trigger]");
const form = document.querySelector("[data-signup-form]");
const status = document.querySelector("[data-signup-status]");
const emailInput = document.querySelector("#signup-email");

if (modal && trigger && form && status && emailInput) {
  const closeTargets = modal.querySelectorAll("[data-signup-close]");
  const submitButton = form.querySelector('button[type="submit"]');

  function openModal() {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => emailInput.focus(), 0);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    status.textContent = "";
    status.className = "signup-status";
    form.reset();
  }

  trigger.addEventListener("click", openModal);
  closeTargets.forEach((node) => node.addEventListener("click", closeModal));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
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

      status.textContent = "You are on the list. We will be in touch.";
      status.className = "signup-status success";
      submitButton.textContent = "Submitted";
      window.setTimeout(closeModal, 1400);
    } catch (error) {
      status.textContent = "Signup failed. Check Firebase rules and try again.";
      status.className = "signup-status error";
      submitButton.disabled = false;
      submitButton.textContent = "Submit";
    }
  });
}
