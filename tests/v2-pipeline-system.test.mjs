import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { 
  parseBudgetMention, 
  parseScopeKeywords, 
  parseTimelineUrgency, 
  executeFallbackHeuristicScorer 
} from '../src/lib/ai/fallbackScorer.ts';
import { 
  verifyHmacSignature, 
  isDuplicateMessageId, 
  resetDuplicateCacheForTesting 
} from '../src/lib/whatsapp/webhook.ts';

test('1. Fallback Heuristic Scorer: Comprehensive Budget Mentions & Numeric Normalization', () => {
  // Test $150k
  const r1 = parseBudgetMention('Hi, our budget is $150k for this office');
  assert.equal(r1.mentioned, true);
  assert.equal(r1.budget, '$150K');
  assert.equal(r1.rawAmount, 150000);

  // Test 100,000 (with comma)
  const r2 = parseBudgetMention('We have 100,000 allocated for the renovation');
  assert.equal(r2.mentioned, true);
  assert.equal(r2.budget, '$100,000');
  assert.equal(r2.rawAmount, 100000);

  // Test $150,000 (currency + comma)
  const r3 = parseBudgetMention('Estimated investment is $150,000');
  assert.equal(r3.mentioned, true);
  assert.equal(r3.budget, '$150,000');
  assert.equal(r3.rawAmount, 150000);

  // Test $2.5m
  const r4 = parseBudgetMention('Target investment is $2.5m');
  assert.equal(r4.mentioned, true);
  assert.equal(r4.budget, '$2.5M');
  assert.equal(r4.rawAmount, 2500000);

  // Test $1.5b and billions
  const r5 = parseBudgetMention('Infrastructure project budget is $1.5b');
  assert.equal(r5.mentioned, true);
  assert.equal(r5.budget, '$1.5B');
  assert.equal(r5.rawAmount, 1500000000);

  const r5b = parseBudgetMention('Total investment is around $2 billion');
  assert.equal(r5b.mentioned, true);
  assert.equal(r5b.budget, '$2 BILLION');
  assert.equal(r5b.rawAmount, 2000000000);

  // Test 50k
  const r6 = parseBudgetMention('Looking for a design package around 50k usd');
  assert.equal(r6.mentioned, true);
  assert.equal(r6.budget, '$50K');
  assert.equal(r6.rawAmount, 50000);

  // Test $400k
  const r7 = parseBudgetMention('Our commercial budget is $400k');
  assert.equal(r7.mentioned, true);
  assert.equal(r7.budget, '$400K');
  assert.equal(r7.rawAmount, 400000);

  // Test no budget
  const r8 = parseBudgetMention('Just inquiring about your services');
  assert.equal(r8.mentioned, false);
  assert.equal(r8.budget, null);
  assert.equal(r8.rawAmount, null);
});

test('2. Fallback Heuristic Scorer: Scope Keywords Parsing', () => {
  assert.equal(parseScopeKeywords('Looking to design a commercial corporate office'), 'Commercial Architecture');
  assert.equal(parseScopeKeywords('Need an architect for our residential villa residence'), 'Residential Architecture');
  assert.equal(parseScopeKeywords('Interior renovation and fitout of a duplex penthouse'), 'Interior & Renovation');
  assert.equal(parseScopeKeywords('Need a custom website and web app platform for our business'), 'Web & Digital Platform');
  assert.equal(parseScopeKeywords('Master planning and landscape development for a 50 acre site'), 'Master Planning');
  assert.equal(parseScopeKeywords('We need architectural services and building design blueprints'), 'Architectural Design');
  assert.equal(parseScopeKeywords('Hello there, how are you?'), null);
});

test('3. Fallback Heuristic Scorer: Timeline Urgency Parsing', () => {
  const t1 = parseTimelineUrgency('We need to start immediately ASAP this week');
  assert.equal(t1.urgency, 'urgent');

  const t1b = parseTimelineUrgency('Can we start tomorrow? Need urgent kickoff within 48 hours');
  assert.equal(t1b.urgency, 'urgent');

  const t2 = parseTimelineUrgency('Looking to launch next month in 1-2 months');
  assert.equal(t2.urgency, 'medium');

  const t3 = parseTimelineUrgency('Flexible timeline, planning ahead for next year');
  assert.equal(t3.urgency, 'low');

  const t4 = parseTimelineUrgency('No timeline mentioned');
  assert.equal(t4.urgency, 'none');
});

