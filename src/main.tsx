// Learn more at developers.reddit.com/docs
import {
  Devvit,
} from "@devvit/public-api";

import {
  modIsIgnored,
  nukeComments
} from "./utils.js";

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
        defaultValue: "",
        scope: "installation",
      },
      //Config setting for list of whitelisted mods
      {
        type: "paragraph",
        name: "mod-whitelist",
        label: "Mod allowlist",
        helpText:
          `Comma (,) separated list of moderator usernames. Only posts removed by these mods will be locked. ` +
          `Overrides the blocklist above.`,
        defaultValue: "",
        scope: "installation",
      }
    ]
  },
  // Config setting for nuking comments on spam posts
  {
    type: "boolean",
    name: "nuke-comments",
    label: "Remove all comments on spam posts (WARNING: CAUTION ADVISED)",
    defaultValue: false,
    helpText:
      "If enabled, posts that are marked as spam will have all their comments removed, except for top-level distinguished mod comments. " +
      "Only works if post locking is also enabled. This action is NOT easily reversible for posts with many comments; caution is advised.",
    scope: "installation",
  },
]);

// Button for config settings
Devvit.addMenuItem({
  label: "Lock Removed Posts",
  description: "Settings",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (event, context) => {
    context.ui.navigateTo(`https://developers.reddit.com/r/${context.subredditName!}/apps/${context.appName}`);
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
        if (thisPost) {
          if (!thisPost.isLocked()) await thisPost.lock();
          if (event.action === 'spamlink') {
            // If action is spamlink, check if we need to nuke comments.
            if (await context.settings.get("nuke-comments")) {
              await nukeComments(thisPost);
            }
          }
        }
      }
    }
    // Check if the mod action is a post approval.
    else if (event.action === 'approvelink') {
      // Check if the setting for post unlock is enabled.
      if (await context.settings.get("enable-post-unlock")) {
        if (!(event.targetPost?.isLocked!)) return; // If the post is already unlocked, do nothing.
        // All conditions met. Proceed with post unlock.
        const thisPost = await context.reddit.getPostById(event.targetPost?.id!);
        if (thisPost) {
          if (thisPost.isLocked()) await thisPost.unlock();
        }
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
        if (thisPost) {
          if (!thisPost.isLocked()) await thisPost.lock();
        }
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
    if (thisPost) {
      if (!thisPost.isLocked()) await thisPost.lock();
    }
  },
});

export default Devvit;