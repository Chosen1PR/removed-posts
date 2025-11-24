// Learn more at developers.reddit.com/docs
import {
  //CommentCreate,
  //CommentCreateDefinition,
  //CommentDelete,
  Devvit,
  //MenuItemOnPressEvent,
  Post,
  //SettingScope,
  TriggerContext,
  //User,
  //useState,
} from "@devvit/public-api";

Devvit.configure({
  redditAPI: true,
});


Devvit.addSettings([
  // Config setting for enabling thread archiving
  {
    type: "boolean",
    name: "enable-archive",
    label: "Turn on megathread archiving",
    defaultValue: true,
    helpText:
      "If enabled, pinned posts will be locked when unpinned.",
    scope: "installation",
  },
  // Config setting for enabling locking of all pinned posts when unpinned
  {
    type: "boolean",
    name: "for-all-pinned",
    label: "Turn on for all pinned posts",
    defaultValue: false,
    helpText:
      "If enabled, all pinned posts will be locked when unpinned. If disabled, only posts with specific flairs or titles will be locked.",
    scope: "installation",
  },
  // Config setting for list of flairs for posts that should be archived
  {
    type: "paragraph",
    name: "archive-flair-list",
    label: "Flair list",
    helpText:
      'Comma (,) delimited list of flairs (case-sensitive) for pinned posts you want to lock automatically when unpinned.' +
      ' NOTE: The "Turn on for all pinned posts" setting overrides this.',
    lineHeight: 3,
    defaultValue: "",
    scope: "installation",
  },
  //Config setting for list of post title keywords for posts that should be archived
  {
    type: "paragraph",
    name: "archive-title-list",
    label: "Title keyword/phrase list",
    helpText:
      'Comma (,) delimited list of keywords or phrases (case-sensitive) for titles of pinned posts you want to lock automatically when unpinned.' +
      ' NOTE: The "Turn on for all pinned posts" setting overrides this.',
    lineHeight: 3,
    defaultValue: "",
    scope: "installation",
  }
]);


// Button for config settings
Devvit.addMenuItem({
  label: "Pinned Post Archiver",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (event, context) => {
    const subredditName = context.subredditName!;
    context.ui.navigateTo(`https://developers.reddit.com/r/${subredditName}/apps/sticky-archiver`);
  },
});

// Trigger handler for when a mod action is performed on a post, specifically for when a post is unstickied.
Devvit.addTrigger({
  event: 'ModAction',
  onEvent: async (event, context) => {
    //console.log(event.action + '\n' + event.targetPost?.title);
    // Check if the mod action is a post unsticky and not a comment unsticky
    if (event.action === 'unsticky') {
      // Check if the app is enabled
      const isEnabled = await context.settings.get("enable-archive")!;
      if (!isEnabled)
        return; // If the app is not enabled, do nothing
      const commentId = event.targetComment?.id ?? '';
      if (commentId !== '')
        return; // If the event is a comment, do nothing
      // Check if the for-all-pinned setting is enabled
      const forAllPinned = await context.settings.get("for-all-pinned")!;
      const postId = event.targetPost?.id!;
      const thisPost = await context.reddit.getPostById(postId);
      if (thisPost.locked) // If the post is already locked, do nothing
        return;
      //console.log(`A post was unstickied: and all the conditions are met`);
      const flair = thisPost.flair?.text ?? '';
      const title = thisPost.title!;
      if (forAllPinned) // If the setting is enabled, lock all pinned posts when unpinned.
        thisPost.lock();
      else if (flair != '') { // If the post has a flair, check if it matches the archive flair list
        const flairListTemp = await context.settings.get("archive-flair-list") ?? '';
        const flairList = flairListTemp.toString().trim();
        if (flairList != '' && containsFlair(flair, flairList))
          thisPost.lock(); // If the post has a flair that matches the archive flair list, lock it
      }
      if (!thisPost.locked) { // If the post has not already been locked, check if the title matches the archive title list
        const titleListTemp = await context.settings.get("archive-title-list") ?? '';
        const titleList = titleListTemp.toString().trim();
        if (titleList != '' && containsTitle(title, titleList))
          thisPost.lock(); // If the post title matches the archive title list, lock it
      }
      //console.log('Is it locked?: ' + thisPost.isLocked().toString())
    }
  }
});

// Helper function for verifying if post flair includes a flair in the list in the config settings
function containsFlair(flair: string, flairList: string) {
  flair = flair.trim(); //trim unneeded white space
  var flairs = flairList.split(","); //separate words in list
  for (let i = 0; i < flairs.length; i++) {
    flairs[i] = flairs[i].trim(); //for each flair in the list, trim white space as well
    if (flairs[i] == flair) //check if flair match
      return true;
  }
  //reached end of list, no match
  return false;
}

// Helper function for verifying if post title includes a title keyword in the list in the config settings
function containsTitle(title: string, titleList: string) {
  title = title.trim(); //trim unneeded white space
  var titles = titleList.split(","); //separate title keywords in list
  for (let i = 0; i < titles.length; i++) {
    titles[i] = titles[i].trim(); //for each title keywords in the list, trim white space as well
    if (title.includes(titles[i])) //check if titles match
      return true;
  }
  //reached end of list, no match
  return false;
}

export default Devvit;