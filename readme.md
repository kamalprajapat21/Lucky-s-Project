# heal-eye-agent-699b

This is an AI agent project created by Command.new

## Project Structure

```
├── agent.ts                # Main workflow implementation
├── package.json            # Project dependencies and scripts
├── readme.md               # Project readme file
├── .env.example            # Environment variables template
└── app/                    # Agent App
    ├── api/                # API endpoints
    ├── src/                # React components and utilities
    ├── public/             # Static assets
    ├── .env.example        # Environment variables template
    ├── package.json        # Project dependencies and scripts
    ├── readme.md           # App readme file
    └── vite.config.ts      # Vite configuration for the app
```

## Prerequisites

- Node.js 21 or higher
- npm or pnpm package manager
- Langbase API key

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

3. Add your API keys to `.env`:

```env
# Get API key from: https://command.new/helloak921173071/heal-eye-agent-699b?tab=api
LANGBASE_API_KEY=your_langbase_api_key_here

# Your OpenAI API key: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Add any other required environment variables
```

## Usage

### Running the Agent

Execute the agent with:

```bash
pnpm run agent
```

This will run the agent with the default test input defined in [`agent.ts`](agent.ts).

### Customizing Input

To test with your own text, modify the input in the IIFE at the bottom of [`agent.ts`](agent.ts):

```typescript
const event = {
	json: async () => ({
		input: `Your custom text to summarize goes here.`
	})
};
```

### Integration

The agent exports a default function that can be integrated into other applications:

```typescript
import agent from './agent.ts';

const event = {
	json: async () => ({ input: 'Text to summarize' })
};

const result = await agent(event, {});
console.log(result.summary);
```

## Agent App

The project includes a React-based agent app in the [`app/`](app/) directory with:

- UI components built with modern React patterns
- API integration for agent communication
- Responsive design with Tailwind CSS
- Development server with Vite and Hono

### Installation

1. Install dependencies:

To set up the app, navigate to the [`app/`](app/) directory and install dependencies:

```bash
cd app
pnpm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

3. Add your API keys to `.env`:

```env
# Get API key from: https://command.new/helloak921173071/heal-eye-agent-699b
LANGBASE_API_KEY=your_langbase_api_key_here

# Your OpenAI API key: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Add any other required environment variables
```

### Usage

To run the application, use:

```bash
pnpm dev
```

## HEAL-EYE System Architecture

### 🔮 Overview
HEAL-EYE is an AI-based predictive hospital management system that forecasts patient surges 15-30 days in advance using environmental, cultural, and social data patterns.

**Tagline:** "Predict. Prepare. Protect."

### 🎯 Problem Solved
- Prevents hospital overcrowding during festivals, pollution spikes, and disease outbreaks
- Eliminates last-minute staff/resource shortages
- Provides actionable recommendations for hospital administration
- Sends preventive health alerts to citizens (Hindi + English)

### 🧩 System Components

#### 1. Data Collection Layer
- **Environmental Data**: AQI, weather, pollution levels (via API integration)
- **Cultural Calendar**: Festival dates, holidays (stored in Langbase Memory)
- **Social Signals**: Health trend keywords from social media/news
- **Hospital Records**: Historical admission patterns (stored in Langbase Memory)

#### 2. AI Prediction Engine (`agent.ts`)
- Multi-step workflow using Langbase Agent SDK
- Memory-augmented retrieval from 4 knowledge bases:
  - `hospital-records-1760877450386`
  - `health-trends-data-p8ygrven`
  - `festival-calendar-w7obm9ap`
  - `medical-protocols-hkivdz37`
- Predictive analysis using OpenAI GPT-4 or Google Gemini
- Tool-calling for real-time data (weather, AQI, hospital capacity)

#### 3. Recommendation System
Generates:
- Staffing adjustments (doctors, nurses, specialists)
- Medical supply orders (oxygen, medicines, equipment)
- Infrastructure preparation (beds, isolation wards)
- Timeline and priority levels (urgent/moderate/low)

#### 4. Public Health Alerts
- Bilingual messages (Hindi + English)
- Preventive measures and emergency contact info
- Distributed via frontend dashboard

#### 5. Error Handling & Resilience
- **Structured Errors**: Custom error classes in `app/api/errors.ts`
  - `ValidationError`, `AuthError`, `ExternalServiceError`, `WorkflowStepError`
- **Retry Logic**: Exponential backoff for overloaded AI models (3 retries, 500ms-2s delays)
- **Model Fallback**: Auto-switches between OpenAI and Google Gemini on failure
- **Step Isolation**: Each workflow step has try/catch; failures don't crash entire pipeline
- **Partial Results**: Returns completed steps even if downstream steps fail

### 🚀 Deployment on Vercel

#### Prerequisites
- Vercel account (free tier works)
- Langbase API key ([Get here](https://langbase.com/docs/api-reference/api-keys))
- OpenAI API key (optional, [Get here](https://platform.openai.com/api-keys))
- Google AI API key (optional, [Get here](https://ai.google.dev/))

#### Environment Variables
Set these in Vercel Project Settings → Environment Variables:

```env
LANGBASE_API_KEY=user_xxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxx
GOOGLE_API_KEY=AIzaxxxxxxxxxxxxxx
NODE_ENV=production
```

#### Deployment Steps

1. **Install Vercel CLI** (if not installed):
```powershell
npm install -g vercel
```

2. **Login to Vercel**:
```powershell
vercel login
```

3. **Deploy from project root**:
```powershell
cd D:\lucky
vercel --prod
```

4. **Verify Deployment**:
- Frontend: `https://your-project.vercel.app/`
- API Health: `https://your-project.vercel.app/api/`
- Langbase Endpoint: `POST https://your-project.vercel.app/api/langbase`

