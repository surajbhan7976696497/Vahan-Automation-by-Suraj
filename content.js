(() => {
    "use strict";

    /*
     * v9
     * - Keeps v8's sequential behavior.
     * - Adds visibilitychange/focus/pageshow recovery.
     * - When returning to this tab, the CURRENT stage is re-checked.
     * - No page reload merely because the tab was switched.
     * - After Authentication Modes Proceed, automation stops permanently.
     */

    let stopped = false;
    let reloadStarted = false;
    let state = "START";

    let timer = null;
    let authTimer = null;

    function visible(el) {
        if (!el) return false;

        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();

        return (
            s.display !== "none" &&
            s.visibility !== "hidden" &&
            parseFloat(s.opacity || "1") !== 0 &&
            r.width > 0 &&
            r.height > 0
        );
    }

    function enabled(el) {
        return !!el &&
            !el.disabled &&
            el.getAttribute("aria-disabled") !== "true";
    }

    function usable(el) {
        return visible(el) && enabled(el);
    }

    function clearTimers() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }

        if (authTimer) {
            clearInterval(authTimer);
            authTimer = null;
        }
    }

    function stop() {
        stopped = true;
        clearTimers();
    }

    function closeMobilePopup() {
        if (stopped) return;

        for (const title of document.querySelectorAll(".modal-title")) {
            const text = (title.textContent || "").trim();

            if (
                text.includes("Update Your Mobile Number") ||
                text.includes("अपना मोबाइल नंबर अपडेट करें")
            ) {
                const button = title.closest(".modal-header")
                    ?.querySelector('button.btn-close[data-dismiss="modal"]');

                if (button && usable(button)) {
                    button.click();
                }
            }
        }
    }

    function previousSessionAlert() {
        const dialogs = document.querySelectorAll(
            "#primefacesmessagedlg, .ui-message-dialog"
        );

        for (const dialog of dialogs) {
            if (!visible(dialog)) continue;

            const text = dialog.textContent || "";

            if (
                text.includes("Previous session is already active") ||
                text.includes("Close all other session") ||
                text.includes("refresh(CTRL+F5)")
            ) {
                return dialog;
            }
        }

        return null;
    }

    function handlePreviousSession() {
        if (stopped || reloadStarted) return false;

        const dialog = previousSessionAlert();

        if (!dialog) return false;

        const closeButton = dialog.querySelector(
            "a.ui-dialog-titlebar-close"
        );

        if (closeButton && usable(closeButton)) {
            reloadStarted = true;
            clearTimers();

            closeButton.click();

            setTimeout(() => {
                window.location.reload();
            }, 300);
        }

        return true;
    }

    function originalRegnidFilled() {
        const reg = document.querySelector("#regnid");
        if (!reg) return false;

        // Only the original HTML attribute.
        // User typing into the field does NOT trigger this.
        const original = reg.getAttribute("value");

        return original !== null && original.trim() !== "";
    }

    function citizenLogo() {
        const section = document.querySelector(
            ".inline-section.vertical-right-divider"
        );

        if (!section) return null;

        for (const link of section.querySelectorAll("a")) {
            if (
                link.querySelector("img.logo_citizen_service") ||
                link.querySelector("img[src*='VahanCitzenServicelogo']")
            ) {
                return link;
            }
        }

        return null;
    }

    function mainProceed() {
        const button = document.querySelector("#proccedHomeButtonId");
        if (!button) return null;

        const text = (button.textContent || "").trim();

        return text.includes("Proceed") ? button : null;
    }

    function authenticationProceed() {
        const dialog = document.querySelector("#facelesslist");

        if (!dialog || !visible(dialog)) return null;

        for (const button of dialog.querySelectorAll(
            ".am-footer button"
        )) {
            if ((button.textContent || "").trim() === "Proceed") {
                return button;
            }
        }

        for (const button of dialog.querySelectorAll(
            "button[type='submit']"
        )) {
            if ((button.textContent || "").trim() === "Proceed") {
                return button;
            }
        }

        return null;
    }

    function runCurrentStage() {
        if (stopped || reloadStarted) return;

        closeMobilePopup();

        if (handlePreviousSession()) return;

        if (state === "WAIT_MAIN_PROCEED") {
            const button = mainProceed();

            if (button && usable(button)) {
                state = "CLICK_MAIN_PROCEED";

                clearTimers();
                button.click();

                // Let PrimeFaces AJAX create Authentication Modes.
                setTimeout(() => {
                    if (!stopped && !reloadStarted) {
                        state = "WAIT_AUTH_PROCEED";
                        startAuthWatcher();
                    }
                }, 1200);
            }

            return;
        }

        if (state === "WAIT_AUTH_PROCEED") {
            const button = authenticationProceed();

            if (button && usable(button)) {
                state = "CLICK_AUTH_PROCEED";

                clearTimers();
                button.click();

                // Do not touch the page after second Proceed.
                state = "DONE";
                stop();
            }
        }
    }

    function startMainWatcher() {
        if (stopped || reloadStarted) return;

        state = "WAIT_MAIN_PROCEED";

        if (timer) clearInterval(timer);

        timer = setInterval(() => {
            runCurrentStage();
        }, 300);

        runCurrentStage();
    }

    function startAuthWatcher() {
        if (stopped || reloadStarted) return;

        state = "WAIT_AUTH_PROCEED";

        if (authTimer) clearInterval(authTimer);

        authTimer = setInterval(() => {
            runCurrentStage();
        }, 300);

        runCurrentStage();
    }

    function startAfterLogo() {
        if (stopped || reloadStarted) return;

        // Give the site's JSF/AJAX navigation time to settle.
        setTimeout(() => {
            if (stopped || reloadStarted) return;

            closeMobilePopup();
            startMainWatcher();
        }, 2500);
    }

    function start() {
        closeMobilePopup();

        if (handlePreviousSession()) return;

        if (originalRegnidFilled()) {
            state = "WAIT_CITIZEN_LOGO";

            const started = Date.now();

            const logoTimer = setInterval(() => {
                if (stopped || reloadStarted) {
                    clearInterval(logoTimer);
                    return;
                }

                closeMobilePopup();

                if (handlePreviousSession()) return;

                const logo = citizenLogo();

                if (logo && usable(logo)) {
                    clearInterval(logoTimer);

                    state = "CLICK_CITIZEN_LOGO";
                    logo.click();

                    setTimeout(closeMobilePopup, 400);
                    setTimeout(closeMobilePopup, 900);
                    setTimeout(closeMobilePopup, 1600);

                    startAfterLogo();
                    return;
                }

                if (Date.now() - started >= 10000) {
                    clearInterval(logoTimer);

                    // If the logo never appeared, continue to Main Proceed.
                    startMainWatcher();
                }
            }, 300);

            return;
        }

        // No ORIGINAL value -> never click Citizen Service logo.
        startMainWatcher();
    }

    /*
     * TAB RESUME FIX
     *
     * Chrome can throttle timers when this page becomes a background tab.
     * When the user comes back, immediately re-check the current stage.
     */
    function resumeCheck() {
        if (stopped || reloadStarted) return;

        // Let Chrome finish restoring layout/focus first.
        setTimeout(() => {
            if (stopped || reloadStarted) return;

            closeMobilePopup();

            if (handlePreviousSession()) return;

            if (state === "WAIT_MAIN_PROCEED") {
                startMainWatcher();
            } else if (state === "WAIT_AUTH_PROCEED") {
                startAuthWatcher();
            } else if (
                state === "START" ||
                state === "WAIT_CITIZEN_LOGO"
            ) {
                start();
            }
        }, 150);
    }

    document.addEventListener(
        "visibilitychange",
        () => {
            if (document.visibilityState === "visible") {
                resumeCheck();
            }
        },
        false
    );

    window.addEventListener("focus", resumeCheck, false);
    window.addEventListener("pageshow", resumeCheck, false);

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            start,
            { once: true }
        );
    } else {
        start();
    }
})();
