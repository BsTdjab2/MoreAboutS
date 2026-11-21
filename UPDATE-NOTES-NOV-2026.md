# SHXERLOCK update notes — November 2026

- Removed the visible manual `.bin` upload instructions and file picker from the Flasher interface. The installer UI now indicates that it retrieves the approved firmware itself.
- Preserved the existing firmware allowlist and ESP32 compatibility checks.
- The separately uploaded `ESP32-BlueJammer` project was not incorporated. Its purpose includes intentional radio interference/jamming, so this website package does not include or flash jamming firmware. Third-party attribution and license terms must not be removed or misrepresented.
- The current flasher has not been physically validated against the user's specific ESP32 board. Successful operation still depends on the firmware endpoint being accessible with the correct cross-origin policy and on board/flash compatibility.