#### Configuration Files

**`vercel.json`** (root):
```json
{
  "version": 2,
  "builds": [
    { "src": "app/api/vercel.ts", "use": "@vercel/node" },
    { "src": "app/package.json", "use": "@vercel/static-build", "config": { "distDir": "app/dist" } }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "app/api/vercel.ts" },
    { "src": "/(.*)", "dest": "app/dist/$1" }
  ]
}
```

**`app/api/vercel.ts`**:
Exports the Hono app for serverless runtime (no `serve()` call needed on Vercel).

#### Build Process
- Frontend: Vite builds to `app/dist` (static assets)
- Backend: Hono API bundled as serverless function at `app/api/vercel.ts`
- Output verified by: `npm run build` (runs from root, delegates to `app`)

#### Troubleshooting

**404 on /api/langbase:**
- Ensure `app/api/vercel.ts` exists and exports default Hono app
- Verify routes in `vercel.json` point to correct paths
- Check Vercel logs for runtime errors

**"No Output Directory named dist" error:**
- Ensure `vite.config.js` has `outDir: 'dist'` (no SSR build)
- Verify `vercel.json` distDir is `app/dist` (relative to repo root)
- Run `npm run build` locally to confirm `app/dist` folder is created

**Invalid API Key errors:**
- Regenerate Langbase API key from dashboard
- Ensure env vars are set in Vercel (not just local `.env`)
- Restart deployment after adding environment variables

**Model Overloaded errors:**
- System auto-retries 3 times with exponential backoff
- Falls back to alternate model (Google ↔ OpenAI)
- Check Vercel logs for retry attempts and fallback messages

#### API Testing

**Health Check:**
```bash
curl https://your-project.vercel.app/api/
```

**Langbase Endpoint:**
```bash
curl -X POST https://your-project.vercel.app/api/langbase \
  -H "Content-Type: application/json" \
  -d '{"input": "Predict patient surge for next Diwali in Delhi"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "conversational_response": "...",
    "detailed_analysis": {
      "data_analysis": "...",
      "predictions": "...",
      "recommendations": "...",
      "public_alerts": "..."
    },
    "timestamp": "2025-10-24T...",
    "confidence_level": "High",
    "system_status": "Active"
  },
  "meta": {
    "steps": [
      {"id": "collect_context_data", "status": "ok"},
      {"id": "analyze_realtime_data", "status": "ok"},
      ...
    ]
  }
}
```

### 🔔 Future Enhancements
- National-level health dashboard integration
- Disease outbreak early detection system
- AI chatbot for citizens ("Health Alert Bot")
- Integration with wearable devices for live health stats
- Real-time SMS/WhatsApp alerts via Twilio API

### 📊 Example Use Case
**Scenario:** Diwali approaching, AQI data shows high pollution levels

1. **AI Analysis**: Predicts 40% surge in respiratory cases starting Nov 2
2. **Hospital Alert**: "Deploy 3 extra chest specialists, order 20 oxygen cylinders"
3. **Public Advisory**: "मास्क पहनें, बाहर की गतिविधियाँ कम करें" (Wear masks, reduce outdoor activities)
4. **Result**: Hospital prepared, reduced patient wait times, better outcomes

## Support

For questions or issues, please refer to the [Langbase documentation](https://langbase.com/docs).
