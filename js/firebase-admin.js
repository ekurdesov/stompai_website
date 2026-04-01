import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { app, db } from "./firebase-client.js";

const tbody = document.querySelector("[data-admin-body]");
const status = document.querySelector("[data-admin-status]");
const exportButton = document.querySelector("[data-export-csv]");
const refreshButton = document.querySelector("[data-refresh]");
const contactTbody = document.querySelector("[data-contact-body]");
const contactStatus = document.querySelector("[data-contact-admin-status]");
const contactExportButton = document.querySelector("[data-export-contact-csv]");
const contactRefreshButton = document.querySelector("[data-contact-refresh]");
const authStatus = document.querySelector("[data-auth-status]");
const signInButton = document.querySelector("[data-sign-in]");
const signOutButton = document.querySelector("[data-sign-out]");
const adminPanel = document.querySelector("[data-admin-panel]");

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const adminEmails = [
  "stomaiads@gmail.com",
  "stompaiads@gmail.com",
  "ekurdesov@gmail.com",
  "johnmkjohnson@gmail.com",
];
let records = [];
let contactRecords = [];

function formatTimestamp(value) {
  if (!value?.toDate) return "";
  return value.toDate().toLocaleString();
}

function escapeCsv(value) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function renderRows() {
  if (!tbody) return;

  if (!records.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="admin-empty">No signups found.</td></tr>';
    return;
  }

  tbody.innerHTML = records.map((record) => `
    <tr data-doc-id="${record.id}">
      <td>${record.email || ""}</td>
      <td>${record.page || ""}</td>
      <td>${formatTimestamp(record.createdAt)}</td>
      <td class="admin-source-cell">${record.source || ""}</td>
      <td>
        <label class="admin-checkbox">
          <input type="checkbox" data-field="outreached" ${record.outreached ? "checked" : ""}>
          <span>${record.outreached ? "Yes" : "No"}</span>
        </label>
      </td>
      <td>
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value="${Number(record.partner ?? 0)}"
          class="admin-number"
          data-field="partner"
        >
      </td>
      <td>
        <button type="button" class="btn btn-outline admin-save" data-save>Save</button>
      </td>
    </tr>
  `).join("");
}

function renderContactRows() {
  if (!contactTbody) return;

  if (!contactRecords.length) {
    contactTbody.innerHTML = '<tr><td colspan="6" class="admin-empty">No contact messages found.</td></tr>';
    return;
  }

  contactTbody.innerHTML = contactRecords.map((record) => `
    <tr data-contact-doc-id="${record.id}">
      <td>${record.email || ""}</td>
      <td class="admin-message-cell">${record.message || ""}</td>
      <td>${record.page || ""}</td>
      <td>${formatTimestamp(record.createdAt)}</td>
      <td>
        <select class="admin-select" data-contact-field="status">
          <option value="new" ${record.status === "new" ? "selected" : ""}>new</option>
          <option value="reviewed" ${record.status === "reviewed" ? "selected" : ""}>reviewed</option>
          <option value="replied" ${record.status === "replied" ? "selected" : ""}>replied</option>
        </select>
      </td>
      <td>
        <button type="button" class="btn btn-outline admin-save" data-contact-save>Save</button>
      </td>
    </tr>
  `).join("");
}

async function loadRecords() {
  if (!status) return;
  status.textContent = "Loading signups...";

  try {
    const snapshot = await getDocs(query(collection(db, "earlyAccessSignups"), orderBy("createdAt", "desc")));
    records = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    renderRows();
    status.textContent = `${records.length} signups loaded.`;
  } catch (error) {
    status.textContent = "Failed to load signups. Check Firestore rules.";
  }
}

async function loadContactRecords() {
  if (!contactStatus) return;
  contactStatus.textContent = "Loading contact messages...";

  try {
    const snapshot = await getDocs(query(collection(db, "contactMessages"), orderBy("createdAt", "desc")));
    contactRecords = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    renderContactRows();
    contactStatus.textContent = `${contactRecords.length} contact messages loaded.`;
  } catch (error) {
    contactStatus.textContent = "Failed to load contact messages. Check Firestore rules.";
  }
}

