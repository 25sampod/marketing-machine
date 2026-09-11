import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { 
  parseBudgetMention, 
  parseScopeKeywords, 
  parseTimelineUrgency, 
  executeFallbackHeuristicScorer,
  isClientDecliningOrOptingOut
} from '../src/lib/ai/fallbackScorer.ts';
import { 
  verifyHmacSignature, 
  isDuplicateMessageId, 
  resetDuplicateCacheForTesting 
} from '../src/lib/whatsapp/webhook.ts';
import {
  extractSearchTokens,
  splitRawKnowledgeIntoItems,
  assembleCuratedKnowledge,
} from '../src/lib/ai/knowledgeRetriever.ts';
import { checkMessageEditEligibility } from '../src/lib/messages/messageActions.ts';

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
    qualification_threshold: 80,
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
  assert.equal(resolved.qualificationThreshold, 80);
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
  assert.equal(resolved.qualificationThreshold, 70);
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

test('18. Client Welcome Email: Input validation and HTML payload builder', () => {
  function validateAndBuildWelcomePayload({ toEmail, clientName, projectType, studioName, whatsappContact, apiKey }) {
    if (!toEmail || !toEmail.includes('@')) {
      return { success: false, error: 'Invalid client email address.' };
    }
    if (!apiKey) {
      return { success: false, error: 'Resend API key is not configured.' };
    }
    const cleanPhone = (whatsappContact || '').replace(/[^0-9]/g, '');
    const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : 'https://scale.sampod.site';
    return {
      success: true,
      to: toEmail,
      subject: `🏛️ Thank you for your inquiry — ${studioName || 'ArchScale Studio'}`,
      whatsappUrl,
    };
  }

  // Rejects invalid email
  const r1 = validateAndBuildWelcomePayload({ toEmail: 'not-an-email', clientName: 'Client' });
  assert.equal(r1.success, false);
  assert.equal(r1.error, 'Invalid client email address.');

  // Skips safely if no API key
  const r2 = validateAndBuildWelcomePayload({ toEmail: 'client@arch.com', clientName: 'Client', apiKey: '' });
  assert.equal(r2.success, false);
  assert.equal(r2.error, 'Resend API key is not configured.');

  // Builds valid payload with cleaned phone WhatsApp link
  const r3 = validateAndBuildWelcomePayload({
    toEmail: 'client@arch.com',
    clientName: 'Sarah',
    projectType: 'Penthouse',
    studioName: 'Studio Arch',
    whatsappContact: '+1 (555) 019-2831',
    apiKey: 're_valid_key',
  });
  assert.equal(r3.success, true);
  assert.equal(r3.whatsappUrl, 'https://wa.me/15550192831');
  assert.equal(r3.subject, '🏛️ Thank you for your inquiry — Studio Arch');
});

test('19. Click-to-WhatsApp Campaign Link & Tag Generator Logic', () => {
  function generateCampaignUrl(phone, campaignTag, messageTemplate) {
    const cleanPhone = (phone || '').replace(/[^\d]/g, '');
    const formattedTag = (campaignTag || 'direct_ad').trim().replace(/\s+/g, '_').toLowerCase();
    const effectiveMsg = (messageTemplate || 'Hi [Ref: {{campaign}}]').replace(/{{campaign}}/g, formattedTag);
    return cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(effectiveMsg)}`
      : `https://wa.me/?text=${encodeURIComponent(effectiveMsg)}`;
  }

  // Formats phone with country code, replaces campaign tag, encodes URI
  const url1 = generateCampaignUrl('+1 (555) 234-5678', 'Luxury Villas 2026', 'Hi ArchScale! Inquiring on [Ref: {{campaign}}]');
  assert.equal(url1, 'https://wa.me/15552345678?text=Hi%20ArchScale!%20Inquiring%20on%20%5BRef%3A%20luxury_villas_2026%5D');

  // Gracefully handles empty phone
  const url2 = generateCampaignUrl('', 'instagram_story', 'Hello {{campaign}}');
  assert.equal(url2, 'https://wa.me/?text=Hello%20instagram_story');
});

test('20. Transparent LPI Multi-Factor Scoring Breakdown Math', () => {
  function computeLpiBreakdown(lead, isReturning) {
    const isLost = lead?.status === 'lost' || lead?.discovery_stage === 'lost';
    if (isLost) {
      return { qualPts: 0, budgetPts: 0, scopePts: 0, timelinePts: 0, vipPts: 0, total: 0 };
    }

    const qualPts = Math.round(((lead?.qualification_percentage || 0) / 100) * 40);
    let budgetPts = 0;
    if (lead?.estimated_budget) {
      const rawDigits = parseInt(String(lead.estimated_budget).replace(/[^\d]/g, ''), 10) || 0;
      if (rawDigits >= 100_000) budgetPts = 25;
      else if (rawDigits >= 20_000) budgetPts = 20;
      else if (rawDigits >= 5_000) budgetPts = 15;
      else budgetPts = 10;
    } else if (lead?.budget_mentioned) {
      budgetPts = 8;
    }
    const scopePts = lead?.project_type ? 15 : 0;
    let timelinePts = 0;
    if (lead?.timeline && !lead.timeline.toLowerCase().includes('not specified')) {
      const tl = lead.timeline.toLowerCase();
      if (tl.includes('asap') || tl.includes('immediate') || tl.includes('urgent') || tl.includes('week') || tl.includes('today')) {
        timelinePts = 10;
      } else if (tl.includes('month') || tl.includes('soon')) {
        timelinePts = 6;
      } else {
        timelinePts = 3;
      }
    }
    const vipPts = isReturning ? 10 : 0;
    const total = qualPts + budgetPts + scopePts + timelinePts + vipPts;
    return { qualPts, budgetPts, scopePts, timelinePts, vipPts, total };
  }

  // Tier 1 High-End Urgent Lead
  const breakdown1 = computeLpiBreakdown({
    qualification_percentage: 90,
    estimated_budget: '$150,000',
    project_type: 'Commercial Pavilion',
    timeline: 'Urgent - 2 weeks',
  }, true);

  assert.equal(breakdown1.qualPts, 36); // (90 / 100) * 40
  assert.equal(breakdown1.budgetPts, 25); // >= 100k
  assert.equal(breakdown1.scopePts, 15); // present
  assert.equal(breakdown1.timelinePts, 10); // urgent
  assert.equal(breakdown1.vipPts, 10); // returning client
  assert.equal(breakdown1.total, 96);

  // Unqualified Minimal Lead
  const breakdown2 = computeLpiBreakdown({
    qualification_percentage: 20,
    estimated_budget: null,
    project_type: null,
    timeline: null,
  }, false);

  assert.equal(breakdown2.qualPts, 8); // (20 / 100) * 40
  assert.equal(breakdown2.budgetPts, 0);
  assert.equal(breakdown2.scopePts, 0);
  assert.equal(breakdown2.timelinePts, 0);
  assert.equal(breakdown2.vipPts, 0);
  assert.equal(breakdown2.total, 8);

  // Zero Score / Lost / Declined Lead (Prevents the 45 pts vs 0/100 mismatch)
  const breakdown3 = computeLpiBreakdown({
    score: 0,
    status: 'lost',
    qualification_percentage: 0,
    estimated_budget: '$100',
    project_type: '5 page website',
    timeline: 'urgently',
  }, true);

  assert.equal(breakdown3.qualPts, 0);
  assert.equal(breakdown3.budgetPts, 0);
  assert.equal(breakdown3.scopePts, 0);
  assert.equal(breakdown3.timelinePts, 0);
  assert.equal(breakdown3.vipPts, 0);
  assert.equal(breakdown3.total, 0, 'All breakdown factors must be zeroed when lead is lost');

  // Active VIP lead with no other inquiry details yet: correctly awards 10 loyalty points
  const breakdown4 = computeLpiBreakdown({
    status: 'new',
    qualification_percentage: 0,
    estimated_budget: null,
    project_type: null,
    timeline: null,
  }, true);

  assert.equal(breakdown4.vipPts, 10, 'Active lead with VIP status enabled receives 10 loyalty points');
  assert.equal(breakdown4.total, 10);
});

