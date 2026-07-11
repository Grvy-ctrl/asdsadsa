// Roblox Follow-Check Proxy
//
// Purpose: lets the game ask "does player X follow user Y?" without ever
// putting the bot account's session cookie inside Roblox (Studio, script
// Source, or any third-party HTTP proxy like roproxy).
//
// The cookie lives ONLY in this server's environment variables (set in the
// Render dashboard, never committed to git, never sent to Roblox scripts).

const express = require("express");

const app = express();
app.disable("x-powered-by");

const PORT = process.env.PORT || 3000;
const ROBLOSECURITY = process.env.ROBLOSECURITY; // bot account session cookie
const SHARED_SECRET = process.env.SHARED_SECRET; // key the Roblox game must send

if (!ROBLOSECURITY) {
  console.error("FATAL: ROBLOSECURITY environment variable is not set.");
  process.exit(1);
}
if (!SHARED_SECRET) {
  console.error("FATAL: SHARED_SECRET environment variable is not set.");
  process.exit(1);
}

// Simple auth: only requests carrying the shared secret (known only to your
// Roblox script, stored there via HttpService:GetSecret) are allowed through.
function requireApiKey(req, res, next) {
  const key = req.get("x-api-key");
  if (!key || key !== SHARED_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// Health check for Render + easy manual sanity check.
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// GET /is-following?player=123&target=456
// Returns { following: true|false }
app.get("/is-following", requireApiKey, async (req, res) => {
  const player = Number(req.query.player);
  const target = Number(req.query.target);

  if (!Number.isInteger(player) || player <= 0 || !Number.isInteger(target) || target <= 0) {
    return res.status(400).json({ error: "player and target must be positive integer userIds" });
  }

  try {
    const following = await isFollowing(player, target);
    res.json({ following });
  } catch (err) {
    console.error("is-following error:", err.message);
    res.status(502).json({ error: "upstream_failure" });
  }
});

// Walks the authenticated followings list for `player`, looking for `target`.
async function isFollowing(playerUserId, targetUserId) {
  let cursor = "";

  for (let i = 0; i < 25; i++) {
    const url =
      `https://friends.roblox.com/v1/users/${playerUserId}/followings` +
      `?limit=100&cursor=${encodeURIComponent(cursor)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: `.ROBLOSECURITY=${ROBLOSECURITY}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Roblox API returned ${response.status}`);
    }

    const body = await response.json();
    const data = Array.isArray(body.data) ? body.data : [];

    if (data.some((entry) => entry.id === targetUserId)) {
      return true;
    }

    if (!body.nextPageCursor) {
      return false;
    }
    cursor = body.nextPageCursor;
  }

  return false;
}

app.listen(PORT, () => {
  console.log(`Follow-check proxy listening on port ${PORT}`);
});
