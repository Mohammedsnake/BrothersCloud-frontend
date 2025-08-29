const API_BASE = "https://brotherscloud-1.onrender.com/api";

/* ===========================
   Utility Functions
=========================== */
const utils = {
  showToast: (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }, 100);
  },

  handleError: (error) => {
    console.error("Error:", error);
    utils.showToast(
      error.message || error.error || "An error occurred",
      "error"
    );
  },

  formatDate: (dateString) => {
    if (!dateString) return "Unknown Date";
    const date = new Date(dateString);
    return isNaN(date)
      ? "Unknown Date"
      : date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  },

  showLoader: () => {
    let loader = document.getElementById("loader");
    if (!loader) {
      loader = document.createElement("div");
      loader.id = "loader";
      loader.innerHTML = `<div class="spinner"></div>`;
      document.body.appendChild(loader);
    }
    loader.style.display = "flex";
  },

  hideLoader: () => {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "none";
  },
};

/* ===========================
   Dashboard Class
=========================== */
class Dashboard {
  constructor() {
    this.user = JSON.parse(localStorage.getItem("user"));
    this.token = localStorage.getItem("token");
    this.currentType = "images";
    this.allData = [];
    this.events = [];

    this.init();
  }

  async init() {
    if (!this.user || !this.token) {
      window.location.href = "index.html";
      return;
    }

    this.cacheElements();
    this.setupEventListeners();
    this.displayUserInfo();
    await this.loadData(this.currentType);
    await this.loadBirthdays(); // 🎂 Birthday reminder
  }

  cacheElements() {
    this.elements = {
      content: document.getElementById("content"),
      menuButtons: document.querySelectorAll(".menu-btn"),
      searchInput: document.getElementById("searchInput"),
      uploadBtn: document.getElementById("uploadBtn"),
      userName: document.getElementById("userName"),
      logoutBtn: document.getElementById("logoutBtn"),
      birthdayBox: document.getElementById("birthdayBox"), // 🎂 Added
    };
  }

  setupEventListeners() {
    this.elements.menuButtons.forEach((btn) =>
      btn.addEventListener("click", () => this.handleMenuClick(btn))
    );

    this.elements.searchInput.addEventListener("input", () =>
      this.handleSearch()
    );

    this.elements.uploadBtn.addEventListener(
      "click",
      () => (window.location.href = "upload.html")
    );

    this.elements.logoutBtn.addEventListener("click", this.logout);
  }

  displayUserInfo() {
    this.elements.userName.textContent = `${this.user.first_name} ${this.user.last_name}`;
  }

  logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
  };

  async loadData(type) {
    try {
      utils.showLoader();
      const url =
        type === "calendar"
          ? `${API_BASE}/events?user_id=${this.user.user_id}`
          : `${API_BASE}/files?file_type=${type.slice(0, -1)}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.allData = await response.json();

      if (type === "calendar") {
        this.events = this.allData;
        this.setupEventNotifications();
        this.checkTodayEvents();
      }

      this.renderContent(this.allData, type);
    } catch (error) {
      utils.handleError(error);
      this.elements.content.innerHTML = `
        <div class="error-state">
          <i class="icon-error"></i>
          <p>Failed to load data. Please try again later.</p>
        </div>
      `;
    } finally {
      utils.hideLoader();
    }
  }

  renderContent(data, type) {
    if (!data || data.length === 0) {
      this.elements.content.innerHTML = `
        <div class="empty-state">
          <i class="icon-empty"></i>
          <p>No ${type} found. Click the upload button to add some!</p>
        </div>
      `;
      return;
    }

    this.elements.content.innerHTML =
      type === "calendar"
        ? this.renderEvents(data)
        : this.renderFiles(data, type);

    if (type !== "calendar") this.setupFileInteractions();
  }

  /* ===========================
     Calendar
  =========================== */
  renderEvents(events) {
    return `
      <ul class="event-list">
        ${events
          .map(
            (event) => `
          <li>
            <div class="event-date">${utils.formatDate(event.event_date)}</div>
            <div class="event-content">
              <h3 class="event-title">${event.event_name}</h3>
              ${
                event.event_description
                  ? `<p class="event-description">${event.event_description}</p>`
                  : ""
              }
              ${
                event.repetition === "yearly"
                  ? '<span class="event-recurring">Recurring</span>'
                  : ""
              }
            </div>
          </li>
        `
          )
          .join("")}
      </ul>
    `;
  }

  setupEventNotifications() {
    if (!("Notification" in window)) return;

    Notification.requestPermission().then((permission) => {
      if (permission !== "granted") return;

      const checkNotifications = () => {
        const now = new Date();
        this.events.forEach(async (ev) => {
          const eventDate = new Date(ev.event_date);
          const diffDays = Math.ceil(
            (eventDate - now) / (1000 * 60 * 60 * 24)
          );

          if (diffDays === 3 && !ev.notified_before) {
            new Notification(`Upcoming Event: ${ev.event_name}`, {
              body: `Event in 3 days: ${
                ev.event_description || "No description"
              }`,
            });

            try {
              await fetch(`${API_BASE}/events/${ev.event_id}/notify-before`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${this.token}` },
              });
              ev.notified_before = true;
            } catch (err) {
              console.error("Notify-before patch error:", err);
            }
          }
        });
      };

      checkNotifications();
      setInterval(checkNotifications, 3600000);
    });
  }

  checkTodayEvents() {
    if (!("Notification" in window)) return;

    Notification.requestPermission().then((permission) => {
      if (permission !== "granted") return;

      const now = new Date();
      this.events.forEach((ev) => {
        const eventDate = new Date(ev.event_date);
        if (
          eventDate.toDateString() === now.toDateString() &&
          !ev.notified_today
        ) {
          new Notification(`Today's Event: ${ev.event_name}`, {
            body: ev.event_description || "No description",
          });
          ev.notified_today = true;
        }
      });
    });
  }

  /* ===========================
     Birthdays 🎂
  =========================== */
  async loadBirthdays() {
    try {
      const response = await fetch(`${API_BASE}/birthdays`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch birthdays");

      const data = await response.json();
      const birthdays = Array.isArray(data) ? data : data.birthdays || [];

      if (birthdays.length > 0) {
        this.elements.birthdayBox.style.display = "block"; // show the box
        this.elements.birthdayBox.innerHTML = `
          <h3>🎂 Upcoming Birthdays</h3>
          <ul>
            ${birthdays
              .map((u) => {
                const dob = new Date(u.date_of_birth);
                const now = new Date();
                dob.setFullYear(now.getFullYear());

                const diffDays = Math.ceil(
                  (dob - now) / (1000 * 60 * 60 * 24)
                );

                return `<li>🎉 ${u.first_name} ${u.last_name}'s birthday is in ${diffDays} day(s) — (${utils.formatDate(
                  u.date_of_birth
                )})</li>`;
              })
              .join("")}
          </ul>
        `;
      } else {
        this.elements.birthdayBox.style.display = "none";
      }
    } catch (err) {
      console.error("Birthday fetch error:", err);
    }
  }

  /* ===========================
     Files
  =========================== */
  renderFiles(files, type) {
    return `
      <div class="file-grid">
        ${files
          .map((file) => {
            const viewUrl = file.view_url || file.cloudinary_url || "#";
            const downloadUrl =
              file.download_url ||
              this.makeAttachmentUrl(viewUrl, file.file_name);

            const ext = (file.file_name || "unknown")
              .split(".")
              .pop()
              .toLowerCase();
            let normalizedType = (file.file_type || "document").toLowerCase();

            let previewContent = "";
            if (normalizedType === "image") {
              previewContent = `<img src="${viewUrl}" alt="${file.file_name}" loading="lazy">`;
            } else if (normalizedType === "video") {
              previewContent = `<video src="${viewUrl}" controls muted></video>`;
            } else if (ext === "pdf") {
              previewContent = `<div class="file-icon pdf"></div>`;
            } else {
              previewContent = `<div class="file-icon ${this.getDocumentIconClass(
                ext
              )}"></div>`;
            }

            return `
              <div class="file-card"
                   data-view="${viewUrl}"
                   data-download="${downloadUrl}"
                   data-type="${normalizedType}"
                   data-ext="${ext}"
                   data-name="${file.file_name}">
                <div class="file-preview">${previewContent}</div>
                <div class="file-info">
                  <div class="file-name" title="${file.file_name}">${file.file_name}</div>
                  <div class="file-meta">
                    <span class="file-size">${this.formatFileSize(
                      file.file_size
                    )}</span>
                    <span class="file-date">${
                      file.uploaded_at
                        ? utils.formatDate(file.uploaded_at)
                        : ""
                    }</span>
                  </div>
                  <div class="file-actions">
                    <button class="btn-download" data-url="${downloadUrl}" data-ext="${ext}"><i class="icon-download"></i></button>
                    <button class="btn-share" data-url="${viewUrl}" data-name="${file.file_name}"><i class="icon-share"></i></button>
                  </div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  makeAttachmentUrl(viewUrl, fileName = "file") {
    try {
      const url = new URL(viewUrl);
      const parts = url.pathname.split("/");
      const uploadIdx = parts.findIndex((p) => p === "upload");
      if (uploadIdx !== -1) {
        const safe = fileName.replace(/[^\w.\-()\s]/g, "_") || "file";
        parts.splice(uploadIdx + 1, 0, `fl_attachment:${safe}`);
        url.pathname = parts.join("/");
        return url.toString();
      }
    } catch (_) {}
    return viewUrl;
  }

  getDocumentIconClass(ext) {
    const iconMap = {
      pdf: "pdf",
      doc: "word",
      docx: "word",
      xls: "excel",
      xlsx: "excel",
      ppt: "powerpoint",
      pptx: "powerpoint",
      txt: "text",
    };
    return iconMap[ext] || "file";
  }

  formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  setupFileInteractions() {
    document.querySelectorAll(".file-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (!e.target.closest(".file-actions")) {
          this.openModal(
            card.dataset.view,
            card.dataset.download,
            card.dataset.type,
            card.dataset.name,
            card.dataset.ext
          );
        }
      });
    });

    document.querySelectorAll(".btn-download").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.downloadFile(btn.dataset.url, btn.dataset.ext);
      });
    });

    document.querySelectorAll(".btn-share").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.shareFile(btn.dataset.url, btn.dataset.name);
      });
    });
  }

  downloadFile(url, ext = "") {
    const restrictedExts = [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
    ];

    if (restrictedExts.includes(ext.toLowerCase())) {
      utils.showToast(
        "Samahani 🙏🏽 Kwa sasa huwezi kudownload faili za PDF, Word au Excel. Huduma hii itapatikana hivi karibuni. Unaweza bado kutuma mafile hayo, na yatabaki salama kabisa ✔️",
        "error"
      );
      return;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = url.split("/").pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    utils.showToast("Download started 📥", "success");
  }

  async shareFile(url, name) {
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
      } else {
        await navigator.clipboard.writeText(url);
        utils.showToast("Link copied to clipboard");
      }
    } catch (err) {
      if (err.name !== "AbortError") utils.handleError(err);
    }
  }

  openModal(viewUrl, downloadUrl, type, name = "", ext = "") {
    const modal = document.createElement("div");
    modal.className = "modal";

    let bodyContent = "";

    if (type === "image") {
      bodyContent = `<img src="${viewUrl}" alt="${name}">`;
    } else if (type === "video") {
      bodyContent = `<video src="${viewUrl}" controls autoplay></video>`;
    } else if (ext === "pdf") {
      bodyContent = `<iframe src="${viewUrl}" width="100%" height="600px" style="border:none;"></iframe>`;
    } else if (
      ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)
    ) {
      const gview = `https://docs.google.com/gview?url=${encodeURIComponent(
        viewUrl
      )}&embedded=true`;
      bodyContent = `<iframe src="${gview}" width="100%" height="600px" style="border:none;"></iframe>`;
    } else {
      bodyContent = `<div class="file-icon ${this.getDocumentIconClass(
        ext
      )}"></div>
        <p>Cannot preview this file.</p>`;
    }

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${name}</h3>
          <button class="btn-close">&times;</button>
        </div>
        <div class="modal-body">${bodyContent}</div>
        <div class="modal-footer">
          <button class="btn btn-download"><i class="icon-download"></i> Download</button>
          <button class="btn btn-share"><i class="icon-share"></i> Share</button>
        </div>
      </div>
    `;

    modal
      .querySelector(".btn-close")
      .addEventListener("click", () => modal.remove());

    modal
      .querySelector(".btn-download")
      .addEventListener("click", () =>
        this.downloadFile(downloadUrl, ext)
      );
    modal
      .querySelector(".btn-share")
      .addEventListener("click", () => this.shareFile(viewUrl, name));

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    document.addEventListener("keydown", function escListener(e) {
      if (e.key === "Escape") {
        modal.remove();
        document.removeEventListener("keydown", escListener);
      }
    });

    document.body.appendChild(modal);
  }

  /* ===========================
     Navigation + Search
  =========================== */
  handleMenuClick(btn) {
    this.elements.menuButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    this.currentType = btn.dataset.type;
    this.loadData(this.currentType);
  }

  handleSearch() {
    const query = this.elements.searchInput.value.toLowerCase();
    const filtered = this.allData.filter((item) => {
      if (this.currentType === "calendar") {
        return (
          item.event_name.toLowerCase().includes(query) ||
          (item.event_description &&
            item.event_description.toLowerCase().includes(query))
        );
      }
      return item.file_name.toLowerCase().includes(query);
    });
    this.renderContent(filtered, this.currentType);
  }
}

/* ===========================
   Initialize Dashboard
=========================== */
document.addEventListener("DOMContentLoaded", () => {
  new Dashboard();
});
