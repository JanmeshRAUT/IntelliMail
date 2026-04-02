<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a34b9eec-f1b4-41a4-80af-16ec36662761

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `VITE_GOOGLE_CLIENT_ID` in `.env` to your Google OAuth Web Client ID
3. In Google Cloud Console, add your local dev origin (for example `http://localhost:3000`) to Authorized JavaScript origins
4. Run the app:
   `npm run dev`