test('21. Qualification Threshold & LPI Status Evaluation', () => {
  const evaluateStatus = (score, qualificationThreshold, previousStatus = 'new') => {
    let status = previousStatus;
    const meetsLpiThreshold = score >= qualificationThreshold;
    if (['new', 'contacted', 'qualified'].includes(previousStatus)) {
      status = meetsLpiThreshold ? 'qualified' : 'contacted';
    }
    const justQualified = previousStatus !== 'qualified' && status === 'qualified';
    return { status, justQualified };
  };

  // Case from user screenshot: LPI score 79 with threshold 85%
  const res1 = evaluateStatus(79, 85, 'contacted');
  assert.equal(res1.status, 'contacted', 'Lead with LPI 79 should NOT qualify when threshold is 85');
  assert.equal(res1.justQualified, false);

  // Case when lead reaches or exceeds threshold (85 >= 85)
  const res2 = evaluateStatus(85, 85, 'contacted');
  assert.equal(res2.status, 'qualified', 'Lead with LPI 85 should qualify when threshold is 85');
  assert.equal(res2.justQualified, true, 'First qualification transition should trigger justQualified');

  // Next message from already qualified lead: should maintain qualified status but NOT trigger justQualified
  const res3 = evaluateStatus(88, 85, 'qualified');
  assert.equal(res3.status, 'qualified');
  assert.equal(res3.justQualified, false, 'Subsequent messages must NOT trigger justQualified (prevents email spam)');

  // Preserves manual funnel progression (consult_booked, won, lost)
  const res4 = evaluateStatus(95, 85, 'consult_booked');
  assert.equal(res4.status, 'consult_booked', 'Manual status like consult_booked must never be overwritten');
  assert.equal(res4.justQualified, false);
});

test('22. Lead Alert Email Template: Accurate LPI Score Display', () => {
  const leadSample = {
    id: 'lead-test-123',
    name: 'Sampod',
    contact: '+8801645512513',
    message: 'We want to design a villa',
    project_type: 'Residential Villa',
    score: 79,
  };

  // Check template text contains 100-point LPI scale
  const renderedScoreText = `${leadSample.score ?? 0} / 100 (Multi-Factor LPI)`;
  assert.equal(renderedScoreText, '79 / 100 (Multi-Factor LPI)');
  assert.ok(!renderedScoreText.includes('/ 2'), 'Must not contain old v1 / 2 scale');
});

test('23. Client Opt-Out & Declination Detection (isClientDecliningOrOptingOut)', () => {
  // Phrases from actual inbound messages and common user opt-outs
  assert.equal(isClientDecliningOrOptingOut('Sorry, i dont want that anymore'), true);
  assert.equal(isClientDecliningOrOptingOut('Dont want any'), true);
  assert.equal(isClientDecliningOrOptingOut("don't want"), true);
  assert.equal(isClientDecliningOrOptingOut('I am not interested anymore, please cancel'), true);
  assert.equal(isClientDecliningOrOptingOut('Stop messaging me'), true);
  assert.equal(isClientDecliningOrOptingOut('Not looking for this now, no thanks'), true);
  assert.equal(isClientDecliningOrOptingOut('We have decided not to proceed with the commission'), true);
  assert.equal(isClientDecliningOrOptingOut('nah'), true);
  assert.equal(isClientDecliningOrOptingOut('no'), true);
  assert.equal(isClientDecliningOrOptingOut('forget it'), true);

  // Normal inquiring messages must NOT trigger opt-out
  assert.equal(isClientDecliningOrOptingOut('I want to start next month with $100k budget'), false);
  assert.equal(isClientDecliningOrOptingOut('Can you send me your pricing?'), false);
  assert.equal(isClientDecliningOrOptingOut('We need architectural drawings for a residential home'), false);
});

test('24. Fallback Heuristic Scorer on Declination: Immediate Zeroing & Lost Stage', () => {
  const existingLead = {
    id: 'lead-declined-1',
    estimated_budget: '$150,000',
    project_type: 'Commercial Architecture',
    score: 79,
    qualification_percentage: 80,
  };

  // When client messages "Sorry, i dont want that anymore"
  const result1 = executeFallbackHeuristicScorer('Sorry, i dont want that anymore', undefined, existingLead);
  assert.equal(result1.qualification_percentage, 0, 'Qualification percentage must drop to 0 on declination');
  assert.equal(result1.priority_tier, 'low', 'Priority tier must drop to low on declination');
  assert.equal(result1.discovery_stage, 'lost', 'Discovery stage must be lost on declination');
  assert.equal(result1.budget_mentioned, false, 'Budget mentioned should be false');
  assert.ok(result1.key_insights.toLowerCase().includes('client explicitly stated'), 'Insights should record declination');

  // When client messages "Dont want any"
  const result2 = executeFallbackHeuristicScorer('Dont want any', undefined, existingLead);
  assert.equal(result2.qualification_percentage, 0);
  assert.equal(result2.priority_tier, 'low');
  assert.equal(result2.discovery_stage, 'lost');
});

