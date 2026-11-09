const STORAGE_KEY = "orActManager.activities.v1";
const PATH_DB_NAME = "orActManager.pathFiles";
const PATH_STORE_NAME = "pathFiles";

const views = {
    dashboard: document.getElementById("dashboardView"),
    activities: document.getElementById("activitiesView"),
    builder: document.getElementById("builderView")
};

let activities = loadActivities();
let editingId = null;
let sectionCounter = 0;


// ==========================================
// LOCAL STORAGE
// ==========================================

function loadActivities() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (error) {
        console.error("Error loading activities:", error);
        return [];
    }
}

function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
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


// ==========================================
// INDEXEDDB - STORE ORIGINAL .PAT FILES
// ==========================================

function openPathDatabase() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("This browser does not support IndexedDB."));
            return;
        }

        const request = indexedDB.open(PATH_DB_NAME, 1);

        request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(PATH_STORE_NAME)) {
                database.createObjectStore(PATH_STORE_NAME, {
                    keyPath: "id"
                });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function savePathFile(id, file) {
    const database = await openPathDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(PATH_STORE_NAME, "readwrite");
        const store = transaction.objectStore(PATH_STORE_NAME);

        store.put({
            id,
            name: file.name,
            type: file.type || "application/octet-stream",
            blob: file
        });

        transaction.oncomplete = () => {
            database.close();
            resolve();
        };

        transaction.onerror = () => {
            database.close();
            reject(transaction.error);
        };
    });
}

async function getPathFile(id) {
    const database = await openPathDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(PATH_STORE_NAME, "readonly");
        const request = transaction.objectStore(PATH_STORE_NAME).get(id);

        request.onsuccess = () => {
            const result = request.result || null;
            database.close();
            resolve(result);
        };

        request.onerror = () => {
            database.close();
            reject(request.error);
        };
    });
}

async function downloadSavedPath(id) {
    try {
        const savedFile = await getPathFile(id);

        if (!savedFile) {
            alert("The saved .pat file could not be found in this browser.");
            return;
        }

        const url = URL.createObjectURL(savedFile.blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = savedFile.name;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Path file download failed:", error);
        alert("Unable to download this path file.");
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

    document.getElementById("pageTitle").textContent = labels[name];
    document.getElementById("breadcrumbLabel").textContent =
        labels[name].toUpperCase();

    if (name !== "builder") {
        renderLists();
    }

    if (window.lucide) {
        lucide.createIcons();
    }
}


// ==========================================
// EMPTY STATE
// ==========================================

function emptyPanel(title, description) {
    return `
        <div class="empty-panel">
            <i data-lucide="folder-open"></i>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(description)}</p>
        </div>
    `;
}


// ==========================================
// ACTIVITY CARDS
// ==========================================

function activityCard(activity) {
    const count = (activity.sections || []).reduce(
        (total, section) => total + (section.entries || []).length,
        0
    );

    return `
        <article class="activity-card">
            <div class="activity-icon">
                <i data-lucide="train-front"></i>
            </div>

            <div class="activity-card-main">
                <h3>${escapeHtml(activity.name)}</h3>
                <p>
                    ${escapeHtml(activity.route || "Route not specified")}
                    · ${(activity.sections || []).length} sections
                    · ${count} entries
                </p>
            </div>

            <div class="activity-card-actions">
                <button class="icon-action" data-edit="${activity.id}" title="Edit">
                    <i data-lucide="pencil"></i>
                </button>

                <button class="icon-action" data-pdf="${activity.id}" title="Download PDF">
                    <i data-lucide="file-down"></i>
                </button>

                <button class="icon-action" data-delete="${activity.id}" title="Delete">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </article>
    `;
}


// ==========================================
// DASHBOARD AND ACTIVITY LISTS
// ==========================================

function renderLists() {
    const totalSections = activities.reduce(
        (total, activity) => total + (activity.sections || []).length,
        0
    );

    const totalEntries = activities.reduce(
        (total, activity) => {
            return total + (activity.sections || []).reduce(
                (sectionTotal, section) =>
                    sectionTotal + (section.entries || []).length,
                0
            );
        },
        0
    );

    document.getElementById("totalActivities").textContent =
        String(activities.length).padStart(2, "0");

    document.getElementById("totalSections").textContent =
        String(totalSections).padStart(2, "0");

    document.getElementById("totalEntries").textContent =
        String(totalEntries).padStart(2, "0");

    const recentActivities = document.getElementById("recentActivities");
    const allActivities = document.getElementById("allActivities");

    recentActivities.innerHTML = activities.length
        ? activities.slice(-4).reverse().map(activityCard).join("")
        : emptyPanel(
            "No activities yet",
            "Create your first activity to start building your Open Rails records."
        );

    allActivities.innerHTML = activities.length
        ? activities.slice().reverse().map(activityCard).join("")
        : emptyPanel(
            "Your workspace is empty",
            "Use Create Activity to add your first activity."
        );

    if (window.lucide) {
        lucide.createIcons();
    }
}


// ==========================================
// ACTIVITY BUILDER
// ==========================================

function resetBuilder() {
    editingId = null;
    sectionCounter = 0;

    document.getElementById("builderHeading").textContent = "Create Activity";
    document.getElementById("activityName").value = "";
    document.getElementById("routeName").value = "";
    document.getElementById("activityDay").value = "";

    document.getElementById("sectionsContainer").innerHTML = `
        <div class="no-sections">
            No sections added yet. Click “Add Section” to begin.
        </div>
    `;
}

function openNew() {
    resetBuilder();
    showView("builder");
}


// ==========================================
// ADD SECTION
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

    if (window.lucide) {
        lucide.createIcons();
    }
}


// ==========================================
// ADD TRAIN ENTRY
// ==========================================

function addEntry(card, data = {}) {
    const body = card.querySelector(".entries-body");
    const template = document.getElementById("entryTemplate");
    const rowFragment = template.content.cloneNode(true);
    const row = rowFragment.querySelector(".entry-row");

    row.querySelector(".entry-train").value = data.train || "";
    row.querySelector(".entry-time").value = data.time || "";
    row.querySelector(".entry-info").value = data.info || "";
    row.querySelector(".entry-consist").value = data.consist || "";

    row.dataset.pathFileId = data.pathFileId || "";
    row.dataset.pathFileName = data.pathFileName || "";

    const fileName = row.querySelector(".path-file-name");
    const downloadButton = row.querySelector(".path-download-button");

    if (data.pathFileName) {
        fileName.textContent = data.pathFileName;
        downloadButton.hidden = false;
    }

    body.appendChild(rowFragment);

    if (window.lucide) {
        lucide.createIcons();
    }
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
            const pathInput = row.querySelector(".entry-path-file");

            return {
                train: row.querySelector(".entry-train").value.trim(),
                time: row.querySelector(".entry-time").value.trim(),
                info: row.querySelector(".entry-info").value.trim(),
                consist: row.querySelector(".entry-consist").value.trim(),
                pathFileId: row.dataset.pathFileId || "",
                pathFileName: row.dataset.pathFileName || "",
                selectedPathFile: pathInput.files[0] || null
            };
        }).filter(entry =>
            entry.train ||
            entry.time ||
            entry.info ||
            entry.consist ||
            entry.pathFileName ||
            entry.selectedPathFile
        );

        return {
            name: card.querySelector(".section-name").value.trim(),
            entries
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
        id: editingId || String(Date.now()),
        name,
        route: document.getElementById("routeName").value.trim(),
        day: document.getElementById("activityDay").value,
        sections,
        updatedAt: new Date().toISOString()
    };
}


// ==========================================
// SAVE ACTIVITY AND ITS PATH FILES
// ==========================================

async function saveBuilder() {
    const item = collectBuilder();

    if (!item) {
        return;
    }

    const saveButton = document.getElementById("saveActivityBtn");
    saveButton.disabled = true;

    try {
        for (const section of item.sections) {
            for (const entry of section.entries) {
                if (entry.selectedPathFile) {
                    const pathFileId = entry.pathFileId || (
                        item.id + "_" + Date.now() + "_" + Math.random().toString(16).slice(2)
                    );

                    await savePathFile(pathFileId, entry.selectedPathFile);

                    entry.pathFileId = pathFileId;
                    entry.pathFileName = entry.selectedPathFile.name;
                }

                delete entry.selectedPathFile;
            }
        }

        const index = activities.findIndex(activity => activity.id === item.id);

        if (index >= 0) {
            activities[index] = item;
        } else {
            activities.push(item);
        }

        persist();
        renderLists();
        showView("activities");

    } catch (error) {
        console.error("Unable to save activity:", error);
        alert("Activity could not be saved. Please check browser storage permissions.");
    } finally {
        saveButton.disabled = false;
    }
}


