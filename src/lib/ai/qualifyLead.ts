import OpenAI, { AzureOpenAI } from 'openai';

const useAzure = !!process.env.AZURE_OPENAI_API_KEY && !!process.env.AZURE_OPENAI_ENDPOINT;

const openai = useAzure
  ? new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5-nano',
      apiVersion: '2024-04-01-preview'
    })
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build', // Fallback to avoid build errors if env is missing
    });

export interface QualificationResult {
  budget_mentioned: boolean;
  project_type: string | null;
}

export async function qualifyLeadMessage(message: string): Promise<QualificationResult> {
  if (!process.env.OPENAI_API_KEY && !process.env.AZURE_OPENAI_API_KEY) {
    console.warn("No OpenAI API Key found, using mock qualification.");
    return {
      budget_mentioned: message.toLowerCase().includes('$') || message.toLowerCase().includes('budget'),
      project_type: message.toLowerCase().includes('commercial') ? 'Commercial' : (message.toLowerCase().includes('residential') ? 'Residential' : null)
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: useAzure ? process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5-nano' : 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a lead qualification assistant for an architecture/interior design studio.
Analyze the user's message and determine:
1. Did they mention a budget? (true/false)
2. What is the project type? (e.g., "Commercial", "Residential", "Renovation", "Interior"). Return null if not specified.

Respond ONLY in valid JSON format:
{
  "budget_mentioned": boolean,
  "project_type": string | null
}`
        },
        {
          role: 'user',
          content: message
        }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        budget_mentioned: Boolean(parsed.budget_mentioned),
        project_type: parsed.project_type || null,
      };
    }
  } catch (error) {
    console.error('Failed to qualify lead via AI:', error);
  }

  return { budget_mentioned: false, project_type: null };
}
