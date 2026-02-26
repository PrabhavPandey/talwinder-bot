# Talwinder Setup Guide (Using NeonDB)

This guide will help you orchestrate Talwinder so a user can chat with it on WhatsApp and ideas get stored in your database.

---

## 1. The Orchestration Architecture

To get this running, we need 3 pieces talking to each other:
1.  **WhatsApp (User Interface)**: Where users chat.
2.  **Talwinder (The Brain)**: This code running on your machine (via ngrok) or a server.
3.  **NeonDB (The Memory)**: A cloud database to store ideas and user stats.

---

## 2. Database Setup (NeonDB)

We are using **NeonDB** because it's a serverless, free, and fast PostgreSQL provider.

1.  **Create Account**: Go to [Neon.tech](https://neon.tech/) and sign up.
2.  **Create Project**: Click **"New Project"**. Name it `talwinder-db`.
3.  **Get Connection String**:
    -   Once created, you will see a **Connection Details** panel.
    -   Click "Copy" on the **Connection string** (it looks like `postgres://user:pass@ep-xyz.us-east-1.aws.neon.tech/neondb...`).
    -   **IMPORTANT**: Ensure you copy the "Pooled connection" string if available, otherwise the direct one is fine for this bot.
4.  **Save it**: Paste this into your `.env` file as `DATABASE_URL`.

---

## 3. API Keys Procurement

### A. Google Gemini API (The Intelligence)
1.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Click **"Create API key"**.
3.  Save as `GEMINI_API_KEY` in `.env`.

### B. Meta Cloud API (The WhatsApp Connection)
1.  Go to [developers.facebook.com](https://developers.facebook.com/).
2.  Create a **Business App**.
3.  Add **WhatsApp** product.
4.  In **API Setup**:
    -   Copy **Temporary Access Token** -> `META_ACCESS_TOKEN`.
    -   Copy **Phone Number ID** -> `META_PHONE_NUMBER_ID`.
5.  In **Configuration**:
    -   Set **Verify Token** (e.g., `grapevine_secret`) -> `META_VERIFY_TOKEN`.

---

## 4. Local Orchestration (Connecting the Pipes)

Since WhatsApp needs to hit your local machine, we use **ngrok**.

1.  **Install & Run ngrok**:
    ```bash
    npm install -g ngrok
    ngrok http 3000
    ```
2.  **Copy the URL**: You'll get something like `https://a1b2-c3d4.ngrok-free.app`.
3.  **Connect to Meta**:
    -   Go back to Facebook Developers -> WhatsApp -> Configuration.
    -   Click **Edit** on Webhook.
    -   URL: `https://YOUR-NGROK-URL.ngrok-free.app/webhooks/meta`
    -   Verify Token: `grapevine_secret` (matches `.env`).
    -   **Verify and Save**.
    -   **Subscribe** to the `messages` webhook topic.

---

## 5. Launch Sequence

1.  **Install Dependencies**:
    ```bash
    cd talwinder
    npm install
    ```
2.  **Configure Environment**:
    -   Ensure `.env` has `DATABASE_URL` (Neon), `GEMINI_API_KEY`, and `META_*` keys.
3.  **Initialize Database**:
    -   This creates the tables in your NeonDB cloud instance.
    ```bash
    npm run db:migrate
    ```
4.  **Start the Brain**:
    ```bash
    npm run dev
    ```

---

## 6. Usage (The End Result)

1.  Open WhatsApp on your phone.
2.  Message the **Test Number** provided in the Meta Developer Console.
3.  **Say**: *"I have an idea for a new engineering feature."*
4.  **Result**:
    -   Talwinder receives it via ngrok.
    -   Gemini analyzes it.
    -   It's saved to NeonDB.
    -   Talwinder replies on WhatsApp.
    -   You can see the idea in your **Admin Dashboard** at `http://localhost:3000`.

---

## Troubleshooting

-   **Database Connection Error?** Check if your `DATABASE_URL` starts with `postgres://` or `postgresql://`. Ensure `?sslmode=require` is at the end (our code handles this, but good to check).
-   **Not replying?** Check your terminal for `Webhook error`. Ensure ngrok is still running and the URL in Meta Configuration matches exactly.