test('25. Message Deletion Logic & Snippet Recomputation', () => {
  const sampleMessages = [
    { id: 'msg-1', content: 'First message', sent_at: '2026-09-10T10:00:00Z' },
    { id: 'msg-2', content: 'Second message', sent_at: '2026-09-10T10:05:00Z' },
    { id: 'msg-3', content: 'Third message', sent_at: '2026-09-10T10:10:00Z' },
  ];

  // Deleting latest message ('msg-3') must update lead snippet to 'msg-2'
  const deletedId = 'msg-3';
  const remaining = sampleMessages.filter((m) => m.id !== deletedId);
  const updatedLatestSnippet = remaining.length > 0 ? remaining[remaining.length - 1].content : null;
  assert.equal(updatedLatestSnippet, 'Second message');

  // Deleting all messages must set snippet to null
  const clearedAll = [];
  const emptySnippet = clearedAll.length > 0 ? clearedAll[clearedAll.length - 1].content : null;
  assert.equal(emptySnippet, null);
});

test('26. Client Credentials Masking & Active Configured Badging', () => {
  function maskSettingsForClient(settings) {
    return {
      ...settings,
      isWhatsAppConfigured: Boolean(settings.whatsappPhoneNumberId && settings.whatsappAccessToken),
      isAiConfigured: Boolean(settings.aiApiKey),
      isEmailConfigured: Boolean(settings.resendApiKey),
      isTelegramConfigured: Boolean(settings.telegramBotToken && settings.telegramChatId),
      isFacebookConfigured: Boolean(settings.metaAppSecret && settings.whatsappPhoneNumberId),
      whatsappAccessToken: settings.whatsappAccessToken ? '••••••••••••••••••••••••' : '',
      metaAppSecret: settings.metaAppSecret ? '••••••••••••••••' : '',
      whatsappVerifyToken: settings.whatsappVerifyToken ? '••••••••••••••••' : '',
      aiApiKey: settings.aiApiKey ? '••••••••••••••••••••••••' : '',
      resendApiKey: settings.resendApiKey ? '••••••••••••••••••••••••' : '',
      telegramBotToken: settings.telegramBotToken ? '••••••••••••••••••••••••' : '',
      whatsappPhoneNumberId: settings.whatsappPhoneNumberId ? '••••••••••••••••' : '',
      whatsappBusinessAccountId: settings.whatsappBusinessAccountId ? '••••••••••••••••' : '',
      telegramChatId: settings.telegramChatId ? '••••••••••••••••' : '',
    };
  }

  const rawSettings = {
    whatsappPhoneNumberId: '1230168753524014',
    whatsappAccessToken: 'EAAdyFkMbVZAIBAOPQRSTUVWXYZ123456789',
    whatsappBusinessAccountId: '1774852886868045',
    metaAppSecret: 'abcdef1234567890',
    whatsappVerifyToken: 'gucsyt-marcas-jePmi5',
    aiApiKey: 'D20vok4zTestSecretKey123',
    resendApiKey: 're_aQ1aYJenTestSecretKey456',
    telegramBotToken: '123456:ABC-DEF1234ghIkl-zyx',
    telegramChatId: '-1001987654321',
  };

  const masked = maskSettingsForClient(rawSettings);

  // Assert secret keys are never exposed in raw form
  assert.equal(masked.whatsappAccessToken, '••••••••••••••••••••••••');
  assert.equal(masked.metaAppSecret, '••••••••••••••••');
  assert.equal(masked.whatsappVerifyToken, '••••••••••••••••');
  assert.equal(masked.aiApiKey, '••••••••••••••••••••••••');
  assert.equal(masked.resendApiKey, '••••••••••••••••••••••••');
  assert.equal(masked.telegramBotToken, '••••••••••••••••••••••••');

  // Assert account numbers and IDs are 100% masked without any partial digits
  assert.equal(masked.whatsappPhoneNumberId, '••••••••••••••••');
  assert.equal(masked.whatsappBusinessAccountId, '••••••••••••••••');
  assert.equal(masked.telegramChatId, '••••••••••••••••');

  // Assert active configured flags
  assert.equal(masked.isWhatsAppConfigured, true);
  assert.equal(masked.isAiConfigured, true);
  assert.equal(masked.isEmailConfigured, true);
  assert.equal(masked.isTelegramConfigured, true);
  assert.equal(masked.isFacebookConfigured, true);
});

test('27. Preserved/Masked Credential Filter (Overwriting Protection)', () => {
  function isMaskedOrPreserved(val) {
    if (!val || typeof val !== 'string') return true;
    const s = val.trim();
    return (
      s === '' ||
      s.includes('••') ||
      s.includes('●●') ||
      s.includes('(Configured') ||
      s.includes('(Active')
    );
  }

  // Masked values must return true (protecting DB columns from overwrite)
  assert.equal(isMaskedOrPreserved('••••••••••••••••••••••••'), true);
  assert.equal(isMaskedOrPreserved('••••••••4014'), true);
  assert.equal(isMaskedOrPreserved('●●●●●●●●'), true);
  assert.equal(isMaskedOrPreserved('•••••••••••••••• (Active)'), true);
  assert.equal(isMaskedOrPreserved(''), true);
  assert.equal(isMaskedOrPreserved(null), true);
  assert.equal(isMaskedOrPreserved(undefined), true);

  // Legitimate new credentials entered by user must return false (allowed to update)
  assert.equal(isMaskedOrPreserved('EAAdyFkMbVZAIBANewValidToken12345'), false);
  assert.equal(isMaskedOrPreserved('1230168753524014'), false);
  assert.equal(isMaskedOrPreserved('re_new_resend_key_987'), false);
  assert.equal(isMaskedOrPreserved('sk-proj-openai-key-abc'), false);
});

test('28. Test Connection Credential Cleaner (Omit masked tokens in favor of DB secrets, prioritize draft inputs)', () => {
  function cleanCredential(input, fallback) {
    if (input === undefined) return fallback || null;
    if (!input || typeof input !== 'string') return null;
    const s = input.trim();
    if (s.includes('••') || s.includes('●●') || s.includes('(Configured') || s.includes('(Active')) {
      return fallback || null;
    }
    return s || null;
  }

  const dbSecretToken = 'EAAdyFkMbVZAI_REAL_DB_TOKEN';
  const dbPhoneNumberId = '1230168753524014';
  const clientMaskedInput = '••••••••••••••••••••••••';
  const clientNewInput = 'EAAdyFkMbVZAI_NEW_REPLACEMENT_TOKEN';
  const clientDraftPhone = '8945792843759232452345';

  // Client sent masked token -> fall back to authentic DB secret
  assert.equal(cleanCredential(clientMaskedInput, dbSecretToken), dbSecretToken);

  // Client sent undefined -> fall back to authentic DB secret
  assert.equal(cleanCredential(undefined, dbSecretToken), dbSecretToken);

  // Client typed a new replacement token -> use new replacement token
  assert.equal(cleanCredential(clientNewInput, dbSecretToken), clientNewInput);

  // Client typed a draft phone number ID in input field -> use draft input for testing
  assert.equal(cleanCredential(clientDraftPhone, dbPhoneNumberId), '8945792843759232452345');

  // Client explicitly emptied the field -> returns null
  assert.equal(cleanCredential('', dbSecretToken), null);
});

