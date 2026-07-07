const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ChatSession = require("../models/Chat");
const { GoogleGenAI } = require("@google/genai");
const redisClient = require("../config/redis");
const multer = require("multer");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Configure multer to store files temporarily in memory as Buffers
const storage = multer.memoryStorage();
const uploadInstance = multer({ storage: storage });
const upload = uploadInstance.single("image");

// Helper utility function to convert a Buffer into the format Gemini SDK expects
function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

// Get all chat sessions for sidebar
router.get("/sessions", auth, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(sessions);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Get single session history details (WITH REDIS CACHE-ASIDE PATTERN)
router.get("/session/:id", auth, async (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user.id;
  const cacheKey = `chat:session:${sessionId}:user:${userId}`;

  try {
    const cachedSession = await redisClient.get(cacheKey);
    if (cachedSession) {
      console.log(`[CACHE HIT] Serving session ${sessionId} from Redis`);
      return res.json(JSON.parse(cachedSession));
    }

    console.log(`[CACHE MISS] Fetching session ${sessionId} from MongoDB`);

    const session = await ChatSession.findOne({
      _id: sessionId,
      userId: userId,
    });

    if (!session) {
      return res.status(200).json({ messages: [], title: "New Chat" });
    }

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(session));
    res.json(session);
  } catch (err) {
    console.error("Database or Cache query error:", err);
    res.status(500).send("Server Error");
  }
});

// Stream AI Messages (UPDATED FOR MULTIMODAL CAPABILITIES)
// router.post("/message", auth, upload, async (req, res) => {
//   // 👈 'upload' middleware added here to parse multi-part form payloads
//   const { sessionId, messageText } = req.body;
//   const userId = req.user.id;

//   try {
//     let session = null;
//     if (sessionId && sessionId !== "null" && sessionId !== "undefined") {
//       session = await ChatSession.findOne({ _id: sessionId, userId });
//     }

//     if (!session) {
//       session = new ChatSession({
//         userId,
//         title: messageText.substring(0, 30),
//       });
//     }

//     // Format chat history context array for Gemini SDK
//     const history = session.messages.map((msg) => ({
//       role: msg.role,
//       parts: [{ text: msg.text }],
//     }));

//     const imageBase64Data = req.file
//       ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
//       : "";

//     // Save user's question to DB
//     session.messages.push({
//       role: "user",
//       text: messageText,
//       imageUrl: imageBase64Data,
//     });
//     await session.save();

//     // Set Up Server-Sent Event (SSE) HTTP Streaming Headers
//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");

//     // Construct the payload contents array
//     const contentsPayload = [
//       ...history,
//       { role: "user", parts: [{ text: messageText }] },
//     ];

//     // If an image was uploaded, convert it and inject it directly into the current request slice!
//     if (req.file) {
//       console.log(
//         `[MULTIMODAL] Processing attached image file: ${req.file.originalname}`
//       );
//       const imagePart = fileToGenerativePart(
//         req.file.buffer,
//         req.file.mimetype
//       );

//       // Add the image partition to the final user message part block array
//       contentsPayload[contentsPayload.length - 1].parts.push(imagePart);
//     }

//     const responseStream = await ai.models.generateContentStream({
//       model: "gemini-3.5-flash",
//       contents: contentsPayload, // 👈 Uses dynamic array containing history, text, and optional images
//     });

//     let aiFullResponse = "";
//     for await (const chunk of responseStream) {
//       if (chunk.text) {
//         aiFullResponse += chunk.text;
//         res.write(
//           `data: ${JSON.stringify({
//             text: chunk.text,
//             sessionId: session._id,
//           })}\n\n`
//         );
//       }
//     }

//     session.messages.push({ role: "model", text: aiFullResponse });
//     await session.save();

//     const cacheKey = `chat:session:${session._id}:user:${userId}`;
//     await redisClient.del(cacheKey);
//     console.log(`[CACHE INVALIDATED] Purged stale cache for key: ${cacheKey}`);

//     res.write("data: [DONE]\n\n");
//     res.end();
//   } catch (err) {
//     console.error("Error in streaming route:", err);

//     if (err.status === 429 || (err.message && err.message.includes("429"))) {
//       res.write(
//         `data: ${JSON.stringify({
//           text: "⚠️ You've hit your application's free tier daily quota limit. Please try again later or wait for the reset.",
//           sessionId: sessionId || "error",
//           isError: true,
//         })}\n\n`
//       );
//       res.write("data: [DONE]\n\n");
//       return res.end();
//     }