function isAllowedAdmin(user) {
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

function setSignedOutState(message) {
  if (authStatus) authStatus.textContent = message;
  if (signInButton) signInButton.hidden = false;
  if (signOutButton) signOutButton.hidden = true;
  if (adminPanel) adminPanel.hidden = true;
  records = [];
  contactRecords = [];
  renderRows();
  renderContactRows();
  if (status) status.textContent = "Sign in required.";
  if (contactStatus) contactStatus.textContent = "Sign in required.";
}

function setSignedInState(user) {
  if (authStatus) authStatus.textContent = `Signed in as ${user.email}`;
  if (signInButton) signInButton.hidden = true;
  if (signOutButton) signOutButton.hidden = false;
  if (adminPanel) adminPanel.hidden = false;
}

async function saveRow(row) {
  const id = row.dataset.docId;
  const outreachedInput = row.querySelector('[data-field="outreached"]');
  const partnerInput = row.querySelector('[data-field="partner"]');
  const checkboxLabel = row.querySelector(".admin-checkbox span");
  const saveButton = row.querySelector("[data-save]");

  const partner = Math.max(0, Math.min(100, Number(partnerInput.value || 0)));
  partnerInput.value = String(partner);

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  try {
    await updateDoc(doc(db, "earlyAccessSignups", id), {
      outreached: outreachedInput.checked,
      partner,
    });

    const record = records.find((item) => item.id === id);
    if (record) {
      record.outreached = outreachedInput.checked;
      record.partner = partner;
    }

    checkboxLabel.textContent = outreachedInput.checked ? "Yes" : "No";
    status.textContent = "Record updated.";
    saveButton.textContent = "Saved";
    window.setTimeout(() => {
      saveButton.disabled = false;
      saveButton.textContent = "Save";
    }, 900);
  } catch (error) {
    status.textContent = "Update failed. Check Firestore rules.";
    saveButton.disabled = false;
    saveButton.textContent = "Save";
  }
}

async function saveContactRow(row) {
  const id = row.dataset.contactDocId;
  const statusInput = row.querySelector('[data-contact-field="status"]');
  const saveButton = row.querySelector("[data-contact-save]");

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  try {
    await updateDoc(doc(db, "contactMessages", id), {
      status: statusInput.value,
    });

    const record = contactRecords.find((item) => item.id === id);
    if (record) {
      record.status = statusInput.value;
    }

    contactStatus.textContent = "Contact message updated.";
    saveButton.textContent = "Saved";
    window.setTimeout(() => {
      saveButton.disabled = false;
      saveButton.textContent = "Save";
    }, 900);
  } catch (error) {
    contactStatus.textContent = "Contact message update failed. Check Firestore rules.";
    saveButton.disabled = false;
    saveButton.textContent = "Save";
  }
}

function exportCsv() {
  const header = ["email", "page", "createdAt", "source", "userAgent", "outreached", "partner"];
  const rows = records.map((record) => [
    record.email,
    record.page,
    formatTimestamp(record.createdAt),
    record.source,
    record.userAgent,
    record.outreached,
    record.partner ?? 0,
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `stompai-early-access-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportContactCsv() {
  const header = ["email", "message", "page", "createdAt", "userAgent", "status"];
  const rows = contactRecords.map((record) => [
    record.email,
    record.message,
    record.page,
    formatTimestamp(record.createdAt),
    record.userAgent,
    record.status || "new",
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `stompai-contact-messages-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

if (
  tbody &&
  status &&
  exportButton &&
  refreshButton &&
  contactTbody &&
  contactStatus &&
  contactExportButton &&
  contactRefreshButton &&
  signInButton &&
  signOutButton &&
  authStatus &&
  adminPanel
) {
  setSignedOutState("Sign in with your admin Google account to view signups.");

  tbody.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-save]");
    if (!saveButton) return;
    saveRow(saveButton.closest("tr"));
  });

  tbody.addEventListener("change", (event) => {
    const checkbox = event.target.closest('[data-field="outreached"]');
    if (!checkbox) return;
    const label = checkbox.closest(".admin-checkbox")?.querySelector("span");
    if (label) label.textContent = checkbox.checked ? "Yes" : "No";
  });

  contactTbody.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-contact-save]");
    if (!saveButton) return;
    saveContactRow(saveButton.closest("tr"));
  });

  exportButton.addEventListener("click", exportCsv);
  refreshButton.addEventListener("click", loadRecords);
  contactExportButton.addEventListener("click", exportContactCsv);
  contactRefreshButton.addEventListener("click", loadContactRecords);

  signInButton.addEventListener("click", async () => {
    authStatus.textContent = "Opening Google sign-in...";
    signInButton.disabled = true;
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      authStatus.textContent = `Sign-in failed: ${error.message || "Check Firebase Auth authorized domains."}`;
    } finally {
      signInButton.disabled = false;
    }
  });

  signOutButton.addEventListener("click", async () => {
    authStatus.textContent = "Signing out...";
    signOutButton.disabled = true;
    try {
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      authStatus.textContent = `Sign-out failed: ${error.message || "Try again."}`;
      signOutButton.disabled = false;
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setSignedOutState("Sign in with your admin Google account to view signups.");
      return;
    }

    if (!isAllowedAdmin(user)) {
      setSignedOutState(`Signed in as ${user.email}, but this account is not allowed.`);
      await signOut(auth);
      return;
    }

    setSignedInState(user);
    loadRecords();
    loadContactRecords();
  });
}
