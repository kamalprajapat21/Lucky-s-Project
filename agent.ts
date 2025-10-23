/// <reference types="node" />
import dotenv from "dotenv";
dotenv.config();
import { Langbase } from "langbase";
import { WorkflowStepError, successEnvelope, errorEnvelope, withRetries, isOverloadedError, mergeEnvelope } from "./app/api/errors"; // Keeping relative path if bundler copies root; adjust if build fails

// Weather and AQI data fetching tool
const weatherAQIToolSchema = {
  "type": "function" as const,
  "function": {
    "name": "fetch_weather_aqi_data",
    "description": "Fetch current weather and AQI data for a given location",
    "parameters": {
      "type": "object",
      "required": ["location"],
      "properties": {
        "location": {
          "type": "string",
          "description": "City name, e.g. Delhi, Mumbai"
        }
      },
      "additionalProperties": false
    },
    "strict": true
  }
};

// Hospital data analysis tool
const hospitalDataToolSchema = {
  "type": "function" as const,
  "function": {
    "name": "analyze_hospital_data",
    "description": "Analyze historical hospital admission patterns and current capacity",
    "parameters": {
      "type": "object",
      "required": ["department", "timeframe"],
      "properties": {
        "department": {
          "type": "string",
          "description": "Hospital department: respiratory, viral, ICU, general"
        },
        "timeframe": {
          "type": "string",
          "description": "Analysis timeframe: 7days, 15days, 30days"
        }
      },
      "additionalProperties": false
    },
    "strict": true
  }
};

// Trend analysis tool
const trendAnalysisToolSchema = {
  "type": "function" as const,
  "function": {
    "name": "analyze_health_trends",
    "description": "Analyze health-related search trends and social media patterns",
    "parameters": {
      "type": "object",
      "required": ["keywords", "region"],
      "properties": {
        "keywords": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Health keywords to track: fever, cough, respiratory"
        },
        "region": {
          "type": "string",
          "description": "Geographic region for trend analysis"
        }
      },
      "additionalProperties": false
    },
    "strict": true
  }
};

// Dummy tool implementations
async function fetch_weather_aqi_data(location: string) {
  // Simulate API call to weather/AQI service
  return JSON.stringify({
    location,
    aqi: 320,
    weather: "Hazy",
    temperature: 28,
    humidity: 65,
    pm25: 180,
    timestamp: new Date().toISOString()
  });
}

async function analyze_hospital_data(department: string, timeframe: string) {
  // Simulate hospital database analysis
  return JSON.stringify({
    department,
    timeframe,
    current_capacity: 75,
    historical_average: 60,
    trend: "increasing",
    predicted_surge: 40,
    confidence: 0.85
  });
}

async function analyze_health_trends(keywords: string[], region: string) {
  // Simulate trend analysis
  return JSON.stringify({
    keywords,
    region,
    trend_score: 85,
    search_volume_increase: 45,
    social_mentions: 1250,
    sentiment: "concerned"
  });
}

interface StepResult<T = any> { id: string; status: 'ok' | 'skipped' | 'error'; output?: T; error?: any; }

