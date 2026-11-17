# Digest Room Agent

An agent-native chat app — a clean, ChatGPT-style shell with chat at the centre, durable threads, auth and live sync.

**Live demo:** https://digest-room-agent.vercel.app

> Note: the live app opens on its sign-up / sign-in screen ("Welcome — Create an account to get started"), so a signed-out visitor meets the account flow first.

This repo is built on the agent-native "Chat" starter template (kept verbatim below): it gives you the app–agent loop wired end to end and one example action, so you can add your own UI, data, and actions on top. It is the app base for the Digest Room agent; the original Digest Room workflow concept lives in the sister repo [digest-room](https://github.com/MSAbhishek22/digest-room).

---

# Chat

The minimal agent-native starter app — a clean, ChatGPT-style shell with chat at
the center, durable threads, standard app navigation, auth, live sync, and
actions. Start here when you want a real browser app to build on without
committing to a domain template.

**Live app: [chat.agent-native.com](https://chat.agent-native.com?utm_source=github&utm_medium=referral&utm_content=chat-readme)**

Chat is the basic agent-native app starting point. It gives you the app-agent
loop wired end to end and one example action, so you can add your own UI, data,
and actions on top.

## Features

- ChatGPT-style shell with a threads list and durable chat history.
- Auth, live sync, and application state wired out of the box.
- The action surface the agent and UI share, plus one example action to copy.
- A minimal, brandable base for any domain app.

## Develop locally

Scaffold your own copy and run it:

```bash
npx --yes @agent-native/core@latest create my-app --standalone --template chat
cd my-app
corepack enable
pnpm install
pnpm dev
```

Full docs: [agent-native.com/docs/template-chat](https://agent-native.com/docs/template-chat?utm_source=github&utm_medium=referral&utm_content=chat-readme).
