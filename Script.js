// ==========================================================================
// CENTRAL CONFIGURATION & SESSION MANAGEMENT
// ==========================================================================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwc2JK78NBbIkKd8HeK03DA6Y0HxKVuHbtWuoAY6oK6YLstrKXFCEIdACGEmMLb_fgTXw/exec";

let userId = localStorage.getItem('user_id');
let username = localStorage.getItem('username');

// Shared API Fetch Wrapper
async function apiCall(payload) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return await response.json();
}

// Shared HTML Security Sanitizer
function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

// Helper to convert file input to Base64
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve({ base64: base64String, name: file.name, type: file.type });
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Global Application Router & Initialization
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'login.html';
  const isLoginPage = currentPage === 'login.html';

  // 1. Session Guard (Redirect if unauthenticated)
  if (!isLoginPage && !userId) {
    window.location.href = 'login.html';
    return;
  }

  // 2. Populate Header Badges
  const displayUserId = document.getElementById('displayUserId');
  const displayUsername = document.getElementById('displayUsername');
  if (displayUserId) displayUserId.textContent = userId || '...';
  if (displayUsername) displayUsername.textContent = username || '...';

  // 3. Attach Logout Action
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'index.html';
    });
  }

  // 4. Initialize Page Modules
  if (document.getElementById('loginForm')) initLogin();
  if (document.getElementById('issueForm')) initHome();
  if (document.getElementById('messagesList') && currentPage === 'inbox.html') initInbox();
  if (document.getElementById('updateForm')) initNewsPage();
  if (document.getElementById('reportsTable')) initAdmin();
});

// ==========================================================================
// 1. LOGIN PAGE LOGIC (login.html)
// ==========================================================================
function initLogin() {
  const form = document.getElementById('loginForm');
  const submitBtn = document.getElementById('submitBtn');
  const errorMsg = document.getElementById('errorMsg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userVal = document.getElementById('username').value.trim();
    const passVal = document.getElementById('password').value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Authenticating...';
    errorMsg.style.display = 'none';

    try {
      const result = await apiCall({ action: 'login', username: userVal, password: passVal });

      if (result.status === 'success') {
        localStorage.setItem('user_id', result.userId);
        localStorage.setItem('username', result.username);
        localStorage.setItem('full_name', result.fullName || result.username);
        window.location.href = 'home.html';
      } else {
        errorMsg.textContent = result.message || 'Invalid credentials.';
        errorMsg.style.display = 'block';
      }
    } catch (err) {
      errorMsg.textContent = 'Connection error. Please try again.';
      errorMsg.style.display = 'block';
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  });
}

// ==========================================================================
// 2. HOME PAGE LOGIC (home.html)
// ==========================================================================
function initHome() {
  const issueForm = document.getElementById('issueForm');
  const submitBtn = document.getElementById('submitBtn');
  const statusMsg = document.getElementById('statusMsg');
  const inboxBtn = document.getElementById('inboxBtn');
  const historyModal = document.getElementById('historyModal');
  const openHistoryBtn = document.getElementById('openHistoryBtn');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');

  // Drag & Drop File Handling UI
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const filePreview = document.getElementById('filePreview');
  const fileName = document.getElementById('fileName');
  const removeFileBtn = document.getElementById('removeFileBtn');

  if (inboxBtn) {
    inboxBtn.addEventListener('click', () => { window.location.href = 'inbox.html'; });
  }

  // Modal Handlers
  if (openHistoryBtn && historyModal) {
    openHistoryBtn.addEventListener('click', () => {
      historyModal.classList.add('active');
      fetchUserRecords();
    });
  }

  if (closeHistoryBtn && historyModal) {
    closeHistoryBtn.addEventListener('click', () => { historyModal.classList.remove('active'); });
    historyModal.addEventListener('click', (e) => {
      if (e.target === historyModal) historyModal.classList.remove('active');
    });
  }

  // File Upload Preview Listeners
  if (fileInput && dropZone) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        fileName.textContent = fileInput.files[0].name;
        filePreview.style.display = 'flex';
      }
    });

    if (removeFileBtn) {
      removeFileBtn.addEventListener('click', () => {
        fileInput.value = '';
        filePreview.style.display = 'none';
      });
    }
  }

  // Form Submission
  issueForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const location = document.getElementById('location').value.trim();
    const issue = document.getElementById('issue').value.trim();

    if (!location || !issue) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading & Submitting...';
    statusMsg.style.display = 'none';

    try {
      let fileData = null;
      if (fileInput && fileInput.files.length > 0) {
        fileData = await readFileAsBase64(fileInput.files[0]);
      }

      const result = await apiCall({
        action: 'saveData',
        userId: userId,
        username: username,
        location: location,
        issue: issue,
        fileData: fileData
      });

      if (result.status === 'success') {
        statusMsg.className = 'status-msg success';
        statusMsg.textContent = 'Report submitted successfully!';
        statusMsg.style.display = 'block';

        document.getElementById('location').value = '';
        document.getElementById('issue').value = '';
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.style.display = 'none';
      } else {
        statusMsg.className = 'status-msg error';
        statusMsg.textContent = result.message || 'Error submitting report.';
        statusMsg.style.display = 'block';
      }
    } catch (err) {
      statusMsg.className = 'status-msg error';
      statusMsg.textContent = 'Connection error. Please try again.';
      statusMsg.style.display = 'block';
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Issue';
    }
  });
}

