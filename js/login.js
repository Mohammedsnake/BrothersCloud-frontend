// login.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const loginBtn = form.querySelector("button[type='submit']");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Collect input values
    const first_name = document.getElementById("first_name").value.trim();
    const middle_name = document.getElementById("middle_name").value.trim();
    const last_name = document.getElementById("last_name").value.trim();
    const password = document.getElementById("password").value.trim();

    // Basic validation
    if (!first_name || !last_name || !password) {
      alert("First name, last name, and password are required!");
      return;
    }

    // Show spinner on button
    loginBtn.classList.add("loading");
    loginBtn.disabled = true;

    try {
      const res = await fetch("https://brotherscloud-1.onrender.com/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ first_name, middle_name, last_name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Login failed");
        return;
      }

      // Save token in localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("user_id", data.user.user_id);

      alert("Login successful!");
      window.location.href = "dashboard.html"; // redirect after login
    } catch (err) {
      console.error("Error:", err);
      alert("Something went wrong. Please try again later.");
    } finally {
      // Hide spinner and enable button
      loginBtn.classList.remove("loading");
      loginBtn.disabled = false;
    }
  });
});
