# Roblox Follow-Check Proxy

Holds your bot account's session cookie **only** in Render's environment
variables. Roblox never sees the cookie — it only calls this server with a
shared secret and gets back `{ following: true/false }`.

## 1. Get the bot account's cookie

Log into the bot account in a normal browser, open DevTools → Application →
Cookies → `https://www.roblox.com`, copy the value of `.ROBLOSECURITY`.
Treat this like a password — anyone with it has full control of the account.

## 2. Deploy to Render

1. Push this folder to a new GitHub repo (can be private).
2. In Render: **New → Web Service** → connect that repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Under **Environment**, add:
   - `ROBLOSECURITY` = (the cookie value from step 1)
   - `SHARED_SECRET` = a long random string you generate yourself, e.g. run
     `openssl rand -hex 32` locally — this is what your Roblox script will
     send to prove it's allowed to call this server.
6. Deploy. Render will give you a URL like `https://your-app.onrender.com`.
7. Sanity check: visit `https://your-app.onrender.com/health` — should return `{"ok":true}`.

## 3. Wire it into Roblox

In Studio, go to **File → Experience Settings → Security → Secrets** and add
a secret named e.g. `FollowProxyKey` with the value set to your
`SHARED_SECRET`, and domain set to your Render app's domain
(`your-app.onrender.com`).

Then update `ServerScriptService.Systems.FollowQuests` to call your Render
URL instead of roproxy (see the patch Claude applies in Studio).

## Notes

- Free Render web services spin down after inactivity and take ~30-60s to
  wake on the next request — the Roblox script should account for that
  (a generous timeout, and treat a failed/slow check as "try again," not as
  "definitely not following").
- Rotate `SHARED_SECRET` any time you suspect it leaked. Rotate the bot's
  cookie (just re-log the bot account) any time you suspect *that* leaked.
- Never commit a `.env` file with real values to git.
