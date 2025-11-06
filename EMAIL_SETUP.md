# Email Setup Guide

The system now supports **multiple email providers** with automatic fallback. Choose one of the following free options:

## Option 1: Gmail SMTP (FREE - Recommended for Development)

**Steps:**
1. Use a Gmail account
2. Enable 2-Factor Authentication:
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"
3. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Click "Select app" → Choose "Mail"
   - Click "Select device" → Choose "Other" → Enter "African Nations League"
   - Click "Generate"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

4. Add to `.env.local`:
```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

**Limits:** 500 emails/day (Gmail free tier)

---

## Option 2: Resend (Free Tier)

**Steps:**
1. Sign up at https://resend.com
2. Get your API key from the dashboard
3. Add to `.env.local`:
```env
RESEND_API_KEY=re_your_actual_api_key_here
```

**Limits:** 100 emails/day (free tier)

---

## Option 3: SendGrid (Free Tier)

**Steps:**
1. Sign up at https://sendgrid.com
2. Verify your email
3. Create an API key
4. Add to `.env.local`:
```env
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**Limits:** 100 emails/day (free tier)

---

## How It Works

The system will automatically:
1. Try Resend first (if `RESEND_API_KEY` is set)
2. Fall back to Gmail SMTP (if `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set)
3. Show error if neither is configured

**For development/testing, Gmail SMTP is the easiest and completely free!**

