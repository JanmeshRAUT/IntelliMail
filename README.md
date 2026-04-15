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

`npm run dev` uses the integrated launcher and starts all local services together:
- App server on `http://localhost:3000`
- URL model API on `http://localhost:5000`
- LSTM model API on `http://localhost:5001`

### Monitoring with Prometheus and Grafana

If you want a monitoring stack, run:

```powershell
docker compose up --build
```

Then open:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (admin/admin)
- App metrics endpoint: `http://localhost:5000/metrics`

Prometheus is configured to scrape the Node app at `/metrics` and Grafana is provisioned with a default Prometheus datasource.

## Jenkins CI Setup

You can run this project in Jenkins with the included `Jenkinsfile`.

1. In Jenkins, create a new **Pipeline** job.
2. Point it to this repository (Git URL + credentials, if needed).
3. Set pipeline definition to **Pipeline script from SCM** and use `Jenkinsfile` as script path.
4. Ensure the Jenkins agent has Node.js 20+ with npm, and Python 3.x.
5. Run the pipeline.

The pipeline stages are:
- Checkout source code
- Install dependencies (`npm ci` with fallback to `npm install`)
- Type check (`npm run lint`)
- Build frontend (`npm run build`)
- Optional ML Python environment setup (`ml-model/.venv` + `pip install -r requirements.txt`)
- Optional integrated stack check (`npm run dev` with app + both ML APIs health checks)
- Archive `dist` artifacts

### Optional Jenkins Parameter

- `RUN_INTEGRATED_STACK_CHECK` (default: `false`): starts `npm run dev`, checks `3000/health`, `5000/health`, and `5001/health`, then stops the process