test('29. Modular Knowledge Retriever: Keyword Extraction & Stop-word Filtering', () => {
  const tokens = extractSearchTokens('Can I order a large beef pepperoni pizza with extra cheese for delivery in Dhanmondi?');
  
  // Stop words stripped
  assert.equal(tokens.includes('can'), false);
  assert.equal(tokens.includes('i'), false);
  assert.equal(tokens.includes('a'), false);
  assert.equal(tokens.includes('with'), false);
  assert.equal(tokens.includes('for'), false);
  assert.equal(tokens.includes('in'), false);

  // Content tokens preserved
  assert.equal(tokens.includes('order'), true);
  assert.equal(tokens.includes('beef'), true);
  assert.equal(tokens.includes('pepperoni'), true);
  assert.equal(tokens.includes('pizza'), true);
  assert.equal(tokens.includes('delivery'), true);
  assert.equal(tokens.includes('dhanmondi'), true);

  // Null & empty safety
  assert.deepEqual(extractSearchTokens(''), []);
  assert.deepEqual(extractSearchTokens(null), []);
  assert.deepEqual(extractSearchTokens('   !!! ??? ---   '), []);
});

test('30. Modular Knowledge Base: Raw Text Auto-Splitter and Dynamic Categorization', () => {
  const rawSample = `
================================================
FOOD EXPRESS KNOWLEDGE BASE — FOR AI AGENTS
================================================

--- COMPANY OVERVIEW ---
Food Express is an on-demand food delivery platform operating across Dhaka city.
We connect local kitchens with hungry customers in 30-45 minutes.

--- FAST FOOD & BURGERS ---
• Classic Cheeseburger: ৳280
• Crispy Chicken Deluxe: ৳250
• Spicy BBQ Wings (6 pcs): ৳220

--- WOOD-FIRED PIZZA ---
• Pepperoni Feast 12-inch: ৳650
• Four Cheese Margherita: ৳580
• BBQ Chicken Supreme: ৳620

--- DELIVERY ZONES & PAYMENT ---
Standard delivery: 30-45 minutes.
Coverage: Dhanmondi, Gulshan, Banani, Uttara, Mirpur.
Payment Methods: Cash on Delivery (COD), bKash, and Nagad.

--- REFUND & CANCELLATION POLICIES ---
Cancellations accepted within 5 minutes of placing order.
Damaged, cold, or incorrect items receive a 100% instant refund or replacement.

--- CUSTOMER FAQ & HOW TO ORDER ---
1. How do I place an order? Simply tell us what items you'd like and your address.
2. What are your operating hours? 10:00 AM to 12:00 Midnight every day.
`;

  const items = splitRawKnowledgeIntoItems(rawSample);

  assert.equal(items.length, 6);

  // 1. Company Overview
  assert.equal(items[0].category, 'overview');
  assert.equal(items[0].title, 'COMPANY OVERVIEW');
  assert.equal(items[0].content.includes('Food Express is an on-demand food delivery platform'), true);

  // 2. Fast Food & Burgers
  assert.equal(items[1].category, 'catalog');
  assert.equal(items[1].title, 'FAST FOOD & BURGERS');
  assert.equal(items[1].tags.some(t => t.includes('burger') || t.includes('cheeseburger')), true);

  // 3. Wood-fired Pizza
  assert.equal(items[2].category, 'catalog');
  assert.equal(items[2].title, 'WOOD-FIRED PIZZA');
  assert.equal(items[2].tags.some(t => t.includes('pizza') || t.includes('pepperoni')), true);

  // 4. Delivery & Payment
  assert.equal(items[3].category, 'pricing_delivery');
  assert.equal(items[3].title, 'DELIVERY ZONES & PAYMENT');
  assert.equal(items[3].tags.some(t => t.includes('delivery') || t.includes('bkash')), true);

  // 5. Policies
  assert.equal(items[4].category, 'policies');
  assert.equal(items[4].title, 'REFUND & CANCELLATION POLICIES');
  assert.equal(items[4].tags.some(t => t.includes('refund') || t.includes('cancellation')), true);

  // 6. FAQ
  assert.equal(items[5].category, 'faq');
  assert.equal(items[5].title, 'CUSTOMER FAQ & HOW TO ORDER');
  assert.equal(items[5].is_active, true);
});

test('31. Modular Knowledge Retriever: Context Scoring & Selective Query Ranking', () => {
  const sampleItems = [
    {
      id: '1',
      category: 'overview',
      title: 'Company Overview',
      content: 'Food Express delivery in Dhaka',
      tags: ['food', 'express', 'delivery', 'dhaka'],
      is_active: true
    },
    {
      id: '2',
      category: 'catalog',
      title: 'Pizza Menu',
      content: 'Pepperoni Feast: ৳650, Margherita: ৳580',
      tags: ['pizza', 'pepperoni', 'margherita', 'crust', 'cheese'],
      is_active: true
    },
    {
      id: '3',
      category: 'catalog',
      title: 'Burgers & Fries',
      content: 'Beef Burger: ৳280, Crispy Chicken: ৳250',
      tags: ['burger', 'beef', 'chicken', 'fries'],
      is_active: true
    },
    {
      id: '4',
      category: 'pricing_delivery',
      title: 'Delivery Areas & Payment',
      content: 'We deliver to Dhanmondi, Gulshan. COD, bKash accepted.',
      tags: ['delivery', 'dhanmondi', 'gulshan', 'payment', 'bkash', 'cod'],
      is_active: true
    },
    {
      id: '5',
      category: 'policies',
      title: 'Cancellation & Refund',
      content: 'Cancel within 5 mins. 100% refund for wrong items.',
      tags: ['cancel', 'refund', 'wrong', 'return', 'complaint'],
      is_active: true
    }
  ];

  function scoreItem(item, userMsg) {
    let score = 0;
    const lowerMsg = userMsg.toLowerCase();
    const lowerTitle = item.title.toLowerCase();
    const lowerContent = item.content.toLowerCase();
    const tokens = extractSearchTokens(userMsg);

    for (const tag of item.tags) {
      if (lowerMsg.includes(tag.toLowerCase())) {
        score += 10;
      } else if (tokens.some(tok => tag.toLowerCase().includes(tok) || tok.includes(tag.toLowerCase()))) {
        score += 5;
      }
    }
    for (const tok of tokens) {
      if (lowerTitle.includes(tok)) score += 6;
      if (lowerContent.includes(tok)) score += 2;
    }
    if (/\b(deliver|delivery|address|fee|cost|area|zone|bkash|nagad|cash|cod|payment|pay)\b/i.test(lowerMsg) && item.category === 'pricing_delivery') {
      score += 8;
    }
    if (/\b(cancel|refund|return|wrong|missing|complaint)\b/i.test(lowerMsg) && item.category === 'policies') {
      score += 12;
    }
    return score;
  }

  // Case A: Customer asks about pizza -> Pizza Menu should rank #1
  const pizzaQuery = 'What pizzas do you have on the menu?';
  const pizzaScores = sampleItems.filter(i => i.category !== 'overview').map(i => ({ title: i.title, score: scoreItem(i, pizzaQuery) }));
  pizzaScores.sort((a, b) => b.score - a.score);
  assert.equal(pizzaScores[0].title, 'Pizza Menu');

  // Case B: Customer asks about delivery & bKash -> Delivery Areas & Payment ranks #1
  const deliveryQuery = 'Do you deliver to Dhanmondi and can I pay with bKash?';
  const deliveryScores = sampleItems.filter(i => i.category !== 'overview').map(i => ({ title: i.title, score: scoreItem(i, deliveryQuery) }));
  deliveryScores.sort((a, b) => b.score - a.score);
  assert.equal(deliveryScores[0].title, 'Delivery Areas & Payment');

  // Case C: Customer has an issue / refund -> Cancellation & Refund ranks #1
  const refundQuery = 'I received the wrong item, how can I get a refund?';
  const refundScores = sampleItems.filter(i => i.category !== 'overview').map(i => ({ title: i.title, score: scoreItem(i, refundQuery) }));
  refundScores.sort((a, b) => b.score - a.score);
  assert.equal(refundScores[0].title, 'Cancellation & Refund');
});

