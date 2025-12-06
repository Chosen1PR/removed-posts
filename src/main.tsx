// Learn more at developers.reddit.com/docs
import {
  //CommentCreate,
  //CommentCreateDefinition,
  //CommentDelete,
  Devvit,
  //MenuItemOnPressEvent,
  //Post,
  //SettingScope,
  TriggerContext,
  //User,
  //useState,
} from "@devvit/public-api";

Devvit.configure({
  redditAPI: true,
});


Devvit.addSettings([
  // Config setting for locking of removed posts
  {
    type: "boolean",
    name: "enable-post-lock",
    label: "Lock removed posts",
    defaultValue: true,
    helpText:
      "If enabled, posts will be locked automatically when they are removed.",
    scope: "installation",
  },
  // Config setting for locking of deleted posts
  {
    type: "boolean",
    name: "enable-lock-deleted",
    label: "Lock deleted posts",
    defaultValue: true,
    helpText:
      "If enabled, posts will be locked automatically when they are deleted by the Original Poster.",
    scope: "installation",
  },
  // Config setting for post unlock
  {
    type: "boolean",
    name: "enable-post-unlock",
    label: "Unlock approved posts",
    defaultValue: false,
    helpText:
      "If enabled, posts will be unlocked automatically when they are approved by any mod/admin.",
    scope: "installation",
  },
  // Config setting for comment lock
  /*{
    type: "boolean",
    name: "enable-comment-lock",
    label: "Enable locking of removed comments",
    defaultValue: true,
    helpText:
      "If enabled, removed comments will be locked automatically.",
    scope: "installation",
  },*/
  // Config setting for enabling locking of all pinned posts when unpinned
  {
    type: "group",
    label: "Mod Settings",
    helpText:
      `Please omit any leading "u/" in the below settings (e.g., removed-posts, not u/removed-posts), ` +
      `or leave blank to disable.`,
    fields: [
      // Config setting to ignore u/reddit
      {
        type: "boolean",
        name: "ignore-ureddit",
        label: "Ignore posts filtered by Reddit",
        defaultValue: true,
        helpText:
          "If enabled, posts filtered or removed by u/reddit will not be locked.",
        scope: "installation",
      },
      // Config setting to ignore automod
      {
        type: "boolean",
        name: "ignore-automod",
        label: "Ignore posts filtered/removed by AutoModerator",
        defaultValue: true,
        helpText:
          "If enabled, posts filtered or removed by AutoModerator will not be locked.",
        scope: "installation",
      },
      // Config setting to ignore admins
      {
        type: "boolean",
        name: "ignore-admins",
        label: "Ignore posts removed by Admins",
        defaultValue: false,
        helpText:
          "If enabled, posts removed by site Admins will not be locked.",
        scope: "installation",
      },
      // Config setting for list of blacklisted mods
      {
        type: "paragraph",
        name: "mod-blacklist",
        label: "Mod blocklist",
        helpText:
          `Comma (,) separated list of moderator usernames. Posts removed by these mods will be ignored. ` +
          `This setting is ignored if the allowlist is not empty.`,
        //lineHeight: 3,
        defaultValue: "",
        scope: "installation",
      },
      //Config setting for list of whitelisted mods
      {
        type: "paragraph",
        name: "mod-whitelist",
        label: "Mod allowlist",
        helpText:
          `Comma (,) separated list of moderator usernames. Only posts removed by these mods will be actioned. ` +
          `Overrides the blocklist above.`,
        //lineHeight: 3,
        defaultValue: "",
        scope: "installation",
      }
    ]
  },
]);

// Button for config settings
Devvit.addMenuItem({
  label: "Lock Removed Posts",
  description: "Settings",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (event, context) => {
    context.ui.navigateTo(`https://developers.reddit.com/r/${context.subredditName!}/apps/removed-posts`);
  },
});

// Trigger handler for when a mod action is performed on a post
Devvit.addTrigger({
  event: 'ModAction',
  onEvent: async (event, context) => {
    // Check if the mod action is a post removal.
    if (event.action === 'removelink' || event.action === 'spamlink') {
      // Check if the setting for post lock is enabled.
      if (await context.settings.get("enable-post-lock")) {
        if (event.targetPost?.isLocked!) return; // If the post is already locked, do nothing.
        // Check mod username.
        const modUsername = event.moderator?.name!;
        const thisModIsIgnored = await modIsIgnored(modUsername, context);
        if (thisModIsIgnored) return; // If this mod is ignored, do nothing.
        // All conditions met. Proceed with post lock.
        const thisPost = await context.reddit.getPostById(event.targetPost?.id!);
        if (thisPost) await thisPost.lock();
        //console.log('Is it locked?: ' + thisPost.isLocked().toString())
      }
    }
    // Check if the mod action is a post approval.
    else if (event.action === 'approvelink') {
      // Check if the setting for post unlock is enabled.
      if (await context.settings.get("enable-post-unlock")) {
        if (!(event.targetPost?.isLocked!)) return; // If the post is already unlocked, do nothing.
        // All conditions met. Proceed with post unlock.
        const thisPost = await context.reddit.getPostById(event.targetPost?.id!);
        if (thisPost) await thisPost.unlock();
      }
    }
  }
});

// Trigger handler for when post is deleted by user instead of removed by mod/admin
Devvit.addTrigger({
  event: "PostDelete",
  onEvent: async (event, context) => {
    const eventSource = event.source.valueOf(); // 3 = mod; 2 = admin; 1 = user; 0 = unknown; -1 = unrecognized
    if (eventSource == 1) { // Post was deleted by its author.
      if (await context.settings.get("enable-lock-deleted")) { // If setting is enabled, lock post.
        const thisPost = await context.reddit.getPostById(event.postId!);
        if (thisPost) await thisPost.lock();
      }
    }
  },
});

// Trigger handler for when post is filtered by automod
Devvit.addTrigger({
  event: "AutomoderatorFilterPost",
  onEvent: async (event, context) => {
    // If "ignore-automod" setting is enabled, do nothing.
    if (await context.settings.get("ignore-automod")) return;
    // Else, lock post.
    const thisPost = await context.reddit.getPostById(event.post?.id!);
    if (thisPost) await thisPost.lock();
  },
});

// Helper function to determine if action by a certain mod is ignored
async function modIsIgnored(modUsername: string, context: TriggerContext) {
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
  const user = await context.reddit.getUserByUsername(username);
  // Return false if user not found.
  if (!user) return false;
  // If valid user, return isAdmin property.
  return user.isAdmin;
}

export default Devvit;