async function fetchUserRecords() {
  const recordsList = document.getElementById('recordsList');
  const loadingHistory = document.getElementById('loadingHistory');
  if (!recordsList) return;

  loadingHistory.style.display = 'block';
  loadingHistory.textContent = 'Loading report history...';

  try {
    const result = await apiCall({ action: 'getData', userId: userId });
    loadingHistory.style.display = 'none';

    if (result.status === 'success' && result.records.length > 0) {
      recordsList.innerHTML = '';
      result.records.reverse().forEach(record => {
        const li = document.createElement('li');
        li.className = 'record-card';
        const attachmentHtml = record.fileUrl 
          ? `<div class="record-file">📎 Attachment: <a href="${escapeHtml(record.fileUrl)}" target="_blank" rel="noopener noreferrer">View File</a></div>` 
          : '';

        li.innerHTML = `
          <div class="record-header"><span>Timestamp: ${record.timestamp || 'N/A'}</span></div>
          <div class="record-location">Machine: ${escapeHtml(record.location)}</div>
          <div class="record-issue">Issue: ${escapeHtml(record.issue)}</div>
          ${attachmentHtml}
        `;
        recordsList.appendChild(li);
      });
    } else {
      recordsList.innerHTML = '<li style="color: #777; text-align: center; padding: 1rem;">No issues reported yet.</li>';
    }
  } catch (err) {
    loadingHistory.textContent = 'Failed to load report history.';
    console.error(err);
  }
}

// ==========================================================================
// 3. INBOX PAGE LOGIC (inbox.html)
// ==========================================================================
async function initInbox() {
  const messagesList = document.getElementById('messagesList');
  const loadingMsg = document.getElementById('loadingMsg');

  try {
    const result = await apiCall({ action: 'getInbox', userId: userId });
    if (loadingMsg) loadingMsg.style.display = 'none';

    if (result.status === 'success' && result.records.length > 0) {
      messagesList.innerHTML = '';
      result.records.reverse().forEach(msg => {
        const li = document.createElement('li');
        li.className = 'message-card';
        const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'N/A';

        li.innerHTML = `
          <div class="message-header">
            <span class="sender-tag">From: ${escapeHtml(msg.sender || 'Admin')}</span>
            <span class="time-tag">${timeStr}</span>
          </div>
          <div class="message-body">${escapeHtml(msg.message)}</div>
        `;
        messagesList.appendChild(li);
      });
    } else {
      messagesList.innerHTML = '<div class="empty-state">No messages received yet.</div>';
    }
  } catch (err) {
    if (loadingMsg) loadingMsg.textContent = 'Failed to load inbox messages.';
    console.error(err);
  }
}