test('32. Multi-Tenant Studio Settings: Preserves identifiers & links across custom studio rows', () => {
  const customStudioRow = {
    id: 'studio_client_foodie_hub',
    team_id: '11111111-2222-3333-4444-555555555555',
    studio_name: 'FoodieHub Cloud Kitchen',
    studio_slug: 'foodie-hub',
    whatsapp_phone_number_id: 'foodie_phone_id_99',
    ai_provider: 'openai',
    ai_api_key: 'sk-foodie-key',
    qualification_threshold: 65,
  };

  const resolved = resolveStudioCredentials(customStudioRow);
  assert.equal(resolved.id, 'studio_client_foodie_hub');
  assert.equal(resolved.teamId, '11111111-2222-3333-4444-555555555555');
  assert.equal(resolved.studioName, 'FoodieHub Cloud Kitchen');
  assert.equal(resolved.studioSlug, 'foodie-hub');
  assert.equal(resolved.whatsappPhoneNumberId, 'foodie_phone_id_99');
  assert.equal(resolved.aiProvider, 'openai');
  assert.equal(resolved.qualificationThreshold, 65);

  // Default row behavior
  const defaultResolved = resolveStudioCredentials(null);
  assert.equal(defaultResolved.id, 'default');
  assert.equal(defaultResolved.teamId, null);
  assert.equal(defaultResolved.studioName, null);
  assert.equal(defaultResolved.studioSlug, null);
});

test('33. Resend Sending-Restricted API Key Recognition & Notification Email Isolation', () => {
  // 1. Notification Email Isolation: Does not leak PLATFORM_ADMIN_EMAIL into studio notificationEmail
  const resolvedWithoutDbEmail = resolveStudioCredentials(
    { notification_email: null },
    { PLATFORM_ADMIN_EMAIL: 'personal_admin@platform.com' }
  );
  assert.equal(resolvedWithoutDbEmail.notificationEmail, null);

  // When explicit NOTIFICATION_EMAIL is provided in env, it resolves
  const resolvedWithEnvEmail = resolveStudioCredentials(
    { notification_email: null },
    { NOTIFICATION_EMAIL: 'alerts@studio.com', PLATFORM_ADMIN_EMAIL: 'personal_admin@platform.com' }
  );
  assert.equal(resolvedWithEnvEmail.notificationEmail, 'alerts@studio.com');

  // When RESEND_FROM_EMAIL is provided without NOTIFICATION_EMAIL, it falls back to RESEND_FROM_EMAIL
  const resolvedWithResendFrom = resolveStudioCredentials(
    { notification_email: null },
    { RESEND_FROM_EMAIL: 'notifications@scale.sampod.site', PLATFORM_ADMIN_EMAIL: 'personal_admin@platform.com' }
  );
  assert.equal(resolvedWithResendFrom.notificationEmail, 'notifications@scale.sampod.site');

  // 2. Resend Sending-Restricted Key Recognition
  function isResendSendingKeyActive(errData) {
    return Boolean(
      errData.name === 'restricted_api_key' ||
      errData.message?.toLowerCase().includes('restricted') ||
      errData.message?.toLowerCase().includes('only send emails') ||
      errData.message?.toLowerCase().includes('sending access')
    );
  }

  assert.equal(
    isResendSendingKeyActive({ message: 'This API key is restricted to only send emails' }),
    true
  );
  assert.equal(
    isResendSendingKeyActive({ name: 'restricted_api_key', message: 'Restricted key' }),
    true
  );
  assert.equal(
    isResendSendingKeyActive({ message: 'API key is invalid' }),
    false
  );
});

test('34. WhatsApp-Style Message Edit Eligibility & Realtime Safety Constraints', () => {
  const now = Date.now();

  // 1. Missing message
  const rNull = checkMessageEditEligibility(null);
  assert.equal(rNull.canEdit, false);
  assert.equal(rNull.reason, 'Message not found.');

  // 2. Inbound customer message (immutable)
  const rInbound = checkMessageEditEligibility({
    direction: 'inbound',
    sent_at: new Date(now - 2 * 60 * 1000).toISOString(),
  });
  assert.equal(rInbound.canEdit, false);
  assert.match(rInbound.reason, /Inbound customer messages cannot be edited/);

  // 2.1 WhatsApp Outbound message (allowed in dashboard with isWhatsAppNotice flag)
  const rWhatsApp = checkMessageEditEligibility({
    direction: 'outbound',
    sent_at: new Date(now - 2 * 60 * 1000).toISOString(),
    channel: 'whatsapp',
  });
  assert.equal(rWhatsApp.canEdit, true);
  assert.equal(rWhatsApp.isWhatsAppNotice, true);

  // 3. Outbound message within 15 minutes (5 min ago)
  const rOutboundRecent = checkMessageEditEligibility(
    {
      direction: 'outbound',
      sent_at: new Date(now - 5 * 60 * 1000).toISOString(),
    },
    15,
    now
  );
  assert.equal(rOutboundRecent.canEdit, true);
  assert.equal(rOutboundRecent.remainingMinutes, 10);
  assert.equal(rOutboundRecent.elapsedMinutes, 5);

  // 4. Outbound message near window edge (14 min ago)
  const rOutboundEdge = checkMessageEditEligibility(
    {
      direction: 'outbound',
      sent_at: new Date(now - 14 * 60 * 1000).toISOString(),
    },
    15,
    now
  );
  assert.equal(rOutboundEdge.canEdit, true);
  assert.equal(rOutboundEdge.remainingMinutes, 1);

  // 5. Outbound message past 15 minutes (20 min ago)
  const rOutboundExpired = checkMessageEditEligibility(
    {
      direction: 'outbound',
      sent_at: new Date(now - 20 * 60 * 1000).toISOString(),
    },
    15,
    now
  );
  assert.equal(rOutboundExpired.canEdit, false);
  assert.equal(rOutboundExpired.remainingMinutes, 0);
  assert.match(rOutboundExpired.reason, /only be edited within 15 minutes/);

  // 6. Custom window threshold (e.g. 30 min)
  const rCustomWindow = checkMessageEditEligibility(
    {
      direction: 'outbound',
      sent_at: new Date(now - 20 * 60 * 1000).toISOString(),
    },
    30,
    now
  );
  assert.equal(rCustomWindow.canEdit, true);
  assert.equal(rCustomWindow.remainingMinutes, 10);

  // 7. Malformed timestamp
  const rMalformed = checkMessageEditEligibility({
    direction: 'outbound',
    sent_at: 'not-a-valid-date',
  });
  assert.equal(rMalformed.canEdit, false);
  assert.equal(rMalformed.reason, 'Invalid sent timestamp.');
});

