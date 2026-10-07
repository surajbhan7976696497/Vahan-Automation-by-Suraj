Vahan Auto Sequence v9.0.0

v9 keeps the v8 reliable sequential flow and adds tab-switch recovery.

Flow:
1. Close Update Your Mobile Number popup.
2. If #regnid has an ORIGINAL HTML value attribute, click Citizen Service logo.
3. Wait for the site's AJAX/navigation.
4. Wait for Main Proceed (#proccedHomeButtonId) to be visible and enabled.
5. Click Main Proceed exactly once.
6. Wait for Authentication Modes.
7. Wait for its visible/enabled Proceed button and click it exactly once.
8. Stop automation after the second Proceed.

Tab switching:
- If Chrome throttles timers while the tab is in the background, the
  extension re-checks the CURRENT stage when the tab becomes visible/focused.
- Switching tabs does not reload the page.
- Already completed stages are not clicked again.
- After second Proceed, automation remains stopped.

Registration rule:
- Only the ORIGINAL HTML value attribute of #regnid is checked.
- User typing a registration number later does not trigger the logo.

Previous-session alert:
- Close alert.
- Reload.
- Normal sequence starts again.

Install:
Chrome -> chrome://extensions -> Developer mode -> Load unpacked
-> select the extracted folder.
