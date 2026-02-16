# Advert Interactions Database Error Fix

## Error Description

```
Error tracking advert interaction:
{"code":"23514", "details":null, "hint":null, "message": "new row for relation \"advert_interactions\" violates check constraint \"advert_interactions_interaction_type_check\""}
```

## Root Cause

The `advert_interactions` table has a check constraint that only allows specific interaction types:

**Allowed Values:**
- `'click'`
- `'tap'`
- `'swipe'`
- `'call'`
- `'visit'`
- `'conversion'`

## Solution for Mobile App Developers

### Correct Usage

When tracking advert interactions, use only the allowed interaction types:

```javascript
async function trackAdvertInteraction(advertId, impressionId, userId, interactionType, interactionData = {}) {
  // Validate interaction type
  const validTypes = ['click', 'tap', 'swipe', 'call', 'visit', 'conversion'];

  if (!validTypes.includes(interactionType)) {
    console.error(`Invalid interaction type: ${interactionType}. Must be one of:`, validTypes);
    return;
  }

  const { error } = await supabase
    .from('advert_interactions')
    .insert([{
      advert_id: advertId,
      impression_id: impressionId,
      user_id: userId,
      interaction_type: interactionType,
      interaction_data: interactionData
    }]);

  if (error) {
    console.error('Error tracking advert interaction:', error);
  }
}
```

### Mapping Actions to Interaction Types

Use this guide to map user actions to the correct interaction type:

| User Action | Use This Type | Example |
|------------|---------------|---------|
| User clicks/taps on ad | `'tap'` or `'click'` | User taps ad banner |
| User swipes ad away | `'swipe'` | Dismissing interstitial ad |
| User calls phone number from ad | `'call'` | Clicking phone CTA |
| User visits website from ad | `'visit'` | Clicking website CTA |
| User completes desired action | `'conversion'` | Signs up, makes donation |

### Example Implementations

#### Basic Tap/Click
```javascript
// When user taps an advert
async function handleAdvertTap(advert, impression, user) {
  await trackAdvertInteraction(
    advert.id,
    impression.id,
    user.id,
    'tap',
    { timestamp: new Date().toISOString() }
  );

  // Open advert content...
}
```

#### Call to Action - Phone
```javascript
// When user clicks phone CTA
async function handleCallCTA(advert, impression, user, phoneNumber) {
  await trackAdvertInteraction(
    advert.id,
    impression.id,
    user.id,
    'call',
    {
      phone_number: phoneNumber,
      cta_type: 'phone'
    }
  );

  // Open phone dialer
  Linking.openURL(`tel:${phoneNumber}`);
}
```

#### Call to Action - Website
```javascript
// When user clicks website CTA
async function handleWebsiteCTA(advert, impression, user, url) {
  await trackAdvertInteraction(
    advert.id,
    impression.id,
    user.id,
    'visit',
    {
      url: url,
      cta_type: 'website'
    }
  );

  // Open website
  Linking.openURL(url);
}
```

#### Conversion Tracking
```javascript
// When user completes the desired action (e.g., registration, donation)
async function trackConversion(advert, impression, user, conversionData) {
  await trackAdvertInteraction(
    advert.id,
    impression.id,
    user.id,
    'conversion',
    {
      conversion_type: conversionData.type, // 'registration', 'donation', etc.
      conversion_value: conversionData.value,
      timestamp: new Date().toISOString()
    }
  );
}
```

#### Swipe Dismiss
```javascript
// When user swipes away an interstitial ad
async function handleAdvertDismiss(advert, impression, user) {
  await trackAdvertInteraction(
    advert.id,
    impression.id,
    user.id,
    'swipe',
    {
      action: 'dismiss',
      duration_shown: calculateDuration()
    }
  );
}
```

## Common Mistakes to Avoid

### ❌ Don't Use
```javascript
// These will cause the error:
trackAdvertInteraction(id, impressionId, userId, 'view', {});      // Use impressions table instead
trackAdvertInteraction(id, impressionId, userId, 'close', {});     // Use 'swipe'
trackAdvertInteraction(id, impressionId, userId, 'dismiss', {});   // Use 'swipe'
trackAdvertInteraction(id, impressionId, userId, 'open', {});      // Use 'tap' or 'click'
trackAdvertInteraction(id, impressionId, userId, 'action', {});    // Be specific: 'call', 'visit', etc.
```

### ✅ Do Use
```javascript
// Correct usage:
trackAdvertInteraction(id, impressionId, userId, 'tap', {});
trackAdvertInteraction(id, impressionId, userId, 'click', {});
trackAdvertInteraction(id, impressionId, userId, 'swipe', {});
trackAdvertInteraction(id, impressionId, userId, 'call', {});
trackAdvertInteraction(id, impressionId, userId, 'visit', {});
trackAdvertInteraction(id, impressionId, userId, 'conversion', {});
```

## Alternative: Track Views Separately

For tracking ad views/impressions, use the `advert_impressions` table instead:

```javascript
async function trackAdvertImpression(advertId, userId, userData) {
  const { data, error } = await supabase
    .from('advert_impressions')
    .insert([{
      advert_id: advertId,
      user_id: userId,
      user_region: userData.region,
      user_age: userData.age,
      user_gender: userData.gender,
      shown_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('Error tracking impression:', error);
    return null;
  }

  // Return impression ID for later interaction tracking
  return data.id;
}
```

## Database Schema Reference

### advert_interactions table
```sql
CREATE TABLE advert_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advert_id uuid REFERENCES app_adverts(id),
  impression_id uuid REFERENCES advert_impressions(id),
  user_id uuid REFERENCES auth.users(id),
  interaction_type text CHECK (interaction_type IN ('click', 'tap', 'swipe', 'call', 'visit', 'conversion')),
  interaction_data jsonb,
  created_at timestamptz DEFAULT now()
);
```

## Testing Your Fix

After updating your code, test with each interaction type:

```javascript
// Test suite
const testInteractions = async () => {
  const testImpressionId = 'your-test-impression-id';
  const testAdvertId = 'your-test-advert-id';
  const testUserId = 'your-test-user-id';

  // Test each valid type
  const validTypes = ['click', 'tap', 'swipe', 'call', 'visit', 'conversion'];

  for (const type of validTypes) {
    console.log(`Testing ${type}...`);
    await trackAdvertInteraction(testAdvertId, testImpressionId, testUserId, type, {
      test: true,
      type: type
    });
  }

  console.log('All tests passed!');
};
```

## Summary

1. **Only use these interaction types:** click, tap, swipe, call, visit, conversion
2. **Track views in advert_impressions**, not advert_interactions
3. **Validate interaction types** before inserting
4. **Use specific types** for CTAs: 'call' for phone, 'visit' for website
5. **Track conversions** when users complete desired actions
