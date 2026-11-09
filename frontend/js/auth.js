
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const formTitle = document.getElementById("formTitle");
const formDescription = document.getElementById("formDescription");

const switchText = document.getElementById("switchText");
const switchButton = document.getElementById("switchButton");

const messageBox = document.getElementById("messageBox");

const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");

let currentMode = "login";


// ==========================================
// MESSAGE HANDLER
// ==========================================

function showMessage(message, type = "error") {

    messageBox.textContent = message;

    messageBox.className = `message-box ${type}`;

    messageBox.hidden = false;
}


function hideMessage() {

    messageBox.hidden = true;
    messageBox.textContent = "";
}


// ==========================================
// API REQUEST
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
        throw new Error(
            data.error || "Something went wrong."
        );
    }

    return data;
}


// ==========================================
// SWITCH LOGIN / SIGNUP
// ==========================================

function switchMode() {

    hideMessage();

    if (currentMode === "login") {

        currentMode = "signup";

        loginForm.hidden = true;
        signupForm.hidden = false;

        formTitle.innerHTML =
            'Create <span>Account.</span>';

        formDescription.textContent =
            "Create your account and start managing your Open Rails activities.";

        switchText.textContent =
            "Already have an account?";

        switchButton.textContent =
            "Login";

    } else {

        currentMode = "login";

        signupForm.hidden = true;
        loginForm.hidden = false;

        formTitle.innerHTML =
            'Welcome <span>Back.</span>';

        formDescription.textContent =
            "Login to access your saved Open Rails activities.";

        switchText.textContent =
            "Don't have an account?";

        switchButton.textContent =
            "Create Account";
    }

    refreshIcons();
}


switchButton.addEventListener("click", switchMode);


// ==========================================
// LOGIN
// ==========================================

loginForm.addEventListener("submit", async event => {

    event.preventDefault();

    hideMessage();

    const email = document.getElementById("loginEmail").value.trim();

    const password = document.getElementById("loginPassword").value;

    loginButton.disabled = true;

    loginButton.querySelector("span").textContent =
        "Logging in...";

    try {

        await apiRequest("/api/auth/login", {

            method: "POST",

            body: JSON.stringify({
                email: email,
                password: password
            })

        });

        showMessage(
            "Login successful. Opening your workspace...",
            "success"
        );

        window.location.href = "/";

    } catch (error) {

        showMessage(error.message);

    } finally {

        loginButton.disabled = false;

        loginButton.querySelector("span").textContent =
            "Login to Workspace";
    }

});


// ==========================================
// SIGNUP
// ==========================================

signupForm.addEventListener("submit", async event => {

    event.preventDefault();

    hideMessage();

    const name = document.getElementById("signupName").value.trim();

    const email = document.getElementById("signupEmail").value.trim();

    const password = document.getElementById("signupPassword").value;

    if (password.length < 8) {

        showMessage(
            "Password must contain at least 8 characters."
        );

        return;
    }

    signupButton.disabled = true;

    signupButton.querySelector("span").textContent =
        "Creating account...";

    try {

        await apiRequest("/api/auth/register", {

            method: "POST",

            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })

        });

        showMessage(
            "Account created successfully. Opening your workspace...",
            "success"
        );

        window.location.href = "/";

    } catch (error) {

        showMessage(error.message);

    } finally {

        signupButton.disabled = false;

        signupButton.querySelector("span").textContent =
            "Create Account";
    }

});


// ==========================================
// ICON INITIALIZATION
// ==========================================

function refreshIcons() {

    if (window.lucide) {
        window.lucide.createIcons();
    }

}

refreshIcons();
