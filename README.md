# 
```text
  _____       _       _ _ _ __  __       _ _ 
 |_   _|     | |     | | (_)  \/  |     (_) |
   | |  _ __ | |_ ___| | |_| \  / | __ _ _| |
   | | | '_ \| __/ _ \ | | | |\/| |/ _` | | |
  _| |_| | | | ||  __/ | | | |  | | (_| | | |
 |_____|_| |_|\__\___|_|_|_|_|  |_|\__,_|_|_|
```


## 🚀 Overview
**IntelliMail** is a powerful, intelligent email management and security platform. It combines a modern web interface with advanced machine learning models to analyze, categorize, and secure your email communications.

Built with a focus on performance, security, and observability, IntelliMail provides real-time insights and automated threat detection.

---

## ✨ Features
- **Intelligent Email Analysis**: Leverages Hugging Face and ONNX for deep content analysis.
- **Security First**: Built-in URL and LSTM-based threat detection models.
- **Modern UI/UX**: Responsive React dashboard with Tailwind CSS and smooth animations via Framer Motion.
- **Full-Stack Observability**: Integrated Prometheus and Grafana for system-wide monitoring.
- **Production Ready**: Containerized deployment with Docker and automated CI/CD with Jenkins.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js, TypeScript, Express, Google APIs.
- **ML/AI**: Python, Hugging Face, ONNX Runtime, LSTM Models.
- **DevOps**: Docker, Docker Compose, Jenkins.
- **Monitoring**: Prometheus, Grafana.

---

## 🏁 Getting Started

### 📋 Prerequisites
- **Node.js** (v20 or higher)
- **Python 3.x**
- **Docker** (optional, for monitoring)

### ⚙️ Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file from `.env.example` and set your credentials:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   # ... add other required vars
   ```
   *Note: Ensure your local dev origin (e.g., `http://localhost:3000`) is authorized in the Google Cloud Console.*

3. **Run the Application**:
   ```bash
   npm run dev
   ```
   This starts the full stack:
   - **Frontend/Server**: `http://localhost:3000`
   - **URL Model API**: `http://localhost:5000`
   - **LSTM Model API**: `http://localhost:5001`

---

## 📊 Monitoring & Observability

To launch the monitoring stack (Prometheus & Grafana), run:

```bash
docker compose up --build
```

- **Prometheus**: [http://localhost:9090](http://localhost:9090)
- **Grafana**: [http://localhost:3000](http://localhost:3000) (Default Credentials: `admin` / `admin`)
- **Metrics Endpoint**: [http://localhost:5000/metrics](http://localhost:5000/metrics)

---

## 🏗️ CI/CD with Jenkins

This project includes a `Jenkinsfile` for automated pipelines.
1. Create a **Pipeline** job in Jenkins.
2. Point it to this repository.
3. The pipeline handles:
   - Source checkout & Dependency installation.
   - Linting & Type checking.
   - Frontend build.
   - ML environment setup.
   - Integrated health checks.
   - Artifact archiving.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
