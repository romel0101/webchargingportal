function startLogin(role, email) { 
  const authContainer = document.getElementById('authContainer'); 
  const authMessage = document.getElementById('authMessage'); 
  const spinner = document.getElementById('spinner'); 

  // ✅ Extract only the part before @
  const nameOnly = email.split("@")[0];

  authMessage.textContent = `Authenticating ${nameOnly}…`; 
  spinner.style.display = 'inline-block'; 
  authContainer.classList.add('show'); 

  setTimeout(() => { 
    authMessage.textContent = `Access granted. Welcome, ${nameOnly}!`; 
    spinner.style.display = 'none'; 
  }, 2000); 

  setTimeout(() => { 
    if (role === "student") {
      window.location.href = 'student_log.html'; 
    } else if (role === "faculty") {
      window.location.href = 'faculty_classlist.html'; 
    }
  }, 4000); 
}

// Detect role automatically based on filename (flexible)
function detectRole() {
  const path = window.location.pathname.toLowerCase();

  if (path.includes("student")) return "student";
  if (path.includes("faculty")) return "faculty";

  return null;
}

function setupLogin() {
  const role = detectRole();
  if (!role) {
    console.error("Role could not be detected from page name.");
    return;
  }

  const form = document.getElementById("loginForm");
  if (!form) {
    console.error("Form with id='loginForm' not found.");
    return;
  }

  form.addEventListener("submit", function(e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      alert("Please fill in both fields.");
      return;
    }

    startLogin(role, email);
  });
}

// Only initialize login if the login form exists on the page
// (prevents "Form with id='loginForm' not found." errors)
document.addEventListener("DOMContentLoaded", () => {
  // Initialize login only on pages that have the login form
  if (document.getElementById("loginForm")) {
    setupLogin();
  }

  setupLogout();
  setupApproveButtons();
  
  if (window.location.pathname.includes("faculty_classlist")) {
    updateClasslistDashboard();
  }
  
  startCountRefresh();
});

function setupLogout() {
  const logoutLink = document.getElementById("logoutLink");
  const confirmBtn = document.getElementById("confirmLogout");

  if (!logoutLink || !confirmBtn) return;

  // Intercept link click
  logoutLink.addEventListener("click", function(e) {
    e.preventDefault(); // stop immediate redirect

    // Show Bootstrap modal
    const modal = new bootstrap.Modal(document.getElementById("logoutModal"));
    modal.show();
  });

  // Confirm logout
  confirmBtn.addEventListener("click", function() {
    // ✅ Redirect to the link's href after confirmation
    window.location.href = logoutLink.getAttribute("href");
  });
}

function setupApproveButtons() {
  const approveButtons = document.querySelectorAll(".approveBtn");
  const classId = getClassId();

  approveButtons.forEach((btn, index) => {
    const key = classId ? `approve_${classId}_${index}` : `approve_${index}`;

    const savedState = localStorage.getItem(key);
    if (savedState === "approved") {
      btn.textContent = "Approved";
      btn.classList.remove("btn-success");
      btn.classList.add("btn-secondary");
      btn.disabled = true;

      const row = btn.closest("tr");
      const statusCell = row ? (row.querySelector(".status-cell") || row.querySelector(".status")) : null;
      if (statusCell) statusCell.textContent = "Done";
    }

    btn.addEventListener("click", function() {
      btn.textContent = "Approved";
      btn.classList.remove("btn-success");
      btn.classList.add("btn-secondary");
      btn.disabled = true;

      const row = btn.closest("tr");
      const statusCell = row ? (row.querySelector(".status-cell") || row.querySelector(".status")) : null;
      if (statusCell) statusCell.textContent = "Done";

      localStorage.setItem(key, "approved");
      updateApprovalCount();
    });
  });

  updateApprovalCount();
}

function updateApprovalCount() {
  const classId = getClassId();
  const approveButtons = document.querySelectorAll(".approveBtn");
  const totalCount = approveButtons.length;

  let approvedCount = 0;
  if (classId) {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(`approve_${classId}_`)) {
        if (localStorage.getItem(k) === "approved") approvedCount++;
      }
    }
  } else {
    approvedCount = document.querySelectorAll(".approveBtn:disabled").length;
  }

  const usedTotal = totalCount > 0 ? totalCount : (localStorage.getItem(`classTotal_${classId}`) ? parseInt(localStorage.getItem(`classTotal_${classId}`), 10) : 0);

  if (classId) {
    const countData = `${approvedCount}/${usedTotal || totalCount || 0}`;
    localStorage.setItem(`classApproval_${classId}`, countData);
    if (usedTotal) localStorage.setItem(`classTotal_${classId}`, `${usedTotal}`);

    if (usedTotal > 0 && approvedCount >= usedTotal) {
      updateDashboardStatus(classId, "Done");
    }

    updateClearancePageCount(classId, countData);
  }
}

function updateClearancePageCount(classId, countData) {
  const countCell = document.querySelector(`.approval-count[data-class-id="${classId}"]`);
  if (countCell) {
    countCell.textContent = countData;
  }
}

function getClassId() {
  const path = window.location.pathname.toLowerCase();
  const match = path.match(/faculty_(\d+)\.html/);
  if (match) return String(parseInt(match[1], 10));
  return null;
}

function updateDashboardStatus(classId, status) {
  localStorage.setItem(`classStatus_${classId}`, status);
}

function updateClasslistDashboard() {
  const rows = document.querySelectorAll("tbody tr");

  rows.forEach((row) => {
    const idCell = row.querySelector("td:first-child");
    let statusCell = row.querySelector(".status-cell");
    if (!statusCell) statusCell = row.querySelector(".td-red, .td-green, .status");

    if (!idCell || !statusCell) return;

    const rawId = idCell.textContent.trim();
    const classId = rawId ? String(parseInt(rawId, 10)) : null;
    if (!classId) return;

    const savedStatus = localStorage.getItem(`classStatus_${classId}`);

    // Only show Pending or Done
    if (savedStatus === "Done") {
      statusCell.textContent = "Done";
      statusCell.classList.remove("td-red");
      statusCell.classList.add("td-green");
    } else {
      statusCell.textContent = "Pending";
      statusCell.classList.remove("td-green");
      statusCell.classList.add("td-red");
    }
  });
}

// Refresh dashboard/clearance counts every 1 second
function startCountRefresh() {
  setInterval(() => {
    // If on classlist page, refresh counts
    if (window.location.pathname.includes("faculty_classlist")) {
      updateClasslistDashboard();
    }
    // If on clearance page, refresh approval counts
    else if (window.location.pathname.includes("faculty_class_clearance")) {
      const countCells = document.querySelectorAll(".approval-count");
      countCells.forEach(cell => {
        const classId = cell.getAttribute("data-class-id");
        const countData = localStorage.getItem(`classApproval_${classId}`);
        if (countData) {
          cell.textContent = countData;
        }
      });
    }
  }, 1000);
}