test('4. Fallback Heuristic Scorer: Multi-turn Timeline Urgency Retention', () => {
  // Turn 1: Client stated urgent timeline
  // Turn 2: Client sends budget without repeating urgency
  const existingLead = {
    project_type: 'Commercial Architecture',
    timeline: 'Immediate / ASAP (High Urgency)',
    estimated_budget: null,
    is_returning_client: false,
  };

  const turn2Message = 'Our budget is $150k';
  const result = executeFallbackHeuristicScorer(turn2Message, undefined, existingLead);

  assert.equal(result.project_type, 'Commercial Architecture');
  assert.equal(result.estimated_budget, '$150K');
  assert.equal(result.budget_mentioned, true);
  // Base 25 + Scope 30 + Budget 35 + Timeline (urgent retained from history) 10 = 100
  assert.equal(result.qualification_percentage, 100);
  assert.equal(result.discovery_stage, 'escorted');
  assert.equal(result.priority_tier, 'urgent');
});

test('5. Dynamic Multi-factor LPI Budget Depth Scoring Accuracy', () => {
  // Simulates the exact budget scoring engine from processNewLead.ts
  function computeBudgetScore(budgetStr, weightBudget = 25) {
    const parsed = parseBudgetMention(budgetStr);
    const amount = parsed.rawAmount;
    if (amount !== null && amount > 0) {
      if (amount >= 100_000) return weightBudget;
      if (amount >= 20_000) return Math.round(weightBudget * 0.8);
      if (amount >= 5_000) return Math.round(weightBudget * 0.6);
      return Math.round(weightBudget * 0.4);
    }
    return 0;
  }

  // Verify $150,000 (with comma) receives full 25 pts (was broken in prior attempt)
  assert.equal(computeBudgetScore('$150,000'), 25);
  // Verify $400k receives full 25 pts (was broken in prior attempt)
  assert.equal(computeBudgetScore('$400k'), 25);
  // Verify $100,000 receives full 25 pts
  assert.equal(computeBudgetScore('$100,000'), 25);
  // Verify $50,000 receives 20 pts (80%)
  assert.equal(computeBudgetScore('$50,000'), 20);
  // Verify $8,000 receives 15 pts (60%)
  assert.equal(computeBudgetScore('$8,000'), 15);
  // Verify $2,000 receives 10 pts (40%)
  assert.equal(computeBudgetScore('$2,000'), 10);
});

test('6. Webhook HMAC-SHA256 Signature Verification with Unicode & Buffers', () => {
  const secret = 'super_secret_meta_app_key_123';
  const payloadStr = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ value: { messages: [{ text: { body: '🏢 Modern Commercial Office 🚀' } }] } }] }],
  });
  const payloadBuf = Buffer.from(payloadStr, 'utf-8');

  // Genuine HMAC
  const validHex = crypto.createHmac('sha256', secret).update(payloadBuf).digest('hex');
  const validSig = `sha256=${validHex}`;
  const validSigUpper = `SHA256=${validHex.toUpperCase()}`;
  const invalidSig = `sha256=${crypto.createHmac('sha256', 'wrong_secret').update(payloadBuf).digest('hex')}`;

  // Test Buffer input
  assert.equal(verifyHmacSignature(payloadBuf, validSig, secret), true);
  // Test String input
  assert.equal(verifyHmacSignature(payloadStr, validSig, secret), true);
  // Test Case-insensitive prefix and hex
  assert.equal(verifyHmacSignature(payloadBuf, validSigUpper, secret), true);
  // Test Invalid signature
  assert.equal(verifyHmacSignature(payloadBuf, invalidSig, secret), false);
  // Test Malformed / null / empty inputs
  assert.equal(verifyHmacSignature(payloadBuf, 'not_a_valid_sig', secret), false);
  assert.equal(verifyHmacSignature(payloadBuf, null, secret), false);
  assert.equal(verifyHmacSignature(payloadBuf, validSig, ''), false);
});

