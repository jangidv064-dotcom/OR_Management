
const API_URL = "/api/activities";

const views = {
    dashboard: document.getElementById("dashboardView"),
    activities: document.getElementById("activitiesView"),
    builder: document.getElementById("builderView")
};

let activities = [];
let editingId = null;
let sectionCounter = 0;


// ==========================================
// API AND HELPERS
// ==========================================

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}


async function loadActivities() {
    try {
        activities = await apiRequest(API_URL);
        renderLists();
    } catch (error) {
        console.error("Could not load activities:", error);

        alert(
            "Could not connect to the backend.\n" +
            "Make sure Flask is running at http://127.0.0.1:5000"
        );
    }
}


function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}


// ==========================================
// NAVIGATION
// ==========================================

function showView(name) {
    Object.entries(views).forEach(([key, element]) => {
        if (element) {
            element.classList.toggle("active", key === name);
        }
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.view === name);
    });

    const labels = {
        dashboard: "Dashboard",
        activities: "My Activities",
        builder: editingId ? "Edit Activity" : "Activity Builder"
    };

    document.getElementById("pageTitle").textContent =
        labels[name] || "Dashboard";

    document.getElementById("breadcrumbLabel").textContent =
        (labels[name] || "Dashboard").toUpperCase();

    if (name !== "builder") {
        renderLists();
    }

    refreshIcons();
}


// ==========================================
// ACTIVITY LISTS
// ==========================================

function emptyPanel(title, description) {
    return '<div class="empty-panel">' +
        '<i data-lucide="folder-open"></i>' +
        '<h3>' + escapeHtml(title) + '</h3>' +
        '<p>' + escapeHtml(description) + '</p>' +
        '</div>';
}


function activityCard(activity) {
    const sections = activity.sections || [];

    const count = sections.reduce(
        (total, section) => total + (section.entries || []).length,
        0
    );

    return '<article class="activity-card">' +
        '<div class="activity-icon"><i data-lucide="train-front"></i></div>' +
        '<div class="activity-card-main">' +
            '<h3>' + escapeHtml(activity.name) + '</h3>' +
            '<p>' + escapeHtml(activity.route || "Route not specified") +
            ' · ' + sections.length + ' sections · ' + count + ' entries</p>' +
        '</div>' +
        '<div class="activity-card-actions">' +
            '<button class="icon-action" data-edit="' + activity.id + '" title="Edit"><i data-lucide="pencil"></i></button>' +
            '<button class="icon-action" data-pdf="' + activity.id + '" title="Download PDF"><i data-lucide="file-down"></i></button>' +
            '<button class="icon-action" data-delete="' + activity.id + '" title="Delete"><i data-lucide="trash-2"></i></button>' +
        '</div>' +
    '</article>';
}


function renderLists() {
    const totalSections = activities.reduce(
        (total, activity) => total + (activity.sections || []).length,
        0
    );

    const totalEntries = activities.reduce((total, activity) => {
        return total + (activity.sections || []).reduce(
            (sectionTotal, section) =>
                sectionTotal + (section.entries || []).length,
            0
        );
    }, 0);

    document.getElementById("totalActivities").textContent =
        String(activities.length).padStart(2, "0");

    document.getElementById("totalSections").textContent =
        String(totalSections).padStart(2, "0");

    document.getElementById("totalEntries").textContent =
        String(totalEntries).padStart(2, "0");

    document.getElementById("recentActivities").innerHTML = activities.length
        ? activities.slice(0, 4).map(activityCard).join("")
        : emptyPanel(
            "No activities yet",
            "Create your first activity to start building your Open Rails records."
        );

    document.getElementById("allActivities").innerHTML = activities.length
        ? activities.map(activityCard).join("")
        : emptyPanel(
            "Your workspace is empty",
            "Use Create Activity to add your first activity."
        );

    refreshIcons();
}


// ==========================================
// ACTIVITY BUILDER
// ==========================================

function resetBuilder() {
    editingId = null;
    sectionCounter = 0;

    document.getElementById("builderHeading").textContent =
        "Create Activity";

    document.getElementById("activityName").value = "";
    document.getElementById("routeName").value = "";
    document.getElementById("activityDay").value = "";

    document.getElementById("sectionsContainer").innerHTML =
        '<div class="no-sections">No sections added yet. Click “Add Section” to begin.</div>';
}


function openNew() {
    resetBuilder();
    showView("builder");
}


// ==========================================
// SECTIONS
// ==========================================

function addSection(data = {}) {
    const empty = document.querySelector(".no-sections");

    if (empty) {
        empty.remove();
    }

    const template = document.getElementById("sectionTemplate");
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".section-card");

    const index = ++sectionCounter;

    card.querySelector(".section-index").textContent =
        String(index).padStart(2, "0");

    card.querySelector(".section-name").value = data.name || "";

    (data.entries || []).forEach(entry => {
        addEntry(card, entry);
    });

    document.getElementById("sectionsContainer").appendChild(card);

    refreshIcons();
}


// ==========================================
// TRAIN ENTRIES AND .PAT FILES
// ==========================================