// ==========================================================================
// 4. NEWS & UPDATES PAGE LOGIC (page.html)
// ==========================================================================
function initNewsPage() {
  const updateForm = document.getElementById('updateForm');
  const postBtn = document.getElementById('postBtn');
  const statusMsg = document.getElementById('statusMsg');

  fetchUpdatesFeed();

  updateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('updateTitle').value.trim();
    const content = document.getElementById('updateContent').value.trim();

    if (!title || !content) return;

    postBtn.disabled = true;
    postBtn.textContent = 'Publishing...';
    statusMsg.style.display = 'none';

    try {
      const result = await apiCall({
        action: 'postUpdate',
        title: title,
        content: content,
        sender: username || 'Admin'
      });

      if (result.status === 'success') {
        statusMsg.className = 'status-msg success';
        statusMsg.textContent = 'Announcement published successfully!';
        statusMsg.style.display = 'block';

        document.getElementById('updateTitle').value = '';
        document.getElementById('updateContent').value = '';
        fetchUpdatesFeed();
      } else {
        statusMsg.className = 'status-msg error';
        statusMsg.textContent = result.message || 'Error publishing update.';
        statusMsg.style.display = 'block';
      }
    } catch (err) {
      statusMsg.className = 'status-msg error';
      statusMsg.textContent = 'Connection error. Please try again.';
      statusMsg.style.display = 'block';
      console.error(err);
    } finally {
      postBtn.disabled = false;
      postBtn.textContent = 'Publish Announcement';
    }
  });
}

async function fetchUpdatesFeed() {
  const feedList = document.getElementById('feedList');
  const loadingFeed = document.getElementById('loadingFeed');
  if (!feedList) return;

  if (loadingFeed) loadingFeed.style.display = 'block';

  try {
    const result = await apiCall({ action: 'getUpdates' });
    if (loadingFeed) loadingFeed.style.display = 'none';

    if (result.status === 'success' && result.records.length > 0) {
      feedList.innerHTML = '';
      result.records.reverse().forEach(news => {
        const li = document.createElement('li');
        li.className = 'message-card';
        const timeStr = news.timestamp ? new Date(news.timestamp).toLocaleString() : 'N/A';

        li.innerHTML = `
          <div class="message-header">
            <span style="font-weight:700; font-size:1.1rem; color:var(--text-main, #111);">${escapeHtml(news.title)}</span>
            <span class="sender-tag">Posted by: ${escapeHtml(news.sender || 'Admin')}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted, #666); margin-bottom:0.75rem;">${timeStr}</div>
          <div class="message-body">${escapeHtml(news.content)}</div>
        `;
        feedList.appendChild(li);
      });
    } else {
      feedList.innerHTML = '<div class="empty-state">No news or updates posted yet.</div>';
    }
  } catch (err) {
    if (loadingFeed) loadingFeed.textContent = 'Failed to load updates feed.';
    console.error(err);
  }
}

// ==========================================================================
// 5. ADMIN DASHBOARD LOGIC (admin.html)
// ==========================================================================
let allAdminReports = [];
let selectedUserIdForMsg = "";

function initAdmin() {
  const refreshBtn = document.getElementById('refreshBtn');
  const searchInput = document.getElementById('searchInput');
  const msgModal = document.getElementById('msgModal');
  const closeMsgBtn = document.getElementById('closeMsgBtn');
  const msgForm = document.getElementById('msgForm');

  fetchAllReports();

  if (refreshBtn) refreshBtn.addEventListener('click', fetchAllReports);
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterReports(e.target.value.trim().toLowerCase());
    });
  }

  // Send Message Modal
  if (closeMsgBtn && msgModal) {
    closeMsgBtn.addEventListener('click', () => msgModal.classList.remove('active'));
  }

  if (msgForm) {
    msgForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sendBtn = document.getElementById('sendBtn');
      const msgText = document.getElementById('msgText').value.trim();

      if (!msgText || !selectedUserIdForMsg) return;

      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';

      try {
        const result = await apiCall({
          action: 'sendMessage',
          recipientUserId: selectedUserIdForMsg,
          message: msgText,
          sender: 'Admin'
        });

        if (result.status === 'success') {
          showAdminStatus(`Message sent to ${selectedUserIdForMsg}!`, 'success');
          msgModal.classList.remove('active');
        } else {
          showAdminStatus(result.message || 'Error sending message.', 'error');
        }
      } catch (err) {
        showAdminStatus('Connection error sending message.', 'error');
        console.error(err);
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Message';
      }
    });
  }
}

