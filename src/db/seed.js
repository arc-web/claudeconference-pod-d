import db from './database';

const DEFAULT_SETTINGS = [
  { key: 'default_currency', value: 'USD' },
  { key: 'default_reminder_days', value: [14, 7, 3, 1] },
  { key: 'suggestion_frequency', value: 'daily' },
  { key: 'notification_enabled', value: true },
  { key: 'notification_quiet_hours', value: { start: '22:00', end: '08:00' } },
  { key: 'first_day_of_week', value: 'sunday' },
  { key: 'date_format', value: 'MM/DD/YYYY' },
  { key: 'has_seen_install_prompt', value: false },
  { key: 'last_suggestion_check', value: null },
  { key: 'onboarding_completed', value: false },
  { key: 'theme', value: 'system' }
];

export async function seedDefaults() {
  const count = await db.settings.count();
  if (count === 0) {
    await db.settings.bulkAdd(DEFAULT_SETTINGS);
  }
}
