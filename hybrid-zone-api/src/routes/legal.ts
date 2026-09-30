import type { FastifyInstance } from 'fastify';

const EFFECTIVE_DATE = 'September 27, 2026';
const CONTACT_EMAIL = 'aleveatelier@gmail.com';
// Minimum age to use the app (the age of digital consent in Poland).
const MIN_AGE = 16;

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
  ul, ol { padding-left: 20px; }
  li { margin-bottom: 6px; }
  a { color: #4d9fff; }
  .box { margin: 18px 0; padding: 16px 18px; background: #1c1c1f; border-radius: 12px; font-size: 14px; color: #d6d6da; }
  .nav { margin-top: 48px; font-size: 13px; color: #9a9aa0; }
  .nav a { margin-right: 14px; }
</style>
</head>
<body>
<div class="wrap">
${bodyHtml}
<div class="nav"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a><a href="/support">Support</a><a href="/delete-account">Delete your account</a></div>
</div>
</body>
</html>`;
}

const privacyBody = `
<h1>Privacy Policy</h1>
<div class="meta">Effective ${EFFECTIVE_DATE}</div>

<p>This policy explains what personal data Hyvo ("the app", "we") collects, why, how it is used, who it is shared with, and the choices and rights you have. Hyvo is developed and operated by an individual developer based in Poland, who is the controller of your personal data. You can contact us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<h2>1. Information we collect</h2>
<ul>
  <li><strong>Account information:</strong> your email address and name, and either a password (stored only as a salted hash) or, if you sign in with Google or Apple, that provider's identifier, name and email. If you use Apple's "Hide My Email", we receive and store Apple's private relay address instead of your real one.</li>
  <li><strong>Profile photo:</strong> if you add one, a small copy of the picture you choose (resized on your device) is stored with your account so it appears on all your devices. Hyvo asks for camera or photo-library access only when you choose to add a photo.</li>
  <li><strong>Profile and fitness information:</strong> what you enter during onboarding, such as age, height, weight, training experience, goals, equipment and your preferred training days.</li>
  <li><strong>Workout data:</strong> your training program, sessions, and the sets you log (exercise, weight, reps, and workout duration).</li>
  <li><strong>Run and activity data:</strong> distance, duration, pace and title for runs and other activities you log, and, for runs you track with GPS, your route as a series of location points with timestamps.</li>
  <li><strong>Preferences:</strong> app settings such as the stats shown and their order, units, and rest-timer and run defaults.</li>
  <li><strong>Subscription status:</strong> if you subscribe to Hyvo Pro, whether it is active, which plan, and when it ends. We never see your payment card details.</li>
  <li><strong>Technical data:</strong> like most servers, ours records standard request logs (such as IP address, time and the request made) for security and troubleshooting.</li>
</ul>

<h2>2. Health data (Apple Health and Health Connect)</h2>
<p>If you choose to connect Apple Health (iOS) or Health Connect (Android), Hyvo reads your steps, active energy, resting and other heart-rate readings, and sleep <strong>on your device</strong> to show them in the app, including on the summary of a workout or run you have just finished. Hyvo only reads this data; it never writes to or changes it. Health data is not uploaded to our servers, is not stored in your account, is not used for advertising or marketing, and is not shared with anyone. You can disconnect at any time in the app (Profile → Connected Apps &amp; Devices) and remove Hyvo's access in your device settings (iOS: Settings → Health → Data Access &amp; Devices → Hyvo).</p>

<h2>3. Location data</h2>
<p>Hyvo records your location only while you have actively started a tracked run, including while the app is in the background or your phone is locked, so that a run keeps recording. On Android a persistent notification is shown while tracking is active. You can stop tracking at any time by ending the run. Location data is used only to work out your route, distance and pace and to draw the map for that run. Hyvo does not track your location at any other time and does not use it for advertising.</p>

<h2>4. Photos you share</h2>
<p>If you add a background photo to a workout or run share image, that photo is selected from your device, combined with your stats and shared entirely on your device. It is not uploaded to or stored on our servers. (Your profile photo is different: see section 1.)</p>

<h2>5. Why we use your data, and our legal basis</h2>
<ul>
  <li><strong>To provide the app</strong> (create your account, save and sync your program and history, calculate your stats and personalise what you see). Legal basis: performing our contract with you.</li>
  <li><strong>To use your location, camera or photos, and health data</strong> for the features you switch on. Legal basis: your consent, which you can withdraw at any time by turning the feature off or revoking the permission in your device settings.</li>
  <li><strong>To keep the service secure and working</strong> (logs, abuse prevention, fixing errors). Legal basis: our legitimate interest in running a safe and reliable service.</li>
  <li><strong>To manage subscriptions and meet legal obligations</strong> such as tax and accounting rules. Legal basis: contract and legal obligation.</li>
</ul>
<p>We do not sell your personal data, do not use it for third-party advertising, and do not make decisions about you by automated means that have legal or similarly significant effects.</p>

<h2>6. Who we share data with</h2>
<p>We share data only with service providers that process it for us, and only as needed:</p>
<ul>
  <li><strong>Railway</strong>, our hosting and database provider, which stores your account data and runs our server.</li>
  <li><strong>Google Sign-In</strong> and <strong>Sign in with Apple</strong>, if you choose either to sign in; that provider processes the sign-in under its own privacy policy.</li>
  <li><strong>RevenueCat</strong>, which manages Hyvo Pro subscriptions. It receives an app user ID and your purchase and entitlement status. Payment itself is handled by the Apple App Store or Google Play.</li>
  <li><strong>Apple Maps / Google Maps</strong>, used to display run maps. Showing a map sends the map area being viewed to the map provider.</li>
</ul>
<p>We may also disclose data if the law requires it or to protect the rights and safety of users or others.</p>

<h2>7. International transfers</h2>
<p>Our providers may process data outside the European Economic Area. Where they do, we rely on the safeguards required by law, such as the European Commission's standard contractual clauses.</p>

<h2>8. How long we keep your data</h2>
<p>We keep your account data for as long as your account exists. When you delete your account, your account and everything tied to it (profile, program, workout and run history, preferences and subscription record) is permanently deleted from our database straight away. Server logs are kept only for a limited time. Some records may be kept for longer where the law requires it, for example accounting records for purchases, which are held by Apple, Google and RevenueCat.</p>

<h2>9. Deleting your account</h2>
<p>You can delete your account and all associated data yourself, at any time, in the app: <strong>Profile → Privacy &amp; Data → Delete My Account</strong>. You can also ask us to do it by emailing <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> from the address on your account; see <a href="/delete-account">how to delete your account</a>. Deleting your account does <strong>not</strong> cancel a subscription: cancel it in your Apple ID (Settings → your name → Subscriptions) or Google Play settings to stop billing. If you signed in with Apple, you can also remove Hyvo from Settings → your name → Sign-In &amp; Security → Sign in with Apple.</p>

<h2>10. Your rights</h2>
<p>If you are in the European Economic Area or the United Kingdom, you have the right to: access your data; correct it; have it erased; restrict or object to its processing; receive it in a portable format; and withdraw consent at any time. Much of this you can do yourself in the app; for anything else, email us and we will respond within one month. You also have the right to lodge a complaint with a data protection authority; in Poland this is the President of the Personal Data Protection Office (UODO, <a href="https://uodo.gov.pl">uodo.gov.pl</a>). Residents of other regions may have similar rights under local law, and we will honour them where they apply.</p>

<h2>11. Security</h2>
<p>We use reasonable technical and organisational measures to protect your data, including encrypted transport (HTTPS) and hashed password storage. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.</p>

<h2>12. Children</h2>
<p>Hyvo is not intended for anyone under ${MIN_AGE}, and we do not knowingly collect personal data from them. If you believe a child has given us data, email us and we will delete it.</p>

<h2>13. Changes to this policy</h2>
<p>We may update this policy as the app changes. We will change the date above and, for significant changes, tell you in the app. Continuing to use Hyvo after an update means you accept the revised policy.</p>

<h2>14. Contact</h2>
<p>Questions or requests about your data? Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`;

const termsBody = `
<h1>Terms of Service</h1>
<div class="meta">Effective ${EFFECTIVE_DATE}</div>

<p>These terms are an agreement between you and the developer of Hyvo ("we", "us"), an individual based in Poland, contactable at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. By creating an account or using Hyvo ("the app"), you agree to these terms and to our <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use the app.</p>

<h2>1. Who can use Hyvo</h2>
<p>You must be at least ${MIN_AGE} years old and able to enter into a binding agreement. You must give accurate information when you create an account and keep your sign-in details secure. You are responsible for activity under your account.</p>

<h2>2. The service</h2>
<p>Hyvo is a fitness app that helps you plan strength training, track runs (including GPS routes), log activities, and see your progress. Some features need an account, and some are part of the paid subscription described below. We may change, add or remove features over time.</p>

<h2>3. Hyvo Pro subscription</h2>
<ul>
  <li><strong>What you are buying.</strong> Hyvo Pro is an optional auto-renewing subscription. The features it includes, its price, its billing period (for example monthly or yearly) and any free trial are shown on the purchase screen before you confirm.</li>
  <li><strong>Payment.</strong> Payment is charged to your Apple ID account (or Google Play account) when you confirm the purchase. We never receive your card details.</li>
  <li><strong>Automatic renewal.</strong> Your subscription renews automatically for the same period and at the current price unless you turn off auto-renew at least 24 hours before the end of the current period. Your account is charged for renewal within 24 hours before the end of the current period.</li>
  <li><strong>Free trials and offers.</strong> If a free trial is offered, it converts to a paid subscription at the end of the trial unless you cancel before then. Any unused part of a free trial is forfeited when you buy a subscription.</li>
  <li><strong>Managing and cancelling.</strong> You can manage or cancel at any time in your account settings: on iPhone, Settings → your name → Subscriptions; on Android, the Google Play Store → Payments &amp; subscriptions → Subscriptions. Deleting the app or your Hyvo account does <strong>not</strong> cancel a subscription. Cancelling stops future renewals; you keep access until the end of the period you have paid for.</li>
  <li><strong>Refunds.</strong> Purchases are made through Apple or Google, so refund requests are handled by them under their policies (for Apple: reportaproblem.apple.com). This does not affect any statutory rights you have as a consumer.</li>
  <li><strong>Price changes.</strong> If we change the price, the App Store or Google Play will notify you and, where required, ask for your consent before the new price applies to you.</li>
  <li><strong>Restoring purchases.</strong> If you reinstall the app or use a new device, use "Restore purchases" in the app to get your subscription back.</li>
</ul>

<h2>4. Your data and content</h2>
<p>You keep ownership of the workout, run and profile data and the photos you put into Hyvo. You give us permission to store, process and display that data solely to run the app for you, as described in the <a href="/privacy">Privacy Policy</a>. You are responsible for what you enter and confirm you have the right to use any photo you upload.</p>

<h2>5. Acceptable use</h2>
<p>You agree not to: access another person's account or data; interfere with or overload the app or its servers; reverse engineer the app except where the law allows it; use the app to break the law or others' rights; or use automated means to create accounts or collect data from the app.</p>

<h2>6. Health and safety disclaimer</h2>
<p>Hyvo is a training and tracking tool. It is not a medical device and does not give medical advice, diagnosis or treatment. Calorie, pace, heart-rate, recovery and other figures are estimates and may be inaccurate, and data that comes from Apple Health, Health Connect, watches or other devices depends on those devices. Talk to a doctor before starting or changing an exercise program, especially if you have a health condition, are pregnant, or feel pain, dizziness or chest discomfort while training, and stop if you do. You exercise at your own risk, including when running outdoors: stay aware of traffic and your surroundings and do not look at your phone in a way that puts you in danger.</p>

<h2>7. Intellectual property</h2>
<p>The app, including its design, code, text, graphics and the Hyvo name and logo, belongs to us or our licensors and is protected by law. We give you a personal, non-exclusive, non-transferable, revocable licence to install and use the app on devices you own or control, for your own personal, non-commercial use, under these terms.</p>

<h2>8. Third-party services</h2>
<p>The app works with services we do not control, such as Apple Health, Health Connect, Apple and Google sign-in, map providers, and the App Store and Google Play. Your use of them is governed by their own terms and privacy policies, and we are not responsible for them.</p>

<h2>9. Apple App Store terms</h2>
<p>If you got Hyvo from the Apple App Store, the following also applies. It is between you and us only, not Apple.</p>
<ul>
  <li>These terms are between you and us, not Apple. We, not Apple, are responsible for the app and its content.</li>
  <li>Apple has no obligation to provide maintenance or support for the app.</li>
  <li>If the app fails to meet any applicable warranty, you may tell Apple and Apple will refund the purchase price (if any). To the maximum extent permitted by law, Apple has no other warranty obligation for the app. Any other claims, losses or costs from a failure to meet a warranty are our responsibility.</li>
  <li>We, not Apple, are responsible for dealing with any claims about the app or your use of it, including product liability claims, claims that it fails to meet legal or regulatory requirements, and consumer protection or privacy claims.</li>
  <li>If a third party claims that the app infringes their intellectual property rights, we, not Apple, are responsible for the investigation, defence, settlement and discharge of that claim.</li>
  <li>You confirm that you are not located in a country subject to a US government embargo or designated as a "terrorist supporting" country, and that you are not on any US government list of prohibited or restricted parties.</li>
  <li>You must follow any applicable third-party terms when using the app, such as your wireless data service agreement.</li>
  <li>Apple and its subsidiaries are third-party beneficiaries of these terms. When you accept them, Apple can enforce them against you as a third-party beneficiary.</li>
</ul>

<h2>10. Ending your use</h2>
<p>You can stop using Hyvo and delete your account at any time in the app (Profile → Privacy &amp; Data → Delete My Account) or by emailing <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. We may suspend or end your access if you break these terms or misuse the app, or if we stop offering the app, and we will give you reasonable notice where we can. Sections that by their nature should survive (such as ownership, disclaimers and liability) continue after these terms end.</p>

<h2>11. Warranties and liability</h2>
<p>The app is provided "as is" and "as available". To the extent the law allows, we do not promise that it will be uninterrupted, error-free or accurate, and we are not liable for indirect or consequential loss, or for loss caused by reliance on GPS accuracy, calorie estimates or training suggestions. Our total liability to you for any claim about the app is limited to the amount you paid us for it in the 12 months before the claim (or, if you paid nothing, to EUR 50). Nothing in these terms excludes or limits liability that cannot be excluded or limited by law, including for death or personal injury caused by our negligence, for fraud, or your mandatory rights as a consumer.</p>

<h2>12. Consumer rights</h2>
<p>If you are a consumer in the EU or elsewhere, you keep the rights that the law of your country gives you and that cannot be changed by contract. Where you subscribe through Apple or Google, the purchase and any right of withdrawal or refund that applies to it are handled under their terms.</p>

<h2>13. Governing law</h2>
<p>These terms are governed by Polish law, without depriving you of the mandatory consumer protections of the country where you live. Where the law allows us to choose, disputes are for the competent courts of Poland; as a consumer you may also bring a claim in the courts of your own country.</p>

<h2>14. Changes to these terms</h2>
<p>We may update these terms as the app changes. We will change the date above and, for significant changes, tell you in the app. If you keep using Hyvo after an update takes effect, you accept the new terms; if you do not agree, you can delete your account.</p>

<h2>15. Contact</h2>
<p>Questions about these terms? Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`;

const supportBody = `
<h1>Hyvo Support</h1>
<div class="meta">We usually reply within a few days.</div>

<p>Need help, found a bug, or have a question about your data? Email <a href="mailto:${CONTACT_EMAIL}?subject=Hyvo%20support">${CONTACT_EMAIL}</a>. It helps to tell us your phone model, the app version (Profile → About), and what you were doing when the problem happened.</p>

<h2>Common questions</h2>
<ul>
  <li><strong>How do I cancel my subscription?</strong> On iPhone: Settings → your name → Subscriptions → Hyvo. Deleting the app does not cancel it.</li>
  <li><strong>How do I restore a purchase?</strong> In the app: Profile → Hyvo Pro → Restore purchases.</li>
  <li><strong>My steps or heart rate are missing.</strong> Connect Apple Health in Profile → Connected Apps &amp; Devices, and make sure Heart Rate, Steps, Sleep and Active Energy are allowed for Hyvo in Settings → Health → Data Access &amp; Devices. Watches from other brands only appear if their own app is set to share with Apple Health.</li>
  <li><strong>How do I delete my account?</strong> See <a href="/delete-account">how to delete your account</a>.</li>
</ul>
`;

const deleteBody = `
<h1>Delete your Hyvo account</h1>
<div class="meta">Permanent, and it takes effect immediately.</div>

<h2>In the app (fastest)</h2>
<ol>
  <li>Open Hyvo and go to the <strong>Profile</strong> tab.</li>
  <li>Tap <strong>Privacy &amp; Data</strong>.</li>
  <li>Tap <strong>Delete My Account</strong> and confirm.</li>
</ol>

<h2>By email</h2>
<p>If you can't open the app, email <a href="mailto:${CONTACT_EMAIL}?subject=Delete%20my%20Hyvo%20account">${CONTACT_EMAIL}</a> from the email address on your account and ask us to delete it. We will confirm once it is done.</p>

<h2>What gets deleted</h2>
<p>Your profile and photo, training program, workout history, run history and routes, preferences and subscription record are permanently removed from our database. Health data read from Apple Health or Health Connect was never stored on our servers. Server logs are kept only for a limited time.</p>

<div class="box"><strong>Subscriptions are not cancelled automatically.</strong> If you subscribed to Hyvo Pro, cancel it in Settings → your name → Subscriptions (iPhone) or in Google Play so you are not billed again. If you signed in with Apple, you can also remove Hyvo under Settings → your name → Sign-In &amp; Security → Sign in with Apple.</div>
`;

export async function legalRoutes(app: FastifyInstance) {
  app.get('/privacy', async (_request, reply) => {
    reply.type('text/html').send(page('Privacy Policy', privacyBody));
  });

  app.get('/terms', async (_request, reply) => {
    reply.type('text/html').send(page('Terms of Service', termsBody));
  });

  // App Store Connect requires a support URL; the delete page doubles as the
  // web instructions some stores ask for.
  app.get('/support', async (_request, reply) => {
    reply.type('text/html').send(page('Support', supportBody));
  });

  app.get('/delete-account', async (_request, reply) => {
    reply.type('text/html').send(page('Delete your account', deleteBody));
  });
}