async function fetchAllReports() {
  const tbody = document.getElementById('reportsTableBody');
  const statusBanner = document.getElementById('statusBanner');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Loading submitted reports...</td></tr>';
  if (statusBanner) statusBanner.style.display = 'none';

  try {
    const result = await apiCall({ action: 'getAllData' });

    if (result.status === 'success') {
      allAdminReports = result.records.reverse();
      updateAdminStats(allAdminReports);
      renderReportsTable(allAdminReports);
    } else {
      showAdminStatus(result.message || 'Failed to fetch reports.', 'error');
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Error loading data.</td></tr>';
    }
  } catch (err) {
    showAdminStatus('Connection error. Please try again.', 'error');
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Connection error.</td></tr>';
    console.error(err);
  }
}

function renderReportsTable(records) {
  const tbody = document.getElementById('reportsTableBody');
  if (!tbody) return;

  if (!records || records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No submitted reports found.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  records.forEach(record => {
    const tr = document.createElement('tr');
    const attachmentHtml = record.fileUrl 
      ? `<a href="${escapeHtml(record.fileUrl)}" target="_blank" rel="noopener noreferrer" class="link-attachment">📎 View File</a>`
      : '<span style="color: #aaa;">None</span>';

    tr.innerHTML = `
      <td>
        <div class="user-chip">
          <span class="user-id-tag">${escapeHtml(record.userId)}</span>
          <span>${escapeHtml(record.username)}</span>
        </div>
      </td>
      <td>📍 <strong>${escapeHtml(record.location)}</strong></td>
      <td style="max-width: 250px; word-wrap: break-word;">${escapeHtml(record.issue)}</td>
      <td>${attachmentHtml}</td>
      <td style="color: #6c757d; font-size: 0.85rem;">${escapeHtml(record.timestamp || 'N/A')}</td>
      <td>
        <div class="action-btn-group">
          <button class="btn-msg" onclick="openMsgModal('${escapeHtml(record.userId)}')">💬 Message</button>
          <button class="btn-delete" onclick="deleteReport('${escapeHtml(record.timestamp)}', '${escapeHtml(record.userId)}', this)">🗑️ Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openMsgModal(userIdToMsg) {
  selectedUserIdForMsg = userIdToMsg;
  const recipientDisplay = document.getElementById('recipientDisplay');
  const msgText = document.getElementById('msgText');
  const msgModal = document.getElementById('msgModal');

  if (recipientDisplay) recipientDisplay.value = userIdToMsg;
  if (msgText) msgText.value = '';
  if (msgModal) msgModal.classList.add('active');
}

async function deleteReport(timestamp, userIdToDelete, btnElement) {
  if (!confirm(`Are you sure you want to delete the report from user ${userIdToDelete}?`)) return;

  btnElement.disabled = true;
  btnElement.textContent = 'Deleting...';

  try {
    const result = await apiCall({
      action: 'deleteData',
      timestamp: timestamp,
      userId: userIdToDelete
    });

    if (result.status === 'success') {
      showAdminStatus('Report deleted successfully!', 'success');
      fetchAllReports();
    } else {
      showAdminStatus(result.message || 'Error deleting report.', 'error');
      btnElement.disabled = false;
      btnElement.textContent = '🗑️ Delete';
    }
  } catch (err) {
    showAdminStatus('Connection error while deleting report.', 'error');
    btnElement.disabled = false;
    btnElement.textContent = '🗑️ Delete';
    console.error(err);
  }
}

function filterReports(query) {
  if (!query) {
    renderReportsTable(allAdminReports);
    return;
  }

  const filtered = allAdminReports.filter(r => 
    (r.userId && r.userId.toLowerCase().includes(query)) ||
    (r.username && r.username.toLowerCase().includes(query)) ||
    (r.location && r.location.toLowerCase().includes(query)) ||
    (r.issue && r.issue.toLowerCase().includes(query))
  );

  renderReportsTable(filtered);
}

function updateAdminStats(records) {
  const totalCount = document.getElementById('totalReportsCount');
  const uniqueCount = document.getElementById('uniqueUsersCount');

  if (totalCount) totalCount.textContent = records.length;
  if (uniqueCount) {
    const uniqueUsers = new Set(records.map(r => r.userId)).size;
    uniqueCount.textContent = uniqueUsers;
  }
}

function showAdminStatus(msg, type) {
  const banner = document.getElementById('statusBanner');
  if (!banner) return;
  banner.className = `status-banner ${type}`;
  banner.textContent = msg;
  banner.style.display = 'block';

  setTimeout(() => {
    banner.style.display = 'none';
  }, 4000);
}

// 3. Attach Logout Action (Supports header & navbar buttons)
document.querySelectorAll('.nav-logout-btn, #logoutBtn, .btn-logout').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = 'login.html';
  });
});

// Function to handle news posting and direct image rendering
function initNewsPage() {
  const updateForm = document.getElementById('updateForm');
  const postBtn = document.getElementById('postBtn');
  const statusMsg = document.getElementById('statusMsg');
  const updateImage = document.getElementById('updateImage');

  fetchUpdates();

  if (updateForm) {
    updateForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('updateTitle').value.trim();
      const content = document.getElementById('updateContent').value.trim();

      if (!title || !content) return;

      postBtn.disabled = true;
      postBtn.textContent = 'Publishing...';
      statusMsg.style.display = 'none';

      try {
        let fileData = null;
        if (updateImage && updateImage.files.length > 0) {
          fileData = await readFileAsBase64(updateImage.files[0]);
        }

        const result = await apiCall({
          action: 'postUpdate',
          title: title,
          content: content,
          sender: username || 'Admin',
          fileData: fileData
        });

        if (result.status === 'success') {
          statusMsg.className = 'status-msg success';
          statusMsg.textContent = 'Announcement published successfully!';
          statusMsg.style.display = 'block';

          document.getElementById('updateTitle').value = '';
          document.getElementById('updateContent').value = '';
          if (updateImage) updateImage.value = '';

          fetchUpdates();
        } else {
          statusMsg.className = 'status-msg error';
          statusMsg.textContent = result.message || 'Error publishing update.';
          statusMsg.style.display = 'block';
        }
      } catch (err) {
        statusMsg.className = 'status-msg error';
        statusMsg.textContent = 'Connection error. Please try again.';
        statusMsg.style.display = 'block';
        console.error(err);
      } finally {
        postBtn.disabled = false;
        postBtn.textContent = 'Publish Announcement';
      }
    });
  }
}

// Fetch and render news with direct image preview
async function fetchUpdates() {
  const feedList = document.getElementById('feedList');
  const loadingFeed = document.getElementById('loadingFeed');
  if (!feedList) return;

  if (loadingFeed) loadingFeed.style.display = 'block';

  try {
    const result = await apiCall({ action: 'getUpdates' });
    if (loadingFeed) loadingFeed.style.display = 'none';

    if (result.status === 'success' && result.records.length > 0) {
      feedList.innerHTML = '';
      result.records.reverse().forEach(news => {
        const li = document.createElement('li');
        li.className = 'message-card';

        const timeStr = news.timestamp ? new Date(news.timestamp).toLocaleString() : 'N/A';

        // Direct Image Tag Render
        const imageTag = news.imageUrl 
          ? `<img src="${escapeHtml(news.imageUrl)}" alt="Announcement Image" class="news-card-img" loading="lazy">` 
          : '';

        li.innerHTML = `
          <div class="message-header">
            <span style="font-weight:700; font-size:1.1rem; color:var(--text-main, #111);">${escapeHtml(news.title)}</span>
            <span class="sender-tag">Posted by: ${escapeHtml(news.sender || 'Admin')}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted, #666); margin-bottom:0.75rem;">📅 ${timeStr}</div>
          <div class="message-body">${escapeHtml(news.content)}</div>
          ${imageTag}
        `;
        feedList.appendChild(li);
      });
    } else {
      feedList.innerHTML = '<div class="empty-state">No news or updates posted yet.</div>';
    }
  } catch (err) {
    if (loadingFeed) loadingFeed.textContent = 'Failed to load updates feed.';
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('adminModal');
  const openBtn = document.getElementById('openModalBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');

  // Open Modal
  const openModal = () => {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Disable background scrolling
  };

  // Close Modal
  const closeModal = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Re-enable background scrolling
  };

  // Event Listeners
  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  // Close on Backdrop/Overlay Click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Close on Escape Key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
});



