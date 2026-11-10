
// ==========================================
// OPEN RAILS ACT MANAGER - ADMIN PANEL
// ==========================================

const adminApi = "/api/admin";


// ==========================================
// API REQUEST
// ==========================================

async function adminRequest(url, options = {}) {

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            "Something went wrong."
        );
    }

    return data;
}


// ==========================================
// HTML ESCAPING
// ==========================================

function adminEscape(value = "") {

    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

}


// ==========================================
// ADMIN MESSAGE
// ==========================================

function showAdminMessage(message, type = "success") {

    const element = document.getElementById("adminMessage");

    if (!element) return;

    element.textContent = message;
    element.className = `admin-message ${type}`;
    element.hidden = false;

}


// ==========================================
// LOAD PENDING REQUESTS
// ==========================================

async function loadAdminRequests() {

    const list = document.getElementById("adminRequestsList");
    const count = document.getElementById("pendingRequestCount");

    if (!list || !count) return;

    list.innerHTML = `
        <div class="empty-panel">
            <p>Loading registration requests...</p>
        </div>
    `;

    try {

        const data = await adminRequest(
            `${adminApi}/requests`
        );

        const requests = Array.isArray(data)
            ? data
            : data.requests || [];

        count.textContent = String(requests.length).padStart(2, "0");

        renderAdminRequests(requests);

    } catch (error) {

        console.error("Admin request loading failed:", error);

        list.innerHTML = `
            <div class="empty-panel">
                <h3>Unable to load requests</h3>
                <p>${adminEscape(error.message)}</p>
            </div>
        `;

        count.textContent = "--";

    }

}


// ==========================================
// RENDER REQUEST CARDS
// ==========================================

function renderAdminRequests(requests) {

    const list = document.getElementById("adminRequestsList");

    if (!requests.length) {

        list.innerHTML = `
            <div class="empty-panel">
                <i data-lucide="check-circle-2"></i>
                <h3>No Pending Requests</h3>
                <p>All registration requests have been reviewed.</p>
            </div>
        `;

        refreshAdminIcons();
        return;

    }

    list.innerHTML = requests.map(user => {

        const userId = Number(user.id);

        return `
            <article class="admin-request-card">

                <div class="admin-request-icon">
                    <i data-lucide="user-round"></i>
                </div>

                <div class="admin-request-details">

                    <h3>
                        ${adminEscape(user.name || "Unnamed User")}
                    </h3>

                    <p>
                        ${adminEscape(user.email || "No email")}
                    </p>

                    <span class="admin-request-status">
                        PENDING APPROVAL
                    </span>

                </div>

                <div class="admin-request-actions">

                    <button
                        type="button"
                        class="primary-button admin-approve-button"
                        data-admin-action="approve"
                        data-user-id="${userId}"
                    >
                        <i data-lucide="check"></i>
                        Approve
                    </button>

                    <button
                        type="button"
                        class="secondary-button admin-reject-button"
                        data-admin-action="reject"
                        data-user-id="${userId}"
                    >
                        <i data-lucide="x"></i>
                        Reject
                    </button>

                </div>

            </article>
        `;

    }).join("");

    refreshAdminIcons();

}


// ==========================================
// APPROVE / REJECT USER
// ==========================================

async function updateUserApproval(userId, action, button) {

    const actionName = action === "approve"
        ? "approve"
        : "reject";

    const confirmed = confirm(
        action === "approve"
            ? "Are you sure you want to approve this account?"
            : "Are you sure you want to reject this registration?"
    );

    if (!confirmed) return;

    const card = button.closest(".admin-request-card");

    const buttons = card.querySelectorAll("button");

    buttons.forEach(item => {
        item.disabled = true;
    });

    button.textContent = action === "approve"
        ? "Approving..."
        : "Rejecting...";

    try {

        const data = await adminRequest(
            `${adminApi}/users/${userId}/${actionName}`,
            {
                method: "POST",
                body: JSON.stringify({})
            }
        );

        let message = data.message ||
            `Account ${actionName}d successfully.`;

        if (data.email_sent === true) {

            message += " Notification email sent.";

        } else if (data.email_sent === false) {

            message += " However, the notification email could not be sent.";

        }

        showAdminMessage(
            message,
            "success"
        );

        await loadAdminRequests();

    } catch (error) {

        console.error("Account approval update failed:", error);

        showAdminMessage(
            error.message,
            "error"
        );

        buttons.forEach(item => {
            item.disabled = false;
        });

        button.textContent = action === "approve"
            ? "Approve"
            : "Reject";

    }

}


// ==========================================
// BUTTON EVENTS
// ==========================================

document.addEventListener("click", event => {

    const actionButton = event.target.closest(
        "[data-admin-action]"
    );

    if (!actionButton) return;

    const userId = actionButton.dataset.userId;
    const action = actionButton.dataset.adminAction;

    if (!userId || !["approve", "reject"].includes(action)) {
        return;
    }

    updateUserApproval(
        userId,
        action,
        actionButton
    );

});


// ==========================================
// REFRESH BUTTON
// ==========================================

const refreshRequestsButton = document.getElementById(
    "refreshRequestsBtn"
);

if (refreshRequestsButton) {

    refreshRequestsButton.addEventListener("click", () => {

        loadAdminRequests();

    });

}


// ==========================================
// ADMIN NAVIGATION
// ==========================================

function initializeAdminPanel(user) {
    const adminNavLink = document.getElementById("adminNavLink");

    if (!adminNavLink) return;

    const isAdmin =
        user &&
        user.is_admin === true &&
        user.email &&
        user.email.toLowerCase() === "jangidv064@gmail.com";

    adminNavLink.hidden = !isAdmin;
}
// ==========================================
// VIEW NAVIGATION SUPPORT
// ==========================================

function openAdminPanel() {

    if (!window.currentUser || window.currentUser.is_admin !== true) {
        return;
    }

    loadAdminRequests();

}


// ==========================================
// ICONS
// ==========================================

function refreshAdminIcons() {

    if (window.lucide) {
        window.lucide.createIcons();
    }

}
