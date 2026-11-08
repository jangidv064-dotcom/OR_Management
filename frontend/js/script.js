const createBtn = document.getElementById("createActivityBtn");
const modal = document.getElementById("activityModal");
const closeBtn = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelModal");
const form = document.getElementById("activityForm");
const table = document.getElementById("activityTable");
const totalActivities = document.getElementById("totalActivities");
const apiStatus = document.getElementById("apiStatus");
const formError = document.getElementById("formError");
const saveButton = document.getElementById("saveActivityBtn");

function setApiStatus(connected) {
    apiStatus.innerHTML = connected
        ? '<span class="status-dot"></span> API CONNECTED'
        : '<span class="status-dot offline"></span> API OFFLINE';
    apiStatus.classList.toggle("offline-status", !connected);
}

function openModal() {
    formError.textContent = "";
    modal.classList.add("show");
}

function closeModal() {
    modal.classList.remove("show");
    form.reset();
    formError.textContent = "";
}

function showEmptyState(message) {
    table.innerHTML = "";
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty-state";
    cell.textContent = message;
    row.appendChild(cell);
    table.appendChild(row);
}

function renderActivities(activities) {
    table.innerHTML = "";
    totalActivities.textContent = String(activities.length).padStart(2, "0");

    if (!activities.length) {
        showEmptyState("No activities yet. Create your first activity to get started.");
        return;
    }

    activities.forEach((activity) => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        const name = document.createElement("div");
        name.className = "activity-name";
        name.textContent = activity.activity_name;
        nameCell.appendChild(name);

        const routeCell = document.createElement("td");
        routeCell.textContent = activity.route_name;

        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        status.className = "status-badge draft";
        status.textContent = activity.status;
        statusCell.appendChild(status);

        const createdCell = document.createElement("td");
        createdCell.textContent = activity.created_at
            ? new Date(activity.created_at).toLocaleDateString()
            : "—";

        row.append(nameCell, routeCell, statusCell, createdCell);
        table.appendChild(row);
    });
}

async function loadActivities() {
    try {
        const response = await fetch("/api/activities");
        if (!response.ok) throw new Error("Could not load activities.");
        const activities = await response.json();
        setApiStatus(true);
        renderActivities(activities);
    } catch (error) {
        setApiStatus(false);
        totalActivities.textContent = "—";
        showEmptyState("Unable to load activities. Check that the Flask server and database are running.");
    }
}

createBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    formError.textContent = "";
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const payload = {
        activity_name: document.getElementById("activityName").value.trim(),
        route_name: document.getElementById("routeName").value.trim()
    };

    try {
        const response = await fetch("/api/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not save the activity.");
        }

        closeModal();
        await loadActivities();
    } catch (error) {
        formError.textContent = error.message;
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Create Activity";
    }
});

if (window.lucide) lucide.createIcons();
loadActivities();
