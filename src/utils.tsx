import {
  TriggerContext,
  Post,
  Comment,
} from "@devvit/public-api";

// Helper function to determine if action by a certain mod is ignored
export async function modIsIgnored(modUsername: string, context: TriggerContext) {
  // For invalid mod username, return true.
  if (modUsername == undefined || modUsername == "")
    return true;
  // For posts filtered by Reddit, return the value of the app setting.
  else if (modUsername == "reddit")
    return (await context.settings.get("ignore-ureddit")) as boolean;
  // For AutoModerator, return the value of the app setting.
  else if (modUsername == "AutoModerator")
    return (await context.settings.get("ignore-automod")) as boolean;
  // Admin check
  if (await context.settings.get("ignore-admins"))
    // If the "ignore-admins" setting is on, return the output of the userIsAdmin method,
    // which will tell us if the mod is an admin.
    return (await userIsAdmin(modUsername, context));
  // Base conditions satisfied.
  var thisModIsIgnored = false;
  // Get whitelist of mods from app settings.
  const modWhitelist = (await context.settings.get("mod-whitelist")) as string;
  // If whitelist is not empty, use that.
  if (modWhitelist != undefined && modWhitelist.trim() != "") {
    const whitelistedMods = modWhitelist.trim().split(',');
    for (let i = 0; i < whitelistedMods.length; i++) {
      const whiteListedUsername = whitelistedMods[i].trim();
      // If mod is whitelisted, return false.
      if (modUsername == whiteListedUsername) {
        thisModIsIgnored = false;
        break;
      }
    }
  }
  // If whitelist is empty, use blacklist instead.
  else {
    const modBlacklist = (await context.settings.get("mod-blacklist")) as string;
    // Only check blacklist if it is not empty.
    if (modBlacklist != undefined && modBlacklist.trim() != "") {
      const blacklistedMods = modBlacklist.trim().split(',');
      for (let i = 0; i < blacklistedMods.length; i++) {
        const blackListedUsername = blacklistedMods[i].trim();
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
async function userIsAdmin(username: string, context: TriggerContext) {
  // Return false for invalid username.
  if (username == undefined || username == "") return false;
  // Fetch user by username.
  const user = await context.reddit.getUserByUsername(username);
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
    if (!comment.isRemoved() && !comment.isDistinguished()) // Skip top-level distinguished mod comments
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