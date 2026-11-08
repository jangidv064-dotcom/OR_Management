
const createBtn = document.getElementById("createActivityBtn");
const modal = document.getElementById("activityModal");
const closeBtn = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelModal");
const form = document.getElementById("activityForm");
const table = document.getElementById("activityTable");

let activityCount = 3;

// Open modal
createBtn.addEventListener("click", () => {
    modal.classList.add("show");
});

// Close modal
function closeModal() {
    modal.classList.remove("show");
    form.reset();
}

closeBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

// Close when clicking outside
modal.addEventListener("click", (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// Create activity
form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("activityName").value.trim();
    const route = document.getElementById("routeName").value.trim();
    const player = document.getElementById("playerTrain").value.trim();

    if (!name || !route || !player) {
        alert("Please fill all fields.");
        return;
    }

    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    const activityName = document.createElement("div");
    activityName.className = "activity-name";
    activityName.textContent = name;

    const activitySub = document.createElement("div");
    activitySub.className = "activity-sub";
    activitySub.textContent = player;

    nameCell.append(activityName, activitySub);

    const routeCell = document.createElement("td");
    routeCell.textContent = route;

    const playerCell = document.createElement("td");
    playerCell.textContent = "1";

    const aiCell = document.createElement("td");
    aiCell.textContent = "00";

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "status-badge draft";
    badge.textContent = "Draft";
    statusCell.appendChild(badge);

    const actionCell = document.createElement("td");

    row.append(
        nameCell,
        routeCell,
        playerCell,
        aiCell,
        statusCell,
        actionCell
    );

    table.prepend(row);

    activityCount++;

    document.getElementById("totalActivities").textContent =
        String(activityCount).padStart(2, "0");

    closeModal();
});

// Initialize icons
if (window.lucide) {
    lucide.createIcons();
}