function addEntry(card, data = {}) {
    const body = card.querySelector(".entries-body");
    const template = document.getElementById("entryTemplate");
    const fragment = template.content.cloneNode(true);
    const row = fragment.querySelector(".entry-row");

    row.querySelector(".entry-train").value = data.train || "";
    row.querySelector(".entry-time").value = data.time || "";
    row.querySelector(".entry-info").value = data.info || "";
    row.querySelector(".entry-consist").value = data.consist || "";

    const savedPath = data.pathFile || null;

    row.dataset.pathFile = JSON.stringify(savedPath);

    updatePathFileDisplay(row, savedPath);

    body.appendChild(fragment);

    refreshIcons();
}


function updatePathFileDisplay(row, pathFile) {
    const nameLabel = row.querySelector(".path-file-name");

    // This class matches the latest index.html.
    const downloadButton = row.querySelector(".path-download-button");

    if (!nameLabel || !downloadButton) {
        return;
    }

    if (pathFile && pathFile.name) {
        nameLabel.textContent = pathFile.name;
        downloadButton.hidden = false;
    } else {
        nameLabel.textContent = "No path selected";
        downloadButton.hidden = true;
    }
}


async function handlePathFileSelection(input) {
    const file = input.files && input.files[0];

    if (!file) {
        return;
    }

    if (!file.name.toLowerCase().endsWith(".pat")) {
        alert("Please select an Open Rails / MSTS .pat file.");
        input.value = "";
        return;
    }

    const row = input.closest(".entry-row");

    try {
        const content = await file.text();

        const pathFile = {
            name: file.name,
            content: content
        };

        row.dataset.pathFile = JSON.stringify(pathFile);

        updatePathFileDisplay(row, pathFile);

    } catch (error) {
        console.error("Could not read .pat file:", error);

        alert("The selected path file could not be read.");

        input.value = "";
    }
}


