# n8n Workflow: Travel Itinerary Email

This folder contains the n8n workflow that generates and emails PDF itineraries to users.

## Workflow Overview

```
┌──────────┐    ┌─────────────────┐    ┌────────────┐    ┌─────────────────┐
│ Webhook  │───►│ Format Itinerary│───►│ Send Email │───►│ Respond Success │
│ Trigger  │    │ (Code Node)     │    │ (SMTP)     │    │                 │
└──────────┘    └─────────────────┘    └────────────┘    └─────────────────┘
```

### Nodes

1. **Webhook Trigger**: Receives POST requests with itinerary data
2. **Format Itinerary**: Converts JSON itinerary to beautiful HTML email
3. **Send Email**: Sends the formatted email via SMTP
4. **Respond Success**: Returns success response to the client

## Setup Instructions

### 1. Import the Workflow

1. Open your n8n instance
2. Go to **Workflows** → **Import from File**
3. Select `workflow.json` from this folder
4. Click **Import**

### 2. Configure SMTP Credentials

1. In n8n, go to **Credentials**
2. Click **Add Credential** → **SMTP**
3. Configure your email provider:

**For Gmail:**
```
Host: smtp.gmail.com
Port: 465
User: your-email@gmail.com
Password: your-app-password (not regular password)
SSL/TLS: true
```

**For SendGrid:**
```
Host: smtp.sendgrid.net
Port: 465
User: apikey
Password: your-sendgrid-api-key
SSL/TLS: true
```

**For Mailgun:**
```
Host: smtp.mailgun.org
Port: 465
User: postmaster@your-domain.mailgun.org
Password: your-mailgun-password
SSL/TLS: true
```

4. Save the credential and link it to the "Send Email" node

### 3. Set Environment Variables

In n8n, set the following environment variable:

```
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

Or update the "Send Email" node's `fromEmail` field directly.

### 4. Activate the Workflow

1. Open the imported workflow
2. Toggle **Active** to ON
3. Copy the webhook URL (shown in the Webhook node)

### 5. Configure the Client

Set the webhook URL in your client environment:

```bash
# In client/.env
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/travel-itinerary
```

## Webhook Payload Format

The webhook expects a POST request with the following JSON body:

```json
{
  "email": "user@example.com",
  "itinerary": {
    "destination": "Jaipur",
    "days": [
      {
        "day_number": 1,
        "activities": [
          {
            "time_slot": "Morning",
            "poi_name": "Hawa Mahal",
            "duration_minutes": 90,
            "notes": "Best visited early morning",
            "travel_time_to_next": 15,
            "source": "OpenStreetMap"
          }
        ]
      }
    ],
    "sources": [
      {
        "id": "osm_1",
        "type": "osm",
        "title": "Hawa Mahal",
        "url": "https://www.openstreetmap.org/node/12345"
      }
    ]
  },
  "timestamp": "2026-01-21T10:30:00.000Z"
}
```

## Testing the Workflow

### Using curl:

```bash
curl -X POST https://your-n8n-instance.com/webhook/travel-itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "itinerary": {
      "destination": "Jaipur",
      "days": [{
        "day_number": 1,
        "activities": [{
          "time_slot": "Morning",
          "poi_name": "Hawa Mahal",
          "duration_minutes": 90,
          "notes": "Iconic palace"
        }]
      }],
      "sources": []
    },
    "timestamp": "2026-01-21T10:00:00Z"
  }'
```

### Expected Response:

```json
{
  "success": true,
  "message": "Itinerary sent successfully",
  "destination": "Jaipur",
  "email": "test@example.com"
}
```

## Email Output

The workflow generates a beautifully formatted HTML email with:

- Styled header with destination name
- Day-by-day breakdown with emojis
- Morning/Afternoon/Evening sections
- Activity details (duration, notes, travel time)
- Sources and references section
- Professional footer

## Troubleshooting

### Email not sending?

1. Check SMTP credentials are correct
2. For Gmail, ensure you're using an App Password (not regular password)
3. Check n8n execution logs for error details

### Webhook not triggering?

1. Ensure the workflow is activated
2. Check the webhook URL is correct
3. Verify the request body matches the expected format

### Formatting issues?

1. Check the itinerary JSON structure matches the expected format
2. Ensure all required fields are present (destination, days, activities)

## Customization

### Changing Email Template

Edit the "Format Itinerary" code node to customize:
- Colors and styling
- Layout structure
- Additional sections
- Branding elements

### Adding PDF Generation

To generate a PDF instead of HTML email:

1. Add an HTTP Request node to a PDF generation API (e.g., PDFShift, DocRaptor)
2. Send the HTML content to the API
3. Attach the returned PDF to the email

Example with PDFShift:
```javascript
// Add before Send Email node
const pdfResponse = await $http.request({
  method: 'POST',
  url: 'https://api.pdfshift.io/v3/convert/pdf',
  headers: {
    'Authorization': 'Basic ' + Buffer.from('api:YOUR_API_KEY').toString('base64')
  },
  body: {
    source: htmlContent,
    landscape: false,
    use_print: true
  }
});
```