// ==========================================
// EDIT ACTIVITY
// ==========================================

function editActivity(id) {
    const activity = activities.find(item => item.id === id);

    if (!activity) {
        return;
    }

    editingId = id;
    sectionCounter = 0;

    document.getElementById("builderHeading").textContent = "Edit Activity";
    document.getElementById("activityName").value = activity.name;
    document.getElementById("routeName").value = activity.route || "";
    document.getElementById("activityDay").value = activity.day || "";

    document.getElementById("sectionsContainer").innerHTML = "";

    (activity.sections || []).forEach(section => {
        addSection(section);
    });

    if (!activity.sections?.length) {
        document.getElementById("sectionsContainer").innerHTML = `
            <div class="no-sections">
                No sections added yet. Click “Add Section” to begin.
            </div>
        `;
    }

    showView("builder");
}


// ==========================================
// DELETE ACTIVITY
// ==========================================

function deleteActivity(id) {
    const activity = activities.find(item => item.id === id);

    if (!activity || !confirm(
        `Delete "${activity.name}"? This cannot be undone.`
    )) {
        return;
    }

    activities = activities.filter(item => item.id !== id);

    persist();
    renderLists();
}


// ==========================================
// PDF EXPORT
// ==========================================

function setPrintHeading() {
    const name = document.getElementById("activityName").value.trim();
    const route = document.getElementById("routeName").value.trim();
    const day = document.getElementById("activityDay").value;

    document.getElementById("printHeading").innerHTML = `
        <h1>${escapeHtml(name)}</h1>
        <p>
            ${escapeHtml(route)}
            ${day ? " · " + escapeHtml(day) : ""}
        </p>
        <hr>
    `;
}

function downloadPdf(id) {
    const activity = activities.find(item => item.id === id);

    if (!activity) {
        return;
    }

    editActivity(id);

    setTimeout(() => {
        setPrintHeading();
        window.print();
    }, 300);
}


// ==========================================
// FILE SELECTION
// ==========================================

document.addEventListener("change", event => {
    const fileInput = event.target.closest(".entry-path-file");

    if (!fileInput) {
        return;
    }

    const row = fileInput.closest(".entry-row");
    const file = fileInput.files[0];

    if (!row || !file) {
        return;
    }

    if (!file.name.toLowerCase().endsWith(".pat")) {
        alert("Please select a valid .pat file.");
        fileInput.value = "";
        return;
    }

    row.dataset.pathFileName = file.name;

    const fileName = row.querySelector(".path-file-name");
    const downloadButton = row.querySelector(".path-download-button");

    fileName.textContent = file.name + " (selected)";
    downloadButton.hidden = true;
});


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
            document.getElementById("sectionsContainer").innerHTML = `
                <div class="no-sections">
                    No sections added yet. Click “Add Section” to begin.
                </div>
            `;
        }
    }

    const removeEntry = event.target.closest(".remove-entry");

    if (removeEntry) {
        removeEntry.closest(".entry-row")?.remove();
    }

    const addEntryButton = event.target.closest(".add-entry-btn");

    if (addEntryButton) {
        addEntry(addEntryButton.closest(".section-card"));
    }

    const downloadPathButton = event.target.closest(".path-download-button");

    if (downloadPathButton) {
        const row = downloadPathButton.closest(".entry-row");

        if (row?.dataset.pathFileId) {
            downloadSavedPath(row.dataset.pathFileId);
        }
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

document.getElementById("sectionsContainer").innerHTML = `
    <div class="no-sections">
        No sections added yet. Click “Add Section” to begin.
    </div>
`;

renderLists();
showView("dashboard");
