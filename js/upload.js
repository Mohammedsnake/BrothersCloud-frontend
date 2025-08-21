/* ============================
   Upload Page JS
============================ */

// DOM Elements
const uploadType = document.getElementById('uploadType');
const fileGroup = document.querySelector('.file-group');
const fileInput = document.getElementById('fileInput');
const eventGroup = document.querySelector('.event-group');
const backBtn = document.getElementById('backBtn');
const uploadForm = document.getElementById('uploadForm');
const messageDiv = document.getElementById('message');
const eventsList = document.getElementById('eventsList'); // container for events

// Allowed file extensions
const allowedExtensions = {
  image: ['jpg','jpeg','png','gif','webp'],
  document: ['pdf','doc','docx'],
  video: ['mp4','mkv','avi','webm']
};

/* ============================
   SHOW/HIDE INPUT FIELDS
============================ */
uploadType.addEventListener('change', () => {
  const type = uploadType.value;
  if (type === 'event') {
    fileGroup.style.display = 'none';
    eventGroup.style.display = 'block';
    fileInput.value = '';
  } else {
    fileGroup.style.display = 'block';
    eventGroup.style.display = 'none';
    fileInput.value = '';
    fileInput.setAttribute('accept', allowedExtensions[type]?.map(ext => '.' + ext).join(',') || '');
  }
});

/* ============================
   NAVIGATION
============================ */
backBtn.addEventListener('click', () => {
  window.location.href = 'dashboard.html';
});

/* ============================
   LOAD USER EVENTS
============================ */
async function loadEvents() {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('user_id');

  if (!token || !userId) {
    eventsList.innerHTML = '<p>User not authenticated. Please log in.</p>';
    return;
  }

  try {
    const res = await fetch(`https://brotherscloud-1.onrender.com/api/events?user_id=${userId}`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (res.ok) {
      if (data.length === 0) {
        eventsList.innerHTML = '<p>No events yet.</p>';
        return;
      }
      eventsList.innerHTML = data.map(ev => `
        <div class="event-item">
          <strong>${ev.event_name}</strong> (${ev.event_date})
          <p>${ev.event_description || ''}</p>
          <small>Repetition: ${ev.repetition}</small>
        </div>
      `).join('');
    } else {
      eventsList.innerHTML = `<p>Error loading events: ${data.message || 'Unknown error'}</p>`;
    }
  } catch (err) {
    console.error(err);
    eventsList.innerHTML = '<p>Server error while loading events.</p>';
  }
}

/* ============================
   INITIALIZATION
============================ */
document.addEventListener('DOMContentLoaded', () => {
  loadEvents();      // Load user events

  // Initialize Flatpickr for event date
  flatpickr("#eventDate", {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "F j, Y",
    minDate: "today",
    allowInput: true
  });
});

/* ============================
   UPLOAD FORM SUBMISSION
============================ */
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  messageDiv.textContent = '';

  const type = uploadType.value;
  const itemName = document.getElementById('itemName').value.trim();
  const itemDesc = document.getElementById('itemDesc').value.trim();
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('user_id');

  if (!token || !userId) {
    messageDiv.textContent = 'User not authenticated. Please log in.';
    return;
  }

  if (!type || !itemName) {
    messageDiv.textContent = 'Please fill all required fields.';
    return;
  }

  try {
    let res, data;

    if (type === 'event') {
      const eventDate = document.getElementById('eventDate').value;
      const eventRepetition = document.getElementById('eventRepetition').value;

      if (!eventDate) {
        messageDiv.textContent = 'Please select a date for the event.';
        return;
      }

      res = await fetch('https://brotherscloud-1.onrender.com/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          user_id: userId,
          event_name: itemName,
          event_description: itemDesc,
          event_date: eventDate,
          repetition: eventRepetition
        })
      });

    } else {
      const file = fileInput.files[0];
      if (!file) {
        messageDiv.textContent = 'Please select a file.';
        return;
      }

      const ext = file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions[type].includes(ext)) {
        messageDiv.textContent = `Invalid file type. Allowed: ${allowedExtensions[type].join(', ')}`;
        return;
      }

      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('file_type', type);
      formData.append('file_name', itemName);
      formData.append('file_description', itemDesc);
      formData.append('file', file);

      res = await fetch('https://brotherscloud-1.onrender.com/api/files', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });
    }

    data = await res.json();

    if (res.ok) {
      messageDiv.textContent = 'Upload successful!';
      uploadForm.reset();
      fileGroup.style.display = 'block';
      eventGroup.style.display = 'none';
      if (type === 'event') loadEvents(); // Refresh events
    } else {
      messageDiv.textContent = data.message || 'Upload failed';
    }

  } catch (err) {
    console.error(err);
    messageDiv.textContent = 'Server error';
  }
});