async function healEyeWorkflow({ input, env }: { input: string; env: any }) {
  const apiKey = process.env.LANGBASE_API_KEY;
  if (!apiKey) {
    throw new Error("LANGBASE_API_KEY missing. Set it in .env and restart the process.");
  }
  if (!/^user_|^org_/.test(apiKey)) {
    console.warn("[heal-eye] Unexpected Langbase API key prefix. Key should start with user_ or org_. Provided:", apiKey.slice(0, 8));
  }
  const langbase = new Langbase({
    apiKey,
  });

  const workflow = langbase.workflow();
  const { step } = workflow;

  const stepMeta: StepResult[] = [];
  try {
    // Step 1: Data Collection - Fetch relevant memories and external data
    let contextData: any[] = [];
    try {
      contextData = await step({
        id: "collect_context_data",
        run: async () => {
          const memories = await langbase.memories.retrieve({
            query: input,
            memory: [
              { name: "hospital-records-1760877450386" },
              { name: "health-trends-data-p8ygrven" },
              { name: "festival-calendar-w7obm9ap" },
              { name: "medical-protocols-hkivdz37" }
            ],
          });
          return memories;
        },
      });
      stepMeta.push({ id: 'collect_context_data', status: 'ok', output: contextData.length });
    } catch (e) {
      stepMeta.push({ id: 'collect_context_data', status: 'error', error: errorEnvelope(e).error });
      throw new WorkflowStepError('collect_context_data', 'Failed to retrieve context data', { step: 'collect_context_data', original: (e as any)?.message });
    }

    // Step 2: Real-time Data Analysis with Tools
    let dataAnalysis: any = null;
    try {
      dataAnalysis = await step({
        id: "analyze_realtime_data",
        run: async () => {
          let inputMessages: any[] = [
            {
              role: "user",
              content: `Analyze current health situation for: ${input}. Use available tools to fetch weather/AQI data, hospital patterns, and health trends.`
            },
          ];

          // Check if OpenAI API key is available, otherwise use Google Gemini
          const hasOpenAIKey = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('AIzaSy');
          const model = hasOpenAIKey ? "openai:gpt-5-mini-2025-08-07" : "google:gemini-2.5-flash";
          const apiKey = hasOpenAIKey ? process.env.OPENAI_API_KEY : process.env.GOOGLE_API_KEY;

          const runModel = async (targetModel: string) => langbase.agent.run({
            model: targetModel,
            apiKey,
            instructions: `You are HEAL-EYE's data analysis module. Use the available tools to gather comprehensive data about current health conditions, weather/AQI, hospital patterns, and health trends. Context from memories: ${contextData.map((m) => m.text).join("\n")}`,
            input: inputMessages,
            tools: [weatherAQIToolSchema, hospitalDataToolSchema, trendAnalysisToolSchema],
            stream: false,
          });
          let response;
          try {
            response = await withRetries(() => runModel(model));
          } catch (e: any) {
            if (isOverloadedError(e?.message)) {
              const fallback = hasOpenAIKey ? "google:gemini-2.5-flash" : "openai:gpt-5-mini-2025-08-07";
              response = await runModel(fallback);
              inputMessages.push({ role: 'system', content: `Model overloaded. Fell back to ${fallback}.` });
            } else throw e;
          }

          inputMessages.push(response.choices[0].message);

          const toolCalls = response.choices[0].message.tool_calls;
          const hasToolCalls = toolCalls && toolCalls.length > 0;

          if (hasToolCalls) {
            for (const toolCall of toolCalls) {
              const { name, arguments: args } = toolCall.function;
              let result;

              switch (name) {
                case 'fetch_weather_aqi_data':
                  const weatherArgs = JSON.parse(args);
                  result = await fetch_weather_aqi_data(weatherArgs.location);
                  break;
                case 'analyze_hospital_data':
                  const hospitalArgs = JSON.parse(args);
                  result = await analyze_hospital_data(hospitalArgs.department, hospitalArgs.timeframe);
                  break;
                case 'analyze_health_trends':
                  const trendArgs = JSON.parse(args);
                  result = await analyze_health_trends(trendArgs.keywords, trendArgs.region);
                  break;
                default:
                  result = "Tool not found";
              }

              inputMessages.push({
                name,
                tool_call_id: toolCall.id,
                role: 'tool',
                content: result,
              });
            }

            const summarize = async (targetModel: string) => langbase.agent.run({
              model: targetModel,
              apiKey,
              instructions: "Summarize the collected data and identify key patterns for health prediction.",
              input: inputMessages,
              stream: false,
            });
            let finalResponse;
            try {
              finalResponse = await withRetries(() => summarize(model));
            } catch (e: any) {
              if (isOverloadedError(e?.message)) {
                const fallback = hasOpenAIKey ? "google:gemini-2.5-flash" : "openai:gpt-5-mini-2025-08-07";
                finalResponse = await summarize(fallback);
                inputMessages.push({ role: 'system', content: `Summary fallback model used: ${fallback}` });
              } else throw e;
            }

            return finalResponse.output;
          }

          return response.choices[0].message.content || "No data analysis performed";
        },
      });
      stepMeta.push({ id: 'analyze_realtime_data', status: 'ok' });
    } catch (e) {
      stepMeta.push({ id: 'analyze_realtime_data', status: 'error', error: errorEnvelope(e).error });
      // Continue with degraded mode, downstream steps will likely fail gracefully
    }

    // Step 3: Predictive Analysis
    let prediction: any = null;
    if (dataAnalysis) {
      prediction = await step({
        id: "generate_predictions",
        run: async () => {
          const hasOpenAIKey = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('AIzaSy');
          const model = hasOpenAIKey ? "openai:gpt-5-mini-2025-08-07" : "google:gemini-2.5-flash";
          const apiKey = hasOpenAIKey ? process.env.OPENAI_API_KEY : process.env.GOOGLE_API_KEY;

          const runPred = async (targetModel: string) => langbase.agent.run({
            model: targetModel,
            apiKey,
            instructions: `You are HEAL-EYE's prediction engine. Based on the data analysis, generate:
          1. Patient surge predictions (15-30 day forecast)
          2. Confidence scores and explainability
          3. Department-wise breakdown (respiratory, viral, ICU, general)
          4. Risk factors and contributing elements
          
          Data Analysis: ${dataAnalysis}
          Context: ${contextData.map((m) => m.text).join("\n")}`,
            input: [
              { role: "user", content: `Generate detailed health surge predictions for: ${input}` },
            ],
            stream: false,
          });
          let predResp;
          try {
            predResp = await withRetries(() => runPred(model));
          } catch (e: any) {
            if (isOverloadedError(e?.message)) {
              const fallback = hasOpenAIKey ? "google:gemini-2.5-flash" : "openai:gpt-5-mini-2025-08-07";
              predResp = await runPred(fallback);
            } else throw e;
          }
          return predResp.output;
        },
      });
      stepMeta.push({ id: 'generate_predictions', status: 'ok' });
    } else {
      stepMeta.push({ id: 'generate_predictions', status: 'skipped', error: { code: 'DEPENDENCY_FAILED', message: 'Skipped due to dataAnalysis error' } });
    }

    // Step 4: Decision Engine - Generate Actionable Recommendations
    let recommendations: any = null;
    if (prediction) {
      recommendations = await step({
        id: "generate_recommendations",
        run: async () => {
          const hasOpenAIKey = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('AIzaSy');
          const model = hasOpenAIKey ? "openai:gpt-5-mini-2025-08-07" : "google:gemini-2.5-flash";
          const apiKey = hasOpenAIKey ? process.env.OPENAI_API_KEY : process.env.GOOGLE_API_KEY;

          const runRec = async (targetModel: string) => langbase.agent.run({
            model: targetModel,
            apiKey,
            instructions: `You are HEAL-EYE's decision engine. Convert predictions into specific, actionable recommendations:
          1. Staffing adjustments (nurses, doctors, specialists)
          2. Medical supply orders (oxygen, medicines, equipment)
          3. Infrastructure preparation (beds, isolation wards)
          4. Timeline for implementation
          5. Priority levels (urgent, moderate, low)
          
          Predictions: ${prediction}`,
            input: [
              { role: "user", content: `Generate actionable hospital recommendations based on the predictions.` },
            ],
            stream: false,
          });
          let recResp;
          try {
            recResp = await withRetries(() => runRec(model));
          } catch (e: any) {
            if (isOverloadedError(e?.message)) {
              const fallback = hasOpenAIKey ? "google:gemini-2.5-flash" : "openai:gpt-5-mini-2025-08-07";
              recResp = await runRec(fallback);
            } else throw e;
          }
          return recResp.output;
        },
      });
      stepMeta.push({ id: 'generate_recommendations', status: 'ok' });
    } else {
      stepMeta.push({ id: 'generate_recommendations', status: 'skipped', error: { code: 'DEPENDENCY_FAILED', message: 'Skipped due to prediction error' } });
    }

    // Step 5: Public Health Alerts
    let publicAlerts: any = null;
    if (recommendations) {
      publicAlerts = await step({
        id: "generate_public_alerts",
        run: async () => {
          const hasOpenAIKey = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('AIzaSy');
          const model = hasOpenAIKey ? "openai:gpt-5-mini-2025-08-07" : "google:gemini-2.5-flash";
          const apiKey = hasOpenAIKey ? process.env.OPENAI_API_KEY : process.env.GOOGLE_API_KEY;

          const runAlerts = async (targetModel: string) => langbase.agent.run({
            model: targetModel,
            apiKey,
            instructions: `You are HEAL-EYE's public communication module. Generate public health alerts in both Hindi and English:
          1. Clear, actionable advice for citizens
          2. Preventive measures
          3. When to seek medical attention
          4. Emergency contact information
          5. Use simple, accessible language
          
          Predictions: ${prediction}
          Recommendations: ${recommendations}`,
            input: [
              { role: "user", content: `Generate public health alerts and preventive guidance.` },
            ],
            stream: false,
          });
          let alertResp;
          try {
            alertResp = await withRetries(() => runAlerts(model));
          } catch (e: any) {
            if (isOverloadedError(e?.message)) {
              const fallback = hasOpenAIKey ? "google:gemini-2.5-flash" : "openai:gpt-5-mini-2025-08-07";
              alertResp = await runAlerts(fallback);
            } else throw e;
          }
          return alertResp.output;
        },
      });
      stepMeta.push({ id: 'generate_public_alerts', status: 'ok' });
    } else {
      stepMeta.push({ id: 'generate_public_alerts', status: 'skipped', error: { code: 'DEPENDENCY_FAILED', message: 'Skipped due to recommendations error' } });
    }

    // Step 6: Conversational Response (Hindi/English support)
    let conversationalResponse: any = null;
    conversationalResponse = await step({
      id: "generate_conversational_response",
      run: async () => {
        const hasOpenAIKey = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('AIzaSy');
        const model = hasOpenAIKey ? "openai:gpt-5-mini-2025-08-07" : "google:gemini-2.5-flash";
        const apiKey = hasOpenAIKey ? process.env.OPENAI_API_KEY : process.env.GOOGLE_API_KEY;

        const runConv = async (targetModel: string) => langbase.agent.run({
          model: targetModel,
          apiKey,
          instructions: `You are HEAL-EYE, an AI healthcare assistant for Indian hospitals. Respond in a conversational manner, supporting both Hindi and English. Be empathetic, professional, and provide clear explanations.

          Key capabilities:
          - Predict patient surges during festivals/seasonal changes
          - Provide actionable hospital recommendations
          - Generate public health alerts
          - Explain predictions with confidence scores
          
          Available data:
          - Data Analysis: ${dataAnalysis}
          - Predictions: ${prediction}
          - Recommendations: ${recommendations}
          - Public Alerts: ${publicAlerts}`,
          input: [
            { role: "user", content: input },
          ],
          stream: false,
        });
        let convResp;
        try {
          convResp = await withRetries(() => runConv(model));
        } catch (e: any) {
          if (isOverloadedError(e?.message)) {
            const fallback = hasOpenAIKey ? "google:gemini-2.5-flash" : "openai:gpt-5-mini-2025-08-07";
            convResp = await runConv(fallback);
          } else throw e;
        }
        return convResp.output;
      },
    });
    stepMeta.push({ id: 'generate_conversational_response', status: 'ok' });

    // Compile final response
    const finalResult = successEnvelope({
      conversational_response: conversationalResponse,
      detailed_analysis: {
        data_analysis: dataAnalysis,
        predictions: prediction,
        recommendations: recommendations,
        public_alerts: publicAlerts
      },
      timestamp: new Date().toISOString(),
      confidence_level: "High",
      system_status: "Active"
    }, { steps: stepMeta });

    return mergeEnvelope(finalResult);

  } catch (err) {
    console.error("HEAL-EYE Workflow error:", err);
    return errorEnvelope(err);
  } finally {
    await workflow.end();
  }
}

async function main(event: any, env: any) {
  const { input } = await event.json();
  const result = await healEyeWorkflow({ input, env });
  return result;
}

export default main;

(async () => {
  const event = {
    json: async () => ({
      input: 'Your input goes here.',
    }),
  };
  const result = await main(event, {});
  console.log(JSON.stringify(result, null, 2));
})();