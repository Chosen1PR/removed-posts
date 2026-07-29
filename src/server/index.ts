import express from "express";
import {
  createServer,
  getServerPort,
  reddit,
  settings
} from "@devvit/web/server";

import {
  getRequestBodyValue,
  getRequestBodyValueAsBoolean,
  getRequestBodyValueAsNumber,
  isModIgnored,
  nukeComments
} from "./utils.js";

import { PostId } from "./types.js"

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

// Trigger handler for mod action
router.post('/internal/triggers/on-mod-action', async (req, res): Promise<void> => {
  const action = getRequestBodyValue(req.body, ['action']) ?? '',
  modName = getRequestBodyValue(req.body, ['moderator', 'name']) ?? '',
  targetPostId = getRequestBodyValue(req.body, ['targetPost', 'id']) ?? '',
  targetPostIsLocked = getRequestBodyValueAsBoolean(req.body, ['targetPost', 'isLocked']);
  try {
    // Check if the mod action is a post removal.
    if (action === 'removelink' || action === 'spamlink') {
      // Check if we need to lock the post.
      if (await settings.get<boolean>("enable-post-lock")) {
        // Check which mod performed the action.
        if (!(await isModIgnored(modName))) {
          // All conditions met. Proceed with post lock.
          const thisPost = await reddit.getPostById(targetPostId as PostId);
          if (thisPost) {
            if (!thisPost.isLocked()) await thisPost.lock();
            if (action === 'spamlink') {
              // If action is spamlink, check if we need to nuke comments.
              if (await settings.get<boolean>("nuke-comments")) {
                await nukeComments(thisPost);
              }
            }
          }
        }
      }
    }
    // Check if the mod action is a post approval.
    else if (action === 'approvelink') {
      // Check if the setting for post unlock is enabled.
      if (!targetPostIsLocked) return; // If the post is already unlocked, do nothing.
      if (await settings.get<boolean>("enable-post-unlock")) {
        if (await isModIgnored(modName)) return; // If this mod is ignored, do nothing.
        // All conditions met. Proceed with post unlock.
        const thisPost = await reddit.getPostById(targetPostId as PostId);
        if (thisPost) {
          if (thisPost.isLocked()) await thisPost.unlock();
        }
      }
    }
    res.status(200).json({ status: 'ok' });
  }
  catch (error) {
    console.log(`General error: ${error}`);
  }
});

// Trigger handler for post delete
router.post('/internal/triggers/on-post-delete', async (req, res): Promise<void> => {
  // For source: 3 = mod; 2 = admin; 1 = user; 0 = unknown; -1 = unrecognized
  const source = getRequestBodyValueAsNumber(req.body, ['source']),
  postId = getRequestBodyValue(req.body, ['postId']);
  try {
    if (source == 1) { // Post was deleted by its author.
      if (await settings.get<boolean>("enable-lock-deleted")) { // If setting is enabled, lock post.
        const thisPost = await reddit.getPostById(postId as PostId);
        if (thisPost) {
          if (!thisPost.isLocked()) await thisPost.lock();
        }
      }
    }
    res.status(200).json({ status: 'ok' });
  }
  catch (error) {
    console.log(`General error: ${error}`);
  }
});

app.use(router);

const server = createServer(app);
server.on("error", (err) => console.error(`server error: ${err.stack}`));
server.listen(getServerPort());