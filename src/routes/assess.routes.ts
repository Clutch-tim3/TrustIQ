import express from 'express';
import { AssessController } from '../controllers/assess.controller.js';
import { validateSchema } from '../middleware/validation.middleware.js';
import { z } from 'zod';

const router = express.Router();

const assessSchema = z.object({
  action: z.enum(['signup', 'login', 'payment', 'content_post', 'withdrawal', 'account_update', 'api_access', 'message_send', 'listing_create']),
  user_id: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  ip: z.string().optional(),
  device_fingerprint: z.object({
    user_agent: z.string(),
    screen_resolution: z.string(),
    timezone: z.string(),
    language: z.string(),
    platform: z.string(),
    cookie_enabled: z.boolean(),
    canvas_hash: z.string().optional(),
    webgl_hash: z.string().optional(),
    audio_hash: z.string().optional(),
    installed_fonts_count: z.number(),
    do_not_track: z.boolean(),
    hardware_concurrency: z.number(),
    device_memory_gb: z.number(),
    connection_type: z.string(),
    has_webdriver: z.boolean(),
    has_phantom: z.boolean(),
    has_nightmare: z.boolean(),
    plugins_count: z.number()
  }).optional(),
  behaviour: z.object({
    time_to_complete_seconds: z.number().optional(),
    mouse_movements: z.boolean().optional(),
    keyboard_events: z.boolean().optional(),
    copy_paste_detected: z.boolean().optional(),
    tab_focus_changes: z.number().optional(),
    scroll_events: z.number().optional()
  }).optional(),
  context: z.object({
    app_name: z.string().optional(),
    environment: z.string().optional(),
    referrer: z.string().optional(),
    utm_source: z.string().optional(),
    locale: z.string().optional(),
    custom_signals: z.record(z.any()).optional()
  }).optional()
});

const emailAssessSchema = z.object({
  email: z.string().email(),
  context: z.enum(['signup', 'login', 'contact_form', 'general'])
});

const ipAssessSchema = z.object({
  ip: z.string(),
  context: z.enum(['signup', 'login', 'payment', 'general'])
});

const deviceAssessSchema = z.object({
  device_fingerprint: z.object({
    user_agent: z.string(),
    screen_resolution: z.string(),
    timezone: z.string(),
    language: z.string(),
    platform: z.string(),
    cookie_enabled: z.boolean(),
    canvas_hash: z.string().optional(),
    webgl_hash: z.string().optional(),
    audio_hash: z.string().optional(),
    installed_fonts_count: z.number(),
    do_not_track: z.boolean(),
    hardware_concurrency: z.number(),
    device_memory_gb: z.number(),
    connection_type: z.string(),
    has_webdriver: z.boolean(),
    has_phantom: z.boolean(),
    has_nightmare: z.boolean(),
    plugins_count: z.number()
  }),
  user_id: z.string().optional(),
  ip: z.string().optional()
});

const phoneAssessSchema = z.object({
  phone: z.string(),
  context: z.enum(['signup', '2fa_setup', 'payment', 'general'])
});

const identityAssessSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  country: z.string(),
  ip: z.string(),
  date_of_birth: z.string().optional(),
  company: z.string().optional()
});

const batchAssessSchema = z.object({
  assessments: z.array(z.object({
    user_id: z.string().optional(),
    email: z.string().email().optional(),
    ip: z.string().optional(),
    action: z.enum(['signup', 'login', 'payment', 'content_post', 'withdrawal', 'account_update', 'api_access', 'message_send', 'listing_create'])
  })).max(50),
  webhook_url: z.string().url().optional()
});

router.post('/', validateSchema(assessSchema), AssessController.assess);
router.post('/email', validateSchema(emailAssessSchema), AssessController.assessEmail);
router.post('/ip', validateSchema(ipAssessSchema), AssessController.assessIp);
router.post('/device', validateSchema(deviceAssessSchema), AssessController.assessDevice);
router.post('/phone', validateSchema(phoneAssessSchema), AssessController.assessPhone);
router.post('/identity', validateSchema(identityAssessSchema), AssessController.assessIdentity);
router.post('/batch', validateSchema(batchAssessSchema), AssessController.assessBatch);

export default router;
