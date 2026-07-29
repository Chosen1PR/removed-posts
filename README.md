## Features

This app locks posts automatically when they are removed by a moderator or deleted by the poster. Additionally, mods can:

- Enable or disable post locking at will without needing to uninstall the app.
- Optionally unlock posts when they are approved.
- Optionally ignore posts removed or approved by AutoModerator, Reddit filters, and/or admins.
- Define a blocklist of mods. Posts removed or approved by these mods will not be locked/unlocked automatically.
- Define an allowlist of mods (which overrides the blocklist) if only posts removed or approved by certain mod(s) should be locked/unlocked.
- Optionally remove all comments for posts marked as spam. This action is not easily reversible, so caution is advised.

---

## Changelog

### [1.1.0] (2026-07-28)

- Rewrote entire app using Devvit Web for better maintainability. No feature changes.

### [1.0.8] (2026-06-16)

- Applied the mod exemptions for post removals to approvals as well.
- Fixed an issue that could cause the app to ignore all mods if the "Ignore admins" setting was enabled.

### [1.0.7] (2026-06-03)

- Removed the Settings menu item at subreddit level for a cleaner menu. Settings are still accessible from developers.reddit.com.
- Updated dependencies to address vulnerabilities.

### [1.0.6] (2026-05-18)

#### Features

- App icon now appears as app account's avatar.
- Updated app description on app profile page.

### [1.0.5] (2026-04-17)

#### Features

- The option to remove all comments for spam posts now does NOT remove pinned comments, regardless of whether they are mod distinguished or not. Previously, in order for mod comments to *not* be removed, they had to be both top-level and distinguished. Now, they can be pinned and not distinguished.
- Removed one unnecessary event trigger that *may* have been causing unintentional post locks. This bug fix is a work in progress.

### [1.0.3] (2026-01-18)

#### Bug Fixes

- Fixed a bug where marking a post as spam would not remove its comments if it was already locked, even if the setting was enabled.

### [1.0.2] (2026-01-12)

- New app icon.

### [1.0.0] (2026-01-02)

#### Features

- Added the ability to remove all comments on posts marked as spam.
- Bumped major version.

### [0.0.10] (2025-12-06)

#### Features

- Added the ability to lock posts deleted by the OP (Original Poster).

#### Bug Fixes

- Fixed an issue where posts that were removed as spam were not being locked.

### [0.0.8] Initial Version (2025-12-01)

#### Features

- Enable or disable post locking at will without needing to uninstall the app.
- Optionally unlock posts when they are approved by any mod.
- Optionally ignore posts removed by AutoModerator.
- Define a blocklist of mods. Posts removed by these mods will not be locked automatically.
- Define an allowlist of mods (which overrides the blocklist) if only posts removed by certain mods should be locked.

#### Bug Fixes

None yet (initial version). Please send a private message to the developer (u/Chosen1PR) to report bugs.