function downloadPathFile(row) {
    let pathFile;

    try {
        pathFile = JSON.parse(row.dataset.pathFile || "null");
    } catch (error) {
        pathFile = null;
    }

    if (!pathFile || typeof pathFile.content !== "string") {
        alert("No saved path file is available for this train.");
        return;
    }

    const blob = new Blob([pathFile.content], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = pathFile.name || "activity-path.pat";

    document.body.appendChild(link);

    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}


// ==========================================
// COLLECT ACTIVITY DATA
// ==========================================

function collectBuilder() {
    const name = document.getElementById("activityName").value.trim();

    if (!name) {
        alert("Please enter an Activity Name.");

        document.getElementById("activityName").focus();

        return null;
    }

    const sections = [...document.querySelectorAll(".section-card")].map(card => {
        const entries = [...card.querySelectorAll(".entry-row")].map(row => {
            let pathFile = null;

            try {
                pathFile = JSON.parse(row.dataset.pathFile || "null");
            } catch (error) {
                pathFile = null;
            }

            return {
                train: row.querySelector(".entry-train").value.trim(),
                time: row.querySelector(".entry-time").value.trim(),
                info: row.querySelector(".entry-info").value.trim(),
                consist: row.querySelector(".entry-consist").value.trim(),
                pathFile: pathFile
            };

        }).filter(entry =>
            entry.train ||
            entry.time ||
            entry.info ||
            entry.consist ||
            entry.pathFile
        );

        return {
            name: card.querySelector(".section-name").value.trim(),
            entries: entries
        };

    }).filter(section => section.name || section.entries.length);

    if (!sections.length) {
        alert("Add at least one section.");
        return null;
    }

    if (sections.some(section => !section.name)) {
        alert("Please enter a name for every section.");
        return null;
    }

    return {
        name: name,
        route: document.getElementById("routeName").value.trim(),
        day: document.getElementById("activityDay").value,
        sections: sections
    };
}


// ==========================================
// SAVE ACTIVITY TO MYSQL
// ==========================================

async function saveBuilder() {
    const item = collectBuilder();

    if (!item) {
        return;
    }

    const saveButton = document.getElementById("saveActivityBtn");

    saveButton.disabled = true;

    try {
        let savedActivity;

        if (editingId !== null) {
            // Update existing activity.
            savedActivity = await apiRequest(
                `${API_URL}/${editingId}`,
                {
                    method: "PUT",
                    body: JSON.stringify(item)
                }
            );

            const index = activities.findIndex(
                activity => String(activity.id) === String(editingId)
            );

            if (index !== -1) {
                activities[index] = savedActivity;
            }

        } else {
            // Create a new activity.
            savedActivity = await apiRequest(
                API_URL,
                {
                    method: "POST",
                    body: JSON.stringify(item)
                }
            );

            activities.unshift(savedActivity);
        }

        // Keep the list in updated-date order.
        activities.sort((a, b) =>
            new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
        );

        editingId = null;

        renderLists();
        showView("activities");

        alert("Activity saved successfully!");

    } catch (error) {
        console.error("Could not save activity:", error);

        alert("Could not save activity:\n" + error.message);

    } finally {
        saveButton.disabled = false;
    }
}


// ==========================================
// EDIT ACTIVITY
// ==========================================

function editActivity(id) {
    const activity = activities.find(
        item => String(item.id) === String(id)
    );

    if (!activity) {
        alert("Activity not found.");
        return;
    }

    editingId = activity.id;
    sectionCounter = 0;

    document.getElementById("builderHeading").textContent =
        "Edit Activity";

    document.getElementById("activityName").value =
        activity.name || "";

    document.getElementById("routeName").value =
        activity.route || "";

    document.getElementById("activityDay").value =
        activity.day || "";

    document.getElementById("sectionsContainer").innerHTML = "";

    (activity.sections || []).forEach(section => {
        addSection(section);
    });

    if (!activity.sections || !activity.sections.length) {
        document.getElementById("sectionsContainer").innerHTML =
            '<div class="no-sections">No sections added yet. Click “Add Section” to begin.</div>';
    }

    showView("builder");
}


// ==========================================
// DELETE ACTIVITY FROM MYSQL
// ==========================================

async function deleteActivity(id) {
    const activity = activities.find(
        item => String(item.id) === String(id)
    );

    if (!activity) {
        return;
    }

    if (!confirm('Delete "' + activity.name + '"? This cannot be undone.')) {
        return;
    }

    try {
        await apiRequest(
            `${API_URL}/${id}`,
            {
                method: "DELETE"
            }
        );

        activities = activities.filter(
            item => String(item.id) !== String(id)
        );

        renderLists();

        alert("Activity deleted successfully!");

    } catch (error) {
        console.error("Could not delete activity:", error);

        alert("Could not delete activity:\n" + error.message);
    }
}


// ==========================================
// PDF EXPORT
// ==========================================

function setPrintHeading() {
    const name = document.getElementById("activityName").value.trim();
    const route = document.getElementById("routeName").value.trim();
    const day = document.getElementById("activityDay").value;

    document.getElementById("printHeading").innerHTML =
        "<h1>" + escapeHtml(name) + "</h1>" +
        "<p>" + escapeHtml(route) +
        (day ? " · " + escapeHtml(day) : "") +
        "</p><hr>";
}


function downloadPdf(id) {
    const activity = activities.find(
        item => String(item.id) === String(id)
    );

    if (!activity) {
        return;
    }

    editActivity(id);

    setTimeout(() => {
        setPrintHeading();
        window.print();
    }, 250);
}


// ==========================================
// CLICK EVENTS
// ==========================================

document.addEventListener("click", event => {
    const nav = event.target.closest("[data-view]");

    if (nav) {
        event.preventDefault();
        showView(nav.dataset.view);
    }

    const go = event.target.closest("[data-go]");

    if (go) {
        showView(go.dataset.go);
    }

    const edit = event.target.closest("[data-edit]");

    if (edit) {
        editActivity(edit.dataset.edit);
    }

    const del = event.target.closest("[data-delete]");

    if (del) {
        deleteActivity(del.dataset.delete);
    }

    const pdf = event.target.closest("[data-pdf]");

    if (pdf) {
        downloadPdf(pdf.dataset.pdf);
    }

    const removeSection = event.target.closest(".remove-section");

    if (removeSection) {
        removeSection.closest(".section-card").remove();

        if (!document.querySelector(".section-card")) {
            document.getElementById("sectionsContainer").innerHTML =
                '<div class="no-sections">No sections added yet. Click “Add Section” to begin.</div>';
        }
    }

    const removeEntry = event.target.closest(".remove-entry");

    if (removeEntry) {
        const row = removeEntry.closest(".entry-row");

        if (row) {
            row.remove();
        }
    }

    const addEntryButton = event.target.closest(".add-entry-btn");

    if (addEntryButton) {
        addEntry(addEntryButton.closest(".section-card"));
    }

    // Matches the path-download-button class in index.html.
    const downloadPathButton = event.target.closest(".path-download-button");

    if (downloadPathButton) {
        downloadPathFile(downloadPathButton.closest(".entry-row"));
    }
});


// ==========================================
// FILE INPUT EVENTS
// ==========================================

document.addEventListener("change", event => {
    if (event.target.matches(".entry-path-file")) {
        handlePathFileSelection(event.target);
    }
});


// ==========================================
// BUTTON EVENTS
// ==========================================

document.getElementById("newActivityBtn").addEventListener("click", openNew);

document.getElementById("newActivityBtn2").addEventListener("click", openNew);

document.getElementById("addSectionBtn").addEventListener("click", () => {
    addSection();
});

document.getElementById("saveActivityBtn").addEventListener("click", saveBuilder);

document.getElementById("cancelBuilder").addEventListener("click", () => {
    showView("activities");
});

document.getElementById("backToActivities").addEventListener("click", () => {
    showView("activities");
});


// ==========================================
// INITIALIZATION
// ==========================================

document.getElementById("sectionsContainer").innerHTML =
    '<div class="no-sections">No sections added yet. Click “Add Section” to begin.</div>';

showView("dashboard");

loadActivities();