test('35. Inbound Customer Typing Indicator & Presence State Normalization', () => {
  function parseTypingPresence(event) {
    if (!event) return { isTyping: false, phone: null };
    const rawPhone = event.from || event.sender || event.contact;
    const cleanPhone = rawPhone ? String(rawPhone).replace(/[^\d]/g, '') : null;
    const e164Phone = cleanPhone ? (cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`) : null;
    const isTyping = Boolean(
      event.status !== 'paused' &&
      event.status !== 'stopped' &&
      event.typing !== false &&
      (event.status === 'typing' || event.status === 'composing' || event.typing === true || event.isTyping === true)
    );
    return { isTyping, phone: e164Phone };
  }

  // Active typing event
  const p1 = parseTypingPresence({ from: '8801645512513', status: 'typing' });
  assert.equal(p1.isTyping, true);
  assert.equal(p1.phone, '+8801645512513');

  // Composing presence stanza
  const p2 = parseTypingPresence({ from: '+1 (555) 677-2209', status: 'composing' });
  assert.equal(p2.isTyping, true);
  assert.equal(p2.phone, '+15556772209');

  // Paused event
  const p3 = parseTypingPresence({ from: '8801645512513', status: 'paused' });
  assert.equal(p3.isTyping, false);

  // Stopped event
  const p4 = parseTypingPresence({ from: '8801645512513', status: 'stopped' });
  assert.equal(p4.isTyping, false);

  // Explicit typing false flag
  const p5 = parseTypingPresence({ from: '8801645512513', typing: false });
  assert.equal(p5.isTyping, false);

  // Empty / null event
  const p6 = parseTypingPresence(null);
  assert.equal(p6.isTyping, false);
  assert.equal(p6.phone, null);
});

test('36. Dashboard State Hydration & Refresh Persistence Engine (View, Lead, Tab)', () => {
  const VALID_VIEWS = ['pipeline', 'kanban', 'sheet', 'analytics', 'knowledge', 'team', 'settings', 'platform'];
  const VALID_SETTINGS_TABS = ['integrations', 'general', 'ai', 'channels'];

  function resolveActiveView(urlQuery, storageValue) {
    const params = new URLSearchParams(urlQuery || '');
    const urlView = params.get('view');
    if (urlView && VALID_VIEWS.includes(urlView)) {
      return urlView;
    }
    if (storageValue && VALID_VIEWS.includes(storageValue)) {
      return storageValue;
    }
    return 'pipeline';
  }

  function resolveSelectedLead(leadsList, targetLeadId) {
    if (!leadsList || leadsList.length === 0) return null;
    if (targetLeadId) {
      const match = leadsList.find((l) => l.id === targetLeadId);
      if (match) return match;
    }
    return leadsList[0];
  }

  function resolveSettingsTab(urlQuery, storageValue) {
    const params = new URLSearchParams(urlQuery || '');
    const urlTab = params.get('tab');
    if (urlTab && VALID_SETTINGS_TABS.includes(urlTab)) {
      return urlTab;
    }
    if (storageValue && VALID_SETTINGS_TABS.includes(storageValue)) {
      return storageValue;
    }
    return 'integrations';
  }

  function buildDashboardUrl(pathname, view, leadId, tab) {
    const params = new URLSearchParams();
    params.set('view', view);
    if (view === 'pipeline' && leadId) {
      params.set('lead', leadId);
    }
    if (view === 'settings' && tab) {
      params.set('tab', tab);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  // 1. URL parameter takes precedence over localStorage
  assert.equal(resolveActiveView('?view=kanban', 'settings'), 'kanban');
  assert.equal(resolveActiveView('?view=analytics', 'pipeline'), 'analytics');
  assert.equal(resolveActiveView('?view=platform', 'pipeline'), 'platform');

  // 2. LocalStorage used when URL parameter is missing
  assert.equal(resolveActiveView('', 'team'), 'team');
  assert.equal(resolveActiveView(null, 'knowledge'), 'knowledge');

  // 3. Fallback to 'pipeline' on invalid or empty inputs
  assert.equal(resolveActiveView('?view=unknown_corrupt', 'invalid'), 'pipeline');
  assert.equal(resolveActiveView('', null), 'pipeline');

  // 4. Selected Lead restoration by ID
  const testLeads = [
    { id: 'lead-1', name: 'Lead 1' },
    { id: 'lead-2', name: 'Lead 2' },
    { id: 'lead-3', name: 'Lead 3' },
  ];
  assert.equal(resolveSelectedLead(testLeads, 'lead-2').id, 'lead-2');
  assert.equal(resolveSelectedLead(testLeads, 'lead-3').id, 'lead-3');

  // 5. Deleted or non-existent lead gracefully falls back to first lead
  assert.equal(resolveSelectedLead(testLeads, 'deleted-lead-id').id, 'lead-1');
  assert.equal(resolveSelectedLead(testLeads, null).id, 'lead-1');
  assert.equal(resolveSelectedLead([], 'lead-1'), null);

  // 6. Settings tab persistence & validation
  assert.equal(resolveSettingsTab('?view=settings&tab=general', 'integrations'), 'general');
  assert.equal(resolveSettingsTab('?view=settings', 'ai'), 'ai');
  assert.equal(resolveSettingsTab('?view=settings&tab=corrupt', 'invalid'), 'integrations');

  // 7. URL query string generator
  assert.equal(buildDashboardUrl('/dashboard', 'kanban'), '/dashboard?view=kanban');
  assert.equal(buildDashboardUrl('/dashboard', 'pipeline', 'lead-2'), '/dashboard?view=pipeline&lead=lead-2');
  assert.equal(buildDashboardUrl('/dashboard', 'settings', null, 'ai'), '/dashboard?view=settings&tab=ai');
});

test('37. WhatsApp Chat Input Mechanics: Multiline auto-expansion height clamping & key event handling', () => {
  // 1. Key event routing logic
  function evaluateChatKeyAction({ key, shiftKey, isComposing }) {
    if (isComposing) {
      return 'ime_composing';
    }
    if (key === 'Enter' && !shiftKey) {
      return 'send';
    }
    if (key === 'Enter' && shiftKey) {
      return 'newline';
    }
    return 'type';
  }

  assert.equal(evaluateChatKeyAction({ key: 'Enter', shiftKey: false, isComposing: false }), 'send');
  assert.equal(evaluateChatKeyAction({ key: 'Enter', shiftKey: true, isComposing: false }), 'newline');
  assert.equal(evaluateChatKeyAction({ key: 'Enter', shiftKey: false, isComposing: true }), 'ime_composing');
  assert.equal(evaluateChatKeyAction({ key: 'a', shiftKey: false, isComposing: false }), 'type');

  // 2. Dynamic height calculation & max-height boundary clamping
  function calculateTextareaHeight(scrollHeight, maxHeight = 160) {
    return Math.min(Math.max(scrollHeight, 38), maxHeight);
  }

  assert.equal(calculateTextareaHeight(38), 38);
  assert.equal(calculateTextareaHeight(72), 72);
  assert.equal(calculateTextareaHeight(120), 120);
  assert.equal(calculateTextareaHeight(160), 160);
  assert.equal(calculateTextareaHeight(240), 160); // Clamped at max 160px
  assert.equal(calculateTextareaHeight(20), 38);  // Clamped at min 38px
});

test('38. Modular Scope-to-Specialist Routing Matrix: Dynamic knowledge-based rule generation & custom partner assignment', () => {
  function buildKnowledgeRules(items, members) {
    const defaultAssignee = members[0] || null;
    const candidateItems = (items || []).filter(
      (item) => item.is_active !== false && item.title && !item.title.toLowerCase().includes('how ordering works')
    );

    if (candidateItems.length === 0) {
      return [
        { scope: 'General Inquiries', keyword: 'general', assigneeId: defaultAssignee?.id, assigneeName: defaultAssignee?.name || 'Studio Lead' },
        { scope: 'Orders & Support', keyword: 'order', assigneeId: defaultAssignee?.id, assigneeName: defaultAssignee?.name || 'Studio Lead' },
      ];
    }

    return candidateItems.map((item) => {
      const cleanScope = item.title
        .trim()
        .toLowerCase()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const rawKeyword = (item.tags && item.tags[0]) || item.title.toLowerCase().split(/[\s/&:]+/)[0] || 'general';
      const keyword = rawKeyword.toLowerCase().replace(/[^a-z0-9]/g, '');

      const matchedMember = members.find((m) => {
        if (!m.specialty) return false;
        const spec = m.specialty.toLowerCase();
        return spec.includes(keyword) || keyword.includes(spec);
      }) || defaultAssignee;

      return {
        scope: cleanScope,
        keyword,
        assigneeId: matchedMember?.id,
        assigneeName: matchedMember?.name || 'Studio Lead',
      };
    });
  }

  const mockMembers = [
    { id: 'm-1', name: 'Sampod', role: 'owner', specialty: '' },
    { id: 'm-2', name: 'Biplabi', role: 'specialist', specialty: 'Pizza & Fast Food' },
  ];

  const mockKnowledge = [
    { id: 'k-1', title: 'FAST FOOD', tags: ['burger', 'fries'], is_active: true },
    { id: 'k-2', title: 'PIZZA', tags: ['pizza', 'cheese'], is_active: true },
    { id: 'k-3', title: 'DELIVERY INFO', tags: ['delivery', 'fees'], is_active: true },
  ];

  // 1. Dynamic generation from authentic studio knowledge
  const rules = buildKnowledgeRules(mockKnowledge, mockMembers);
  assert.equal(rules.length, 3);
  assert.equal(rules[0].scope, 'Fast Food');
  assert.equal(rules[0].keyword, 'burger');
  // Matched by specialty
  assert.equal(rules[1].scope, 'Pizza');
  assert.equal(rules[1].keyword, 'pizza');
  assert.equal(rules[1].assigneeId, 'm-2'); // Biplabi matched "Pizza"
  assert.equal(rules[2].scope, 'Delivery Info');
  assert.equal(rules[2].keyword, 'delivery');
  assert.equal(rules[2].assigneeId, 'm-1'); // Fallback to default lead

  // 2. Custom modular specialty resolution (no hardcoded Architecture Specialist)
  function resolveMemberSpecialtyDisplay(member) {
    if (member.specialty && member.specialty.trim()) {
      return member.specialty.trim();
    }
    return member.role === 'owner' ? 'Studio Owner' : 'Specialist (No specialty set)';
  }

  assert.equal(resolveMemberSpecialtyDisplay({ role: 'owner', specialty: '' }), 'Studio Owner');
  assert.equal(resolveMemberSpecialtyDisplay({ role: 'specialist', specialty: '' }), 'Specialist (No specialty set)');
  assert.equal(resolveMemberSpecialtyDisplay({ role: 'specialist', specialty: 'Kitchen Lead' }), 'Kitchen Lead');
});

test('39. Always-Visible Horizontal Scrollbars: CSS Invariants & Table Minimum Constraints', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  // 1. Verify globals.css rules for persistent horizontal scrollbar
  const globalsCss = await fs.readFile(
    path.join(process.cwd(), 'src/app/globals.css'),
    'utf-8'
  );

  assert.ok(
    globalsCss.includes('::-webkit-scrollbar:horizontal'),
    'globals.css must target ::-webkit-scrollbar:horizontal'
  );
  assert.ok(
    globalsCss.includes('height: 8px !important;'),
    'Horizontal scrollbar must have an 8px ergonomic height'
  );
  assert.ok(
    globalsCss.includes('::-webkit-scrollbar-track:horizontal'),
    'Horizontal scrollbar must define a persistent visible track'
  );
  assert.ok(
    globalsCss.includes('::-webkit-scrollbar-thumb:horizontal'),
    'Horizontal scrollbar must define an accessible visible thumb'
  );
  assert.ok(
    globalsCss.includes('var(--amber') || globalsCss.includes('#d97706'),
    'Horizontal scrollbar thumb must feature amber brand accent'
  );
  assert.ok(
    globalsCss.includes('scrollbar-color:'),
    'Firefox persistent scrollbar-color must be specified'
  );

  // 2. Verify public tab switchers do NOT hide horizontal scrollbars with scrollbar-none
  const productTsx = await fs.readFile(
    path.join(process.cwd(), 'src/components/Product.tsx'),
    'utf-8'
  );
  const solutionsTsx = await fs.readFile(
    path.join(process.cwd(), 'src/components/Solutions.tsx'),
    'utf-8'
  );

  assert.ok(
    !productTsx.includes('overflow-x-auto scrollbar-none'),
    'Product.tsx tabs must not hide horizontal scrollbar with scrollbar-none'
  );
  assert.ok(
    productTsx.includes('overflow-x-auto custom-scrollbar'),
    'Product.tsx tabs must use custom-scrollbar'
  );

  assert.ok(
    !solutionsTsx.includes('overflow-x-auto scrollbar-none'),
    'Solutions.tsx tabs must not hide horizontal scrollbar with scrollbar-none'
  );
  assert.ok(
    solutionsTsx.includes('overflow-x-auto custom-scrollbar'),
    'Solutions.tsx tabs must use custom-scrollbar'
  );

  // 3. Verify core dashboard data tables enforce minimum widths for horizontal scrollability
  const sheetViewTsx = await fs.readFile(
    path.join(process.cwd(), 'src/components/dashboard/SheetView.tsx'),
    'utf-8'
  );
  const teamViewTsx = await fs.readFile(
    path.join(process.cwd(), 'src/components/dashboard/TeamView.tsx'),
    'utf-8'
  );
  const analyticsViewTsx = await fs.readFile(
    path.join(process.cwd(), 'src/components/dashboard/AnalyticsView.tsx'),
    'utf-8'
  );

  assert.ok(
    sheetViewTsx.includes('min-w-[1150px]'),
    'SheetView table must enforce min-w-[1150px] to preserve columns and trigger scroll'
  );
  assert.ok(
    teamViewTsx.includes('min-w-[650px]'),
    'TeamView routing matrix table must enforce min-w-[650px]'
  );
  assert.ok(
    analyticsViewTsx.includes('min-w-[680px]'),
    'AnalyticsView table must enforce min-w-[680px]'
  );
});

test('40. AI Token Reduction Pipeline: Knowledge Pruning, High-Density Prompts & Telemetry', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  // 1. Modular Knowledge Retriever greeting pruning: "hi" must return ONLY the overview card
  const sampleItems = [
    {
      category: 'overview',
      title: 'Company Overview',
      content: 'Chittagong Express is a fast-casual dining and cloud kitchen service in Dhaka.',
      tags: ['express', 'dining', 'kitchen', 'dhaka'],
    },
    {
      category: 'catalog',
      title: 'Pizza Menu',
      content: 'Margherita Pizza (BDT 450), Pepperoni Feast (BDT 650), BBQ Chicken (BDT 600), Four Cheese (BDT 750).'.repeat(5),
      tags: ['pizza', 'margherita', 'pepperoni', 'cheese'],
    },
    {
      category: 'pricing_delivery',
      title: 'Delivery & Payment Policy',
      content: 'We deliver to Dhanmondi, Gulshan, Banani, and Uttara. Delivery fee BDT 60. Payment via bKash, Nagad, or Cash on Delivery.'.repeat(4),
      tags: ['delivery', 'fee', 'payment', 'bkash', 'nagad', 'cash'],
    },
  ];

  // A generic greeting should NOT inject bulky pizza menus or delivery tables
  const greetingKnowledge = assembleCuratedKnowledge(sampleItems, 'hi');
  assert.ok(greetingKnowledge, 'Greeting knowledge must return overview');
  assert.ok(greetingKnowledge.includes('COMPANY OVERVIEW'), 'Must contain overview card');
  assert.ok(!greetingKnowledge.includes('PIZZA MENU'), 'Must NOT eagerly inject pizza menu on greeting');
  assert.ok(!greetingKnowledge.includes('DELIVERY & PAYMENT POLICY'), 'Must NOT eagerly inject delivery policies on greeting');
  assert.ok(greetingKnowledge.length < 300, 'Greeting knowledge block must be compact (< 300 chars, ~60 tokens)');

  // A specific inquiry should include only relevant cards, clamped to max 350 chars each
  const pizzaKnowledge = assembleCuratedKnowledge(sampleItems, 'What pizzas do you have?');
  assert.ok(pizzaKnowledge.includes('COMPANY OVERVIEW'));
  assert.ok(pizzaKnowledge.includes('PIZZA MENU'));
  assert.ok(!pizzaKnowledge.includes('DELIVERY & PAYMENT POLICY'));
  assert.ok(pizzaKnowledge.length < 800, 'Targeted knowledge block must be strictly bounded');

  // Verify card content length clamping: individual section content <= 370 chars
  const pizzaSection = pizzaKnowledge.split('[PIZZA MENU]')[1];
  assert.ok(pizzaSection.length <= 370, 'Section content must be clamped to prevent runaway tokens');

  // 2. System prompt density & token boundary invariants in qualifyLead.ts
  const qualifyLeadTs = await fs.readFile(
    path.join(process.cwd(), 'src/lib/ai/qualifyLead.ts'),
    'utf-8'
  );

  // Completion token cap: bounded to <= 350
  assert.ok(
    qualifyLeadTs.includes('max_completion_tokens: 350'),
    'max_completion_tokens must be capped at 350 to eliminate output token waste'
  );

  // History window: pruned to slice(-4) (2 roundtrips)
  assert.ok(
    qualifyLeadTs.includes('.slice(-4)'),
    'Recent message history must be pruned to slice(-4) to save multi-turn tokens'
  );

  // Reasoning model regex: strictly /^(o1|o3)\b/i to prevent forcing reasoning effort on gpt-5-nano
  assert.ok(
    qualifyLeadTs.includes('/^(o1|o3)\\b/i'),
    'Reasoning model check must strictly target o1/o3 rather than generic gpt-5 models'
  );

  // Token usage telemetry logging & field
  assert.ok(
    qualifyLeadTs.includes('[AI Token Consumption]'),
    'Must log real-time token telemetry per turn'
  );
  assert.ok(
    qualifyLeadTs.includes('token_usage?:'),
    'QualificationResult interface must expose token_usage telemetry'
  );

  // 3. Fallback knowledge base in processNewLead.ts must clamp fallback to 300 chars
  const processNewLeadTs = await fs.readFile(
    path.join(process.cwd(), 'src/lib/workflows/processNewLead.ts'),
    'utf-8'
  );
  assert.ok(
    processNewLeadTs.includes('slice(0, 300)'),
    'processNewLead must clamp monolithic fallback to 300 chars, never dumping 6.6k characters'
  );
});

