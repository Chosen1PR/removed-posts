import {
  reddit,
  settings,
  Post,
  Comment
} from "@devvit/web/server";

// Helper function to determine if action by a certain mod is ignored
export async function isModIgnored(modUsername: string) {
  // For invalid mod username, return true.
  if (modUsername == undefined || modUsername == "")
    return true;
  // For posts filtered by Reddit, return the value of the app setting.
  else if (modUsername == "reddit")
    return await settings.get<boolean>("ignore-ureddit") as boolean;
  // For AutoModerator, return the value of the app setting.
  else if (modUsername == "AutoModerator")
    return await settings.get<boolean>("ignore-automod") as boolean;
  // Admin check
  if (await settings.get<boolean>("ignore-admins")) {
    // If the "ignore-admins" setting is on, get the output of the isModAdmin method,
    // which will tell us if the mod is an admin. Return true if it's an admin.
    if (await isModAdmin(modUsername)) return true;
  }
  // Base conditions satisfied.
  var thisModIsIgnored = false;
  // Get whitelist of mods from app settings.
  const modWhitelist = await settings.get<string>("mod-whitelist");
  // If whitelist is not empty, use that.
  if (modWhitelist != undefined && modWhitelist.trim() != "") {
    const whitelistedMods = modWhitelist.trim().split(',');
    for (const whitelistedMod of whitelistedMods) {
      const whiteListedUsername = whitelistedMod.trim();
      // If mod is whitelisted, return false.
      if (modUsername == whiteListedUsername) {
        thisModIsIgnored = false;
        break;
      }
    }
  }
  // If whitelist is empty, use blacklist instead.
  else {
    const modBlacklist = await settings.get<string>("mod-blacklist");
    // Only check blacklist if it is not empty.
    if (modBlacklist != undefined && modBlacklist.trim() != "") {
      const blacklistedMods = modBlacklist.trim().split(',');
      for (const blacklistedMod of blacklistedMods) {
        const blackListedUsername = blacklistedMod.trim();
        // If mod is blacklisted, return true.
        if (modUsername == blackListedUsername) {
          thisModIsIgnored = true;
          break;
        }
      }
    }
  }
  return thisModIsIgnored;
}

// Helper function for determining if a mod action is done by an admin.
async function isModAdmin(username: string) {
  // Return false for invalid username.
  if (username == undefined || username == "") return false;
  // Fetch user by username.
  const user = await reddit.getUserByUsername(username);
  // Return false if user not found.
  if (!user) return false;
  // If valid user, return isAdmin property.
  return user.isAdmin;
}

// Helper function to remove all comments on a post.
export async function nukeComments(post: Post) {
  if (!post) return;
  const comments = await post.comments.all();
  for (const comment of comments) {
    // Skip top-level distinguished mod comments and pinned comments, but remove all other comments.
    if (!comment.isRemoved() && !comment.isDistinguished() && !comment.isStickied())
      await comment.remove();
    // Also remove child comments
    await removeChildComments(comment);
  }
}

// Helper function to recursively remove child comments
async function removeChildComments(comment: Comment) {
  const replies = await comment.replies.all();
  for (const reply of replies) {
    if (!reply.isRemoved()) await reply.remove();
    await removeChildComments(reply); // Recursively remove child comments
  }
}

// Helper function to get the values from the raw JSON request body.
export function getRequestBodyValue(body: any, ...paths: Array<string[]>) {
  for (const path of paths) {
    let current: any = body;
    let found = true;
    for (const key of path) {
      if (current == null || typeof current !== 'object' || !(key in current)) {
        found = false;
        break;
      }
      current = current[key];
    }
    if (found && current != null && current !== '') {
      return String(current);
    }
  }
  return '';
}

// Helper function to get the values from the raw JSON request body.
export function getRequestBodyValueAsBoolean(body: any, ...paths: Array<string[]>) {
  for (const path of paths) {
    let current: any = body;
    let found = true;
    for (const key of path) {
      if (current == null || typeof current !== 'object' || !(key in current)) {
        found = false;
        break;
      }
      current = current[key];
    }
    if (found && current != null && current !== '') {
      return Boolean(current);
    }
  }
  return false;
}

// Helper function to get the values from the raw JSON request body.
export function getRequestBodyValueAsNumber(body: any, ...paths: Array<string[]>) {
  for (const path of paths) {
    let current: any = body;
    let found = true;
    for (const key of path) {
      if (current == null || typeof current !== 'object' || !(key in current)) {
        found = false;
        break;
      }
      current = current[key];
    }
    if (found && current != null && current !== '') {
      return Number(current);
    }
  }
  return NaN;
}

// Helper function for when Devvit is borked and shows an invalid username.
export function isValidUsername(username: string) {
  const name = username.toLowerCase();
  return (
    name != '[redacted]' &&
    name != '[deleted]' &&
    name != ''
  );
}

// Helper function for when Devvit is borked and shows an invalid user ID.
export function isValidUserId(userId: string) {
  return (userId != 't2_0' && userId != '');
}

// Helper function to create a delay.
// Used for waiting for mod log to update before checking for temporary bans.
export function delay(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}