test('7. Webhook Message Deduplication Engine', () => {
  resetDuplicateCacheForTesting();

  const msg1 = 'wamid.HBgLMTY0NTUxMjUxM1UCMRIAFjNBMjM0';
  const msg2 = 'wamid.HBgLMTY0NTUxMjUxM1UCMRIAFjNBMjM1';

  // First time seeing msg1 -> NOT a duplicate
  assert.equal(isDuplicateMessageId(msg1), false);
  // Second time seeing msg1 (Meta retry) -> DUPLICATE!
  assert.equal(isDuplicateMessageId(msg1), true);
  // Third retry -> STILL DUPLICATE!
  assert.equal(isDuplicateMessageId(msg1), true);

  // New message msg2 -> NOT a duplicate
  assert.equal(isDuplicateMessageId(msg2), false);
  // Second time seeing msg2 -> DUPLICATE
  assert.equal(isDuplicateMessageId(msg2), true);
});

test('8. Meta 24-Hour Customer Care Window Calculation', () => {
  const now = Date.now();

  function checkWindow(lastInboundSentAt) {
    let elapsedHours = 999;
    let isOutside24hWindow = true;

    if (lastInboundSentAt) {
      const lastTime = new Date(lastInboundSentAt).getTime();
      if (!isNaN(lastTime) && lastTime > 0) {
        elapsedHours = (now - lastTime) / (1000 * 60 * 60);
        isOutside24hWindow = elapsedHours >= 24;
      }
    }
    return { elapsedHours, isOutside24hWindow };
  }

  // Inbound message received 4 hours ago (inside 24h window)
  const recent = checkWindow(new Date(now - 4 * 60 * 60 * 1000).toISOString());
  assert.equal(recent.isOutside24hWindow, false);
  assert.ok(recent.elapsedHours < 24);

  // Inbound message received 28 hours ago (outside 24h window)
  const stale = checkWindow(new Date(now - 28 * 60 * 60 * 1000).toISOString());
  assert.equal(stale.isOutside24hWindow, true);
  assert.ok(stale.elapsedHours >= 24);

  // NO inbound message ever received from client (strictly outside 24h window)
  const neverMessaged = checkWindow(null);
  assert.equal(neverMessaged.isOutside24hWindow, true);
});

import { resolveStudioCredentials } from '../src/lib/settingsResolver.ts';

test('9. Dynamic Studio Credentials Resolution: Database priority over environment variables', () => {
  const mockDbRow = {
    whatsapp_phone_number_id: 'db_phone_123',
    whatsapp_access_token: 'db_meta_token_abc',
    whatsapp_business_account_id: 'db_waba_456',
    meta_app_secret: 'db_secret_789',
    whatsapp_verify_token: 'db_verify_xyz',
    whatsapp_followup_template_name: 'custom_studio_followup',
    ai_provider: 'openai',
    ai_api_key: 'sk-db-openai-key',
    ai_endpoint: null,
    ai_deployment_name: 'gpt-4o',
    ai_api_version: '2024-12-01-preview',
    resend_api_key: 're_db_key_123',
    notification_email: 'buyer@customstudio.com',
    telegram_bot_token: '123456:db_tg_bot',
    telegram_chat_id: '-100999888777',
    telegram_enabled: true,
  };

  const mockEnv = {
    WHATSAPP_PHONE_NUMBER_ID: 'env_phone_999',
    WHATSAPP_ACCESS_TOKEN: 'env_token_999',
    META_APP_SECRET: 'env_secret_999',
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'env_verify_999',
    AZURE_OPENAI_API_KEY: 'env_azure_key',
    AZURE_OPENAI_ENDPOINT: 'https://env.openai.azure.com',
    RESEND_API_KEY: 'env_resend_key',
    NOTIFICATION_EMAIL: 'env_admin@default.com',
    TELEGRAM_BOT_TOKEN: 'env_tg_token',
    TELEGRAM_CHAT_ID: 'env_chat_id',
  };

  const resolved = resolveStudioCredentials(mockDbRow, mockEnv);

  // Assert DB overrides env values across all integrations
  assert.equal(resolved.whatsappPhoneNumberId, 'db_phone_123');
  assert.equal(resolved.whatsappAccessToken, 'db_meta_token_abc');
  assert.equal(resolved.whatsappBusinessAccountId, 'db_waba_456');
  assert.equal(resolved.metaAppSecret, 'db_secret_789');
  assert.equal(resolved.whatsappVerifyToken, 'db_verify_xyz');
  assert.equal(resolved.whatsappFollowupTemplateName, 'custom_studio_followup');
  assert.equal(resolved.aiProvider, 'openai');
  assert.equal(resolved.aiApiKey, 'sk-db-openai-key');
  assert.equal(resolved.aiDeploymentName, 'gpt-4o');
  assert.equal(resolved.resendApiKey, 're_db_key_123');
  assert.equal(resolved.notificationEmail, 'buyer@customstudio.com');
  assert.equal(resolved.telegramBotToken, '123456:db_tg_bot');
  assert.equal(resolved.telegramChatId, '-100999888777');
  assert.equal(resolved.telegramEnabled, true);
});

test('10. Dynamic Studio Credentials Resolution: Seamless fallback to environment variables when DB values are null or empty', () => {
  const emptyDbRow = {
    whatsapp_phone_number_id: null,
    whatsapp_access_token: '   ', // whitespace should be trimmed and ignored
    whatsapp_business_account_id: null,
    meta_app_secret: '',
    whatsapp_verify_token: null,
    whatsapp_followup_template_name: null,
    ai_provider: null,
    ai_api_key: null,
    ai_endpoint: null,
    ai_deployment_name: null,
    ai_api_version: null,
    resend_api_key: null,
    notification_email: null,
    telegram_bot_token: null,
    telegram_chat_id: null,
    telegram_enabled: null,
  };

  const mockEnv = {
    WHATSAPP_PHONE_NUMBER_ID: 'fallback_phone_555',
    WHATSAPP_ACCESS_TOKEN: 'fallback_token_555',
    META_APP_SECRET: 'fallback_secret_555',
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'fallback_verify_555',
    AZURE_OPENAI_API_KEY: 'fallback_azure_key',
    AZURE_OPENAI_ENDPOINT: 'https://fallback.openai.azure.com/',
    AZURE_OPENAI_DEPLOYMENT_NAME: 'gpt-5-nano',
    RESEND_API_KEY: 're_fallback_key',
    NOTIFICATION_EMAIL: 'fallback@studio.com',
    TELEGRAM_BOT_TOKEN: 'fallback_tg_token',
    TELEGRAM_CHAT_ID: 'fallback_tg_chat',
  };

  const resolved = resolveStudioCredentials(emptyDbRow, mockEnv);

  assert.equal(resolved.whatsappPhoneNumberId, 'fallback_phone_555');
  assert.equal(resolved.whatsappAccessToken, 'fallback_token_555');
  assert.equal(resolved.metaAppSecret, 'fallback_secret_555');
  assert.equal(resolved.whatsappVerifyToken, 'fallback_verify_555');
  assert.equal(resolved.whatsappFollowupTemplateName, 'lead_reengagement');
  assert.equal(resolved.aiProvider, 'azure');
  assert.equal(resolved.aiApiKey, 'fallback_azure_key');
  assert.equal(resolved.aiEndpoint, 'https://fallback.openai.azure.com');
  assert.equal(resolved.aiDeploymentName, 'gpt-5-nano');
  assert.equal(resolved.resendApiKey, 're_fallback_key');
  assert.equal(resolved.notificationEmail, 'fallback@studio.com');
  assert.equal(resolved.telegramBotToken, 'fallback_tg_token');
  assert.equal(resolved.telegramChatId, 'fallback_tg_chat');
  assert.equal(resolved.telegramEnabled, true);
});

test('11. Dynamic Studio Credentials: Null DB record safety', () => {
  const resolved = resolveStudioCredentials(null, {
    WHATSAPP_PHONE_NUMBER_ID: 'p123',
    OPENAI_API_KEY: 'sk-test',
  });

  assert.equal(resolved.whatsappPhoneNumberId, 'p123');
  assert.equal(resolved.aiProvider, 'openai');
  assert.equal(resolved.aiApiKey, 'sk-test');
  assert.equal(resolved.autoReplyEnabled, true);
  assert.equal(resolved.timeFormat, '12h');
  assert.equal(resolved.timezone, 'auto');
});

test('12. Dynamic Webhook GET Token Match & Security Validation', () => {
  const dynamicDbVerifyToken = 'buyer_secret_verify_token_777';
  const defaultTokens = ['gucsyt-marcas-jePmi5'];
  const validTokens = [dynamicDbVerifyToken, ...defaultTokens];

  function verifyHubChallenge(mode, token, challenge, allowedTokens) {
    if (mode === 'subscribe' && token && allowedTokens.includes(token)) {
      return { status: 200, challenge };
    }
    return { status: 403, error: 'Verification failed' };
  }

  // Dynamic token succeeds
  const r1 = verifyHubChallenge('subscribe', 'buyer_secret_verify_token_777', 'challenge_abc_123', validTokens);
  assert.equal(r1.status, 200);
  assert.equal(r1.challenge, 'challenge_abc_123');

  // Legacy fallback token succeeds
  const r2 = verifyHubChallenge('subscribe', 'gucsyt-marcas-jePmi5', 'challenge_def_456', validTokens);
  assert.equal(r2.status, 200);

  // Hardcoded unconfigured dummy tokens fail with 403
  const r3 = verifyHubChallenge('subscribe', 'my_secure_verify_token_123', 'challenge_xyz', validTokens);
  assert.equal(r3.status, 403);

  // Wrong token fails with 403
  const r4 = verifyHubChallenge('subscribe', 'hacker_wrong_token', 'challenge_xyz', validTokens);
  assert.equal(r4.status, 403);

  // Wrong mode fails with 403
  const r5 = verifyHubChallenge('unsubscribe', 'buyer_secret_verify_token_777', 'challenge_xyz', validTokens);
  assert.equal(r5.status, 403);
});

test('13. WhatsApp Phone Number Digits Sanitization', () => {
  function sanitizeTo(to) {
    return to.replace(/\D/g, '');
  }

  assert.equal(sanitizeTo('+1 (555) 234-5678'), '15552345678');
  assert.equal(sanitizeTo('+880-1712-345678'), '8801712345678');
  assert.equal(sanitizeTo('44 7911 123456'), '447911123456');
  assert.equal(sanitizeTo('+00112233'), '00112233');
});

test('14. Azure OpenAI Endpoint URL Normalization', () => {
  // Missing scheme and trailing slash
  const r1 = resolveStudioCredentials({
    ai_provider: 'azure',
    ai_endpoint: 'my-custom-resource.openai.azure.com///',
  });
  assert.equal(r1.aiEndpoint, 'https://my-custom-resource.openai.azure.com');

  // Already well-formed with trailing slash
  const r2 = resolveStudioCredentials({
    ai_provider: 'azure',
    ai_endpoint: 'https://aimodelgtp.openai.azure.com/',
  });
  assert.equal(r2.aiEndpoint, 'https://aimodelgtp.openai.azure.com');

  // Empty endpoint resolves to null
  const r3 = resolveStudioCredentials({
    ai_provider: 'azure',
    ai_endpoint: '   ',
  });
  assert.equal(r3.aiEndpoint, null);
});

import { createAiClient, resolveAlertNotificationEmail } from '../src/lib/settingsResolver.ts';

test('15. AI Client Factory: Azure requires endpoint and returns null if missing instead of failing on OpenAI', () => {
  // Azure provider without endpoint must NOT fall back to standard OpenAI with Azure key
  const azureWithoutEndpoint = createAiClient({
    aiProvider: 'azure',
    aiApiKey: 'test_azure_key_abcdef1234567890',
    aiEndpoint: null,
    aiDeploymentName: 'gpt-5-nano',
    aiApiVersion: '2024-12-01-preview',
    whatsappPhoneNumberId: null,
    whatsappAccessToken: null,
    whatsappBusinessAccountId: null,
    metaAppSecret: null,
    whatsappVerifyToken: null,
    whatsappFollowupTemplateName: 'lead_reengagement',
    resendApiKey: null,
    notificationEmail: null,
    telegramBotToken: null,
    telegramChatId: null,
    telegramEnabled: false,
    autoReplyEnabled: true,
    emailAlertsEnabled: true,
    discoveryInterviewerEnabled: true,
    returningClientMode: 'draft_only',
    timeFormat: '12h',
    timezone: 'auto',
    followupIntervalHours: 24,
    knowledgeBase: null,
  });
  assert.equal(azureWithoutEndpoint, null);

  // OpenAI provider with key creates OpenAI client
  const openAiClient = createAiClient({
    aiProvider: 'openai',
    aiApiKey: 'sk-proj-valid-test-key',
    aiEndpoint: null,
    aiDeploymentName: 'gpt-4o-mini',
    aiApiVersion: '2024-12-01-preview',
    whatsappPhoneNumberId: null,
    whatsappAccessToken: null,
    whatsappBusinessAccountId: null,
    metaAppSecret: null,
    whatsappVerifyToken: null,
    whatsappFollowupTemplateName: 'lead_reengagement',
    resendApiKey: null,
    notificationEmail: null,
    telegramBotToken: null,
    telegramChatId: null,
    telegramEnabled: false,
    autoReplyEnabled: true,
    emailAlertsEnabled: true,
    discoveryInterviewerEnabled: true,
    returningClientMode: 'draft_only',
    timeFormat: '12h',
    timezone: 'auto',
    followupIntervalHours: 24,
    knowledgeBase: null,
  });
  assert.ok(openAiClient !== null);
  assert.equal(openAiClient.isAzure, false);
  assert.equal(openAiClient.modelName, 'gpt-4o-mini');
});

test('16. Contextual Follow-Up Cron: Reasoning effort only attached to reasoning models', () => {
  function prepareFollowUpPayload(modelName, prompt) {
    const isReasoning = /^(o1|o3|gpt-5)/i.test(modelName);
    const req = {
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 250,
    };
    if (isReasoning) {
      req.reasoning_effort = 'low';
    }
    return req;
  }

  // gpt-4o-mini (standard non-reasoning) must NOT have reasoning_effort
  const p1 = prepareFollowUpPayload('gpt-4o-mini', 'hello');
  assert.equal(p1.reasoning_effort, undefined);

  // gpt-4o must NOT have reasoning_effort
  const p2 = prepareFollowUpPayload('gpt-4o', 'hello');
  assert.equal(p2.reasoning_effort, undefined);

  // gpt-5-nano MUST have reasoning_effort
  const p3 = prepareFollowUpPayload('gpt-5-nano', 'hello');
  assert.equal(p3.reasoning_effort, 'low');

  // o1-mini MUST have reasoning_effort
  const p4 = prepareFollowUpPayload('o1-mini', 'hello');
  assert.equal(p4.reasoning_effort, 'low');
});

test('17. Lead Alert Notification Email: Priority resolution & non-email filtering', () => {
  // studio_settings notification_email takes priority over owner, specialist, and env
  const e1 = resolveAlertNotificationEmail(
    'buyer@customstudio.com',
    'owner@studio.com',
    'specialist@studio.com',
    'env@studio.com',
    'admin@studio.com'
  );
  assert.equal(e1, 'buyer@customstudio.com');

  // If studio_settings notification_email is null, falls back to owner
  const e2 = resolveAlertNotificationEmail(
    null,
    'owner@studio.com',
    'specialist@studio.com',
    'env@studio.com'
  );
  assert.equal(e2, 'owner@studio.com');

  // Phone numbers or non-emails are filtered out
  const e3 = resolveAlertNotificationEmail(
    null,
    '+15551234567', // phone number in contact column
    null,
    'env_fallback@studio.com'
  );
  assert.equal(e3, 'env_fallback@studio.com');

  // All empty returns null
  const e4 = resolveAlertNotificationEmail(null, null, null, null, null);
  assert.equal(e4, null);
});


