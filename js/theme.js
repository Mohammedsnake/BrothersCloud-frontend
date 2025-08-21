/* ============================
   theme.js
============================ */

const themeToggle = document.getElementById("modeToggle");

/* ============================
   APPLY THEME
============================ */
function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    if (themeToggle) themeToggle.textContent = "☀️"; // Sun icon to switch back
  } else {
    document.body.classList.remove("dark-mode");
    if (themeToggle) themeToggle.textContent = "🌙"; // Moon icon to switch
  }
  localStorage.setItem("theme", theme);
}

/* ============================
   AUTO-SELECT THEME
============================ */
function applySavedTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    // Auto select based on time (19:00–06:00 = dark)
    const hour = new Date().getHours();
    const defaultTheme = hour >= 19 || hour < 6 ? "dark" : "light";
    applyTheme(defaultTheme);
  }
}

/* ============================
   TOGGLE BUTTON
============================ */
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const newTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    applyTheme(newTheme);
  });
}

/* ============================
   SYNC ACROSS TABS
============================ */
window.addEventListener("storage", (e) => {
  if (e.key === "theme") {
    applyTheme(e.newValue);
  }
});

/* ============================
   INITIALIZE
============================ */
document.addEventListener("DOMContentLoaded", () => {
  applySavedTheme();
});