//     if (!res.headersSent) {
//       res.status(500).send("Streaming server error");
//     }
//   }
// });

router.post("/message", auth, upload, async (req, res) => {
  // 👈 'upload' middleware added here to parse multi-part form payloads
  const { sessionId, messageText } = req.body;
  const userId = req.user.id;

  try {
    // ==========================================
    // 🛡️ USER-LEVEL REDIS RATE LIMITER
    // ==========================================
    const rateLimitKey = `ratelimit:user:${userId}`;
    const maxRequests = 10;      // Max allowed requests...
    const windowSeconds = 60;    // ...per 60 seconds

    // Increment user's request count in Redis
    const currentRequests = await redisClient.incr(rateLimitKey);

    // If it's their first request in this 60-second window, set the expiration
    if (currentRequests === 1) {
      await redisClient.expire(rateLimitKey, windowSeconds);
    }

    // If they exceed 10 requests inside 60 seconds, block them instantly
    if (currentRequests > maxRequests) {
      console.log(`[RATE LIMIT TRIGGERED] User ${userId} blocked.`);
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      
      res.write(`data: ${JSON.stringify({ 
        text: "⚠️ Slow down! You are sending messages too fast. Please wait a minute.", 
        sessionId: sessionId || "error",
        isError: true 
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    // ==========================================

    let session = null;
    if (sessionId && sessionId !== "null" && sessionId !== "undefined") {
      session = await ChatSession.findOne({ _id: sessionId, userId });
    }

    if (!session) {
      session = new ChatSession({
        userId,
        title: messageText.substring(0, 30),
      });
    }

    // Format chat history context array for Gemini SDK
    const history = session.messages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const imageBase64Data = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : "";

    // Save user's question to DB
    session.messages.push({
      role: "user",
      text: messageText,
      imageUrl: imageBase64Data,
    });
    await session.save();

    // Set Up Server-Sent Event (SSE) HTTP Streaming Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Construct the payload contents array
    const contentsPayload = [
      ...history,
      { role: "user", parts: [{ text: messageText }] },
    ];

    // If an image was uploaded, convert it and inject it directly into the current request slice!
    if (req.file) {
      console.log(
        `[MULTIMODAL] Processing attached image file: ${req.file.originalname}`
      );
      const imagePart = fileToGenerativePart(
        req.file.buffer,
        req.file.mimetype
      );

      // Add the image partition to the final user message part block array
      contentsPayload[contentsPayload.length - 1].parts.push(imagePart);
    }

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: contentsPayload, // 👈 Uses dynamic array containing history, text, and optional images
    });

    let aiFullResponse = "";
    for await (const chunk of responseStream) {
      if (chunk.text) {
        aiFullResponse += chunk.text;
        res.write(
          `data: ${JSON.stringify({
            text: chunk.text,
            sessionId: session._id,
          })}\n\n`
        );
      }
    }

    session.messages.push({ role: "model", text: aiFullResponse });
    await session.save();

    const cacheKey = `chat:session:${session._id}:user:${userId}`;
    await redisClient.del(cacheKey);
    console.log(`[CACHE INVALIDATED] Purged stale cache for key: ${cacheKey}`);

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Error in streaming route:", err);

    if (err.status === 429 || (err.message && err.message.includes("429"))) {
      res.write(
        `data: ${JSON.stringify({
          text: "⚠️ You've hit your application's free tier daily quota limit. Please try again later or wait for the reset.",
          sessionId: sessionId || "error",
          isError: true,
        })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    if (!res.headersSent) {
      res.status(500).send("Streaming server error");
    }
  }
});

// Delete a specific chat session and all its messages (WITH CACHE PURGING)
router.delete("/session/:id", auth, async (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user.id;

  try {
    const session = await ChatSession.findOneAndDelete({
      _id: sessionId,
      userId: userId,
    });

    if (!session) {
      return res.status(404).json({ msg: "Chat session not found" });
    }

    const cacheKey = `chat:session:${sessionId}:user:${userId}`;
    await redisClient.del(cacheKey);
    console.log(`[CACHE PURGED] Erased deleted chat session key: ${cacheKey}`);

    res.json({ msg: "Chat session deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
