# Deployment Guide for Multi-RAG

## Autoscale Deployment

Your Multi-RAG application is now configured for **Autoscale deployment**. The frontend and backend are served from a single FastAPI server for seamless deployment.

### ✅ What's Been Configured

1. **Unified Server**: FastAPI serves both the API and the static frontend on port 5000
2. **Build Process**: Frontend is built during deployment (`npm run build`)
3. **Run Command**: Uvicorn starts the FastAPI server with static file serving
4. **Single Port**: Everything runs on port 5000 (required for Autoscale)

### 📋 Deployment Configuration

The deployment is configured with:

**Build Command:**
```bash
sh -c "cd frontend && npm install && npm run build"
```

**Run Command:**
```bash
sh -c "cd backend && uvicorn app.main:app --host 0.0.0.0 --port 5000"
```

**Deployment Type:** Autoscale

### 🚀 How to Deploy

1. **Click "Deploy" in Replit**
   - Look for the Deploy button in the workspace header

2. **Select "Autoscale" deployment**
   - Choose your machine size (e.g., 1 vCPU, 2 GiB RAM)
   - Set maximum instances (e.g., 3 for auto-scaling)

3. **Review Configuration**
   - Build command: Builds the React frontend
   - Run command: Starts FastAPI server
   - Port: 5000 (default)

4. **Launch Deployment**
   - Click "Deploy" to publish your application
   - Replit will build the frontend and start the server
   - Your app will be available at a public URL

### 🔧 How It Works

**In Production:**
- FastAPI runs on port 5000
- Static frontend files served from `/frontend/dist`
- API endpoints available at `/auth`, `/documents`, `/chat`, etc.
- All routes served from single origin (no CORS issues)

**In Development:**
- Dev Server workflow runs FastAPI on port 5000
- Frontend is served as static files from the build
- Same setup as production for testing

### 📁 File Structure for Deployment

```
project/
├── backend/
│   ├── app/
│   │   ├── main.py          # Serves API + static frontend
│   │   ├── api/             # API routes
│   │   ├── agents/          # Processing agents
│   │   ├── models/          # Database models
│   │   └── services/        # Business logic
│   └── requirements.txt
├── frontend/
│   ├── src/                 # React source code
│   ├── dist/                # Built static files (created during build)
│   └── package.json
└── .replit.json            # Deployment configuration
```

### 🌐 API Routes in Production

All routes are available at your deployment URL:

- `GET /` - Serves React frontend
- `GET /health` - Health check endpoint
- `GET /api` - API info
- `POST /auth/signup` - User signup
- `POST /auth/login` - User login
- `POST /documents/upload` - Upload documents
- `GET /documents` - List documents
- `POST /chat` - RAG chat
- `POST /ingest/sql` - SQL data ingestion

### 🔒 Environment Variables

Required environment variables (already configured in Replit):

- `DATABASE_URL` - PostgreSQL connection with pgvector
- `OPENAI_API_KEY` - OpenAI API key for embeddings and chat
- `SESSION_SECRET` - JWT secret for authentication

Optional variables:
- `EXTERNAL_DB_URL` - External database for SQL ingestion
- `OCR_ENABLED` - Enable OCR processing (default: true)
- `UPLOAD_MAX_SIZE` - Max file size in bytes (default: 52428800)

### ✨ Production Features

**Automatic Scaling:**
- Scales up during high traffic
- Scales down during low traffic
- Cost-efficient resource usage

**Health Monitoring:**
- `/health` endpoint for health checks
- Automatic restarts on failures

**Static Asset Serving:**
- Optimized Vite build with minification
- Gzip compression for faster loading
- Efficient caching headers

### 🧪 Testing Before Deployment

The Dev Server workflow mirrors production:

```bash
# What the Dev Server runs:
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

Test your app locally before deploying:
1. Make sure Dev Server workflow is running
2. Open the webview (port 5000)
3. Test all features (signup, upload, chat, SQL ingestion)
4. Verify everything works as expected

### 📊 Resource Recommendations

**Minimum (Light Usage):**
- 0.5 vCPU, 1 GiB RAM
- 1-2 max instances
- Good for demos and testing

**Recommended (Production):**
- 1 vCPU, 2 GiB RAM
- 3-5 max instances
- Handles moderate traffic with AI processing

**High Traffic:**
- 2 vCPU, 4 GiB RAM
- 5-10 max instances
- Handles heavy document processing and concurrent users

### 🐛 Troubleshooting

**Build fails:**
- Check that Node.js dependencies install correctly
- Verify `frontend/package.json` is valid
- Review build logs for specific errors

**App doesn't start:**
- Verify Python dependencies are installed
- Check that PostgreSQL is connected (DATABASE_URL)
- Ensure OpenAI API key is set (OPENAI_API_KEY)
- Review run command logs

**Frontend not loading:**
- Confirm `frontend/dist` directory exists after build
- Check that static file routes are configured in `backend/app/main.py`
- Verify build completed successfully

**API endpoints fail:**
- Check DATABASE_URL is correct
- Verify OPENAI_API_KEY is valid
- Review backend logs for errors
- Ensure database migrations ran

### 🎯 Post-Deployment Checklist

After deploying, verify:

- ✅ Health check responds at `/health`
- ✅ Frontend loads at root URL `/`
- ✅ Login/signup works
- ✅ Document upload and processing works
- ✅ RAG chat returns answers with citations
- ✅ SQL ingestion (if configured)
- ✅ All agent pipeline steps complete

### 📈 Monitoring

Monitor your deployment:
- Check Replit deployment dashboard
- Review application logs
- Monitor resource usage (CPU, memory)
- Track scaling events

### 🔄 Updating Your Deployment

To update your deployed app:
1. Make changes in your Replit workspace
2. Test changes with Dev Server workflow
3. Re-deploy from Replit interface
4. Replit rebuilds and restarts automatically

---

**Your Multi-RAG application is ready to deploy!** 🚀

Click the Deploy button in Replit to publish your app to the world.
