import fs from 'fs';
import path from 'path';

const TRACK_FILE = path.resolve(__dirname, '../.created_test_entities.json');

interface TrackedEntities {
  userIds: number[];
  emails: string[];
}

function readTracked(): TrackedEntities {
  try {
    if (fs.existsSync(TRACK_FILE)) {
      const data = fs.readFileSync(TRACK_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        userIds: Array.isArray(parsed.userIds) ? parsed.userIds : [],
        emails: Array.isArray(parsed.emails) ? parsed.emails : [],
      };
    }
  } catch {}
  return { userIds: [], emails: [] };
}

function writeTracked(data: TrackedEntities) {
  try {
    const uniqueUserIds = Array.from(new Set(data.userIds));
    const uniqueEmails = Array.from(new Set(data.emails.map((e) => e.toLowerCase())));
    fs.writeFileSync(
      TRACK_FILE,
      JSON.stringify({ userIds: uniqueUserIds, emails: uniqueEmails }, null, 2),
      'utf-8'
    );
  } catch (e) {
    console.error('Failed to write tracked entities file:', e);
  }
}

export function trackCreatedUser(userId?: number | null, email?: string | null) {
  const current = readTracked();
  let changed = false;

  if (userId && !current.userIds.includes(userId)) {
    current.userIds.push(userId);
    changed = true;
  }

  if (email && !current.emails.includes(email.toLowerCase())) {
    current.emails.push(email.toLowerCase());
    changed = true;
  }

  if (changed) {
    writeTracked(current);
  }
}

export function untrackUser(userId?: number | null, email?: string | null) {
  const current = readTracked();
  if (userId) {
    current.userIds = current.userIds.filter((id) => id !== userId);
  }
  if (email) {
    current.emails = current.emails.filter((e) => e !== email.toLowerCase());
  }
  writeTracked(current);
}

export function getTrackedEntities(): TrackedEntities {
  return readTracked();
}

export function clearTrackedFile() {
  try {
    if (fs.existsSync(TRACK_FILE)) {
      fs.unlinkSync(TRACK_FILE);
    }
  } catch {}
}
