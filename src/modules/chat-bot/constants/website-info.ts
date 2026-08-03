/**
 * Central source of truth for all website information used by the chat bot.
 *
 * Edit the values below to keep the assistant's knowledge accurate and
 * up to date. Nothing in this file is fetched dynamically — it is
 * compiled directly into the system prompt.
 */

export const WEBSITE_INFORMATION = {
  about: `
Company Name: [Your Company Name]
Description: [A short, clear description of what the company/website does.]
Founded: [Year]
Mission: [One or two sentences describing the mission.]
  `.trim(),

  features: `
- [Feature 1: short description]
- [Feature 2: short description]
- [Feature 3: short description]
  `.trim(),

  pricing: `
- [Plan/Product name]: [Price] — [What it includes]
- [Plan/Product name]: [Price] — [What it includes]
Note: Always direct users to the official pricing page for the most current pricing.
  `.trim(),

  plans: `
- Free Plan: [Description and limits]
- Pro Plan: [Description and limits]
- Enterprise Plan: [Description and limits]
  `.trim(),

  faq: `
Q: [Frequently asked question 1]
A: [Answer 1]

Q: [Frequently asked question 2]
A: [Answer 2]
  `.trim(),

  contact: `
Email: [support@example.com]
Phone: [+1-000-000-0000]
Business Hours: [Mon–Fri, 9am–5pm]
  `.trim(),

  support: `
Support Channels: [Email / Live Chat / Help Center]
Response Time: [Typical response time]
Help Center URL: [https://example.com/help]
  `.trim(),

  authentication: `
Sign Up: [How users create an account]
Login: [How users log in]
Password Reset: [How users reset their password]
Two-Factor Authentication: [Supported / Not supported]
  `.trim(),

  refundPolicy: `
[Describe the refund policy, eligibility window, and process for requesting a refund.]
  `.trim(),

  terms: `
[Summarize key points of the Terms of Service. Always direct users to the full legal document for binding terms.]
  `.trim(),
} as const;
