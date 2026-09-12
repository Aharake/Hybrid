import type { FastifyInstance } from 'fastify';

const EFFECTIVE_DATE = 'September 12, 2026';
const CONTACT_EMAIL = 'aharake10@gmail.com';

function page(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} — Hyvo</title>
<style>
  :root { color-scheme: dark; }
  body { background: #0a0a0b; color: #e8e8ea; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 48px 24px 80px; }
  h1 { font-size: 26px; margin-bottom: 4px; }
  .meta { color: #9a9aa0; font-size: 13px; margin-bottom: 32px; }
  h2 { font-size: 17px; margin-top: 36px; margin-bottom: 10px; color: #f5f5f6; }
  p, li { font-size: 14.5px; color: #c8c8cc; }
  ul { padding-left: 20px; }
  a { color: #4d9fff; }
  .note { margin-top: 48px; padding: 16px; background: #1c1c1f; border-radius: 12px; font-size: 13px; color: #9a9aa0; }
</style>
</head>
<body>
<div class="wrap">
${bodyHtml}
</div>
</body>
</html>`;
}

const privacyBody = `
<h1>Privacy Policy</h1>
<div class="meta">Effective ${EFFECTIVE_DATE}</div>

<p>This policy explains what data Hyvo ("the app") collects, how it's used, and who it's shared with. Hyvo is developed and operated by an individual developer, contactable at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<h2>Information we collect</h2>
<ul>
  <li><strong>Account information:</strong> your email address, and either a password (stored as a salted hash, never in plain text) or your Google account identifier and name if you sign in with Google.</li>
  <li><strong>Profile & fitness data:</strong> information you provide during onboarding, such as age, weight, height, training experience, and fitness goals.</li>
  <li><strong>Workout data:</strong> your training program, workout sessions, and logged sets (exercise, weight, reps).</li>
  <li><strong>Run activity data:</strong> distance, duration, pace, and — for runs you track with GPS — your route, recorded as a series of location points with timestamps.</li>
  <li><strong>Preferences:</strong> app settings such as which stats are shown on your dashboards and your preferred units.</li>
</ul>

<h2>Location data</h2>
<p>Hyvo only records your location while you have actively started a tracked run, including while the app is in the background or your phone is locked — this is what lets a run keep recording if you lock your screen. A persistent notification is shown on Android while tracking is active, and you can stop tracking at any time by ending the run. Location data recorded this way is used solely to compute your route, distance, pace, and to draw the map for that run. Hyvo does not track your location at any other time, and does not use your location for advertising or sell it to anyone.</p>

<h2>What we don't collect</h2>
<p>If you add a background photo to a run's share card, that photo is selected from your device's photo library, composited, and shared entirely on your device — it is never uploaded to or stored on our servers.</p>

<h2>How we use your information</h2>
<p>We use the information above solely to operate the app's core functionality: to authenticate you, to save and sync your program, workout history, and run history to your account so it's available if you reinstall the app or sign in on another device, and to personalize what you see in the app. We do not sell your personal information, and we do not use it for third-party advertising.</p>

<h2>Third-party services</h2>
<ul>
  <li><strong>Better Auth</strong> and our database provider (hosted on Railway) — used to authenticate you and store your account data securely.</li>
  <li><strong>Google Sign-In</strong> — if you choose to sign in with Google, Google processes that sign-in according to its own privacy policy.</li>
</ul>
<p>If we introduce new features that involve additional third-party services (for example, payment processing for subscriptions), we'll update this policy to reflect them.</p>

<h2>Data retention & deletion</h2>
<p>We retain your data for as long as your account is active. To request deletion of your account and associated data, email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> from the address associated with your account, and we'll delete it within a reasonable time.</p>

<h2>Security</h2>
<p>We take reasonable technical measures to protect your data, including encrypted transport (HTTPS) and hashed password storage. No method of transmission or storage is 100% secure, and we can't guarantee absolute security.</p>

<h2>Children's privacy</h2>
<p>Hyvo is not directed at children under 13, and we do not knowingly collect information from children under 13.</p>

<h2>Changes to this policy</h2>
<p>We may update this policy as the app changes. Continued use of the app after an update constitutes acceptance of the revised policy.</p>

<h2>Contact</h2>
<p>Questions about this policy? Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<div class="note">This policy was drafted to reflect Hyvo's actual data practices as accurately as possible, but it has not been reviewed by a lawyer. If you have specific legal concerns, please consult a qualified professional.</div>
`;

const termsBody = `
<h1>Terms of Service</h1>
<div class="meta">Effective ${EFFECTIVE_DATE}</div>

<p>These terms govern your use of Hyvo ("the app"), developed and operated by an individual developer, contactable at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. By creating an account or using the app, you agree to these terms.</p>

<h2>The service</h2>
<p>Hyvo is a fitness tracking app that helps you plan strength training programs and track runs, including GPS route tracking. Some features may require an account, and some features may in the future be offered as a paid subscription.</p>

<h2>Your account</h2>
<p>You're responsible for maintaining the security of your account and for all activity under it. You must provide accurate information when creating an account, and you must be at least 13 years old to use Hyvo.</p>

<h2>Your data</h2>
<p>You retain ownership of the workout, run, and profile data you enter into the app. See our <a href="/privacy">Privacy Policy</a> for details on what we collect and how it's used.</p>

<h2>Acceptable use</h2>
<p>You agree not to misuse the app — including attempting to access other users' accounts or data, interfering with the app's normal operation, or using the app for any unlawful purpose.</p>

<h2>Health & fitness disclaimer</h2>
<p>Hyvo is a training and tracking tool, not a medical device or a substitute for professional medical advice. Calorie, pace, and other estimates shown in the app are approximations. Consult a physician before starting any new exercise program, especially if you have a pre-existing health condition. You use the app's training guidance and GPS tracking at your own risk, including while running outdoors, and should exercise appropriate caution and awareness of your surroundings.</p>

<h2>Subscriptions & purchases</h2>
<p>If Hyvo offers paid subscriptions, purchases are processed through the Apple App Store or Google Play, subject to their respective terms, and any subscription terms (price, billing period, cancellation) will be clearly presented before purchase.</p>

<h2>Termination</h2>
<p>You may stop using the app and request deletion of your account at any time by contacting <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. We may suspend or terminate accounts that violate these terms.</p>

<h2>Disclaimer & limitation of liability</h2>
<p>Hyvo is provided "as is" without warranties of any kind. To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the app, including reliance on GPS accuracy, calorie estimates, or training recommendations.</p>

<h2>Changes to these terms</h2>
<p>We may update these terms as the app changes. Continued use of the app after an update constitutes acceptance of the revised terms.</p>

<h2>Contact</h2>
<p>Questions about these terms? Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<div class="note">These terms were drafted to reflect Hyvo's actual functionality as accurately as possible, but they have not been reviewed by a lawyer. If you have specific legal concerns, please consult a qualified professional.</div>
`;

export async function legalRoutes(app: FastifyInstance) {
  app.get('/privacy', async (_request, reply) => {
    reply.type('text/html').send(page('Privacy Policy', privacyBody));
  });

  app.get('/terms', async (_request, reply) => {
    reply.type('text/html').send(page('Terms of Service', termsBody));
  });
}
