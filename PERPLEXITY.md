# 🤖 Perplexity AI Integration in YABGO Browser

## Overview

YABGO Browser now features integrated Perplexity AI support. When users ask questions or search queries, the assistant automatically routes them to Perplexity with the query pre-filled, enabling seamless AI-powered research and answers.

## How It Works

### Query Processing Flow

```
User Input
    ↓
AssistantManager.processQuery()
    ↓
AssistantService.processQuery()
    ↓
Matches Known Commands? (clear, recent, stats, etc.)
    ↓ (if no match)
handlePerplexityQuery()
    ↓
Returns navigate response with Perplexity URL
    ↓
AssistantManager detects navigate type
    ↓
Emits 'navigate' event with URL
    ↓
BrowserApp routes to TabManager.navigate()
    ↓
Tab opens Perplexity with query
```

## Components Modified

### 1. **AssistantService.ts** (Main Process)
- Added Perplexity URL constant: `https://www.perplexity.ai`
- Added `handlePerplexityQuery()` method
  - Encodes user query for URL
  - Constructs Perplexity search URL with query parameter
  - Returns navigation response with message
- Changed default search behavior to route to Perplexity

### 2. **DataTypes.ts** (Shared Types)
- Extended `AssistantResponse` interface
  - Added `'navigate'` to response type union
  - Added `url?: string` field for navigation URLs

### 3. **AssistantManager.ts** (Renderer Process)
- Enhanced `processQuery()` method
  - Detects `'navigate'` type responses
  - Extracts URL and emits `'navigate'` event
  - Shows user the action is taking place

### 4. **UIManager.ts** (Renderer Process)
- Updated `displayAssistantResponse()` method
  - Added handler for `'navigate'` response type
  - Shows "Opening Perplexity..." message
  - Auto-hides response after brief delay for smooth UX

### 5. **styles.css** (Styling)
- Added `.perplexity-info` styling
- Added `.loading-text` class with pulse animation
- Provides visual feedback while opening Perplexity

## User Experience

### Default Behavior
1. User types a question in the unified input
2. System checks if it's a known command (history, stats, search, etc.)
3. If not a command, it's treated as an AI query
4. Shows brief message: "🤖 Searching on Perplexity for: [query]"
5. New tab opens automatically with Perplexity pre-loaded with the query
6. User can see search results immediately in Perplexity

### Example Queries
```
User Input → Action
"What is AI?" → Opens Perplexity with search
"weather today" → Opens Perplexity with search
"how to learn rust" → Opens Perplexity with search
"recent" → Shows recent browsing history (assistant command)
"stats" → Shows browsing statistics (assistant command)
```

## Key Features

✅ **Automatic Query Encoding** - Handles special characters and spaces
✅ **Seamless Tab Integration** - Opens in new tab without interrupting current browsing
✅ **Visual Feedback** - Shows user what's happening
✅ **Command Preservation** - Local commands (history, stats) still work as expected
✅ **Clean URL Construction** - Proper query parameter formatting

## Technical Implementation

### Perplexity URL Format
```
https://www.perplexity.ai?q=<encoded_query>
```

Example: For query "What is machine learning?"
```
https://www.perplexity.ai?q=What%20is%20machine%20learning%3F
```

### Response Types
```typescript
// Perplexity navigation response
{
    type: 'navigate',
    url: 'https://www.perplexity.ai?q=...',
    message: '🤖 Searching on Perplexity for: ...'
}
```

## Future Enhancements

Potential improvements for future versions:

1. **API Integration** - Direct API calls for faster responses (requires API key)
2. **Custom Search Engines** - Allow users to switch between AI providers
3. **Response Caching** - Cache frequently asked questions locally
4. **Advanced Commands** - Add prefixes like "perplexity:", "search:", etc.
5. **Integration Settings** - Allow users to configure default AI provider

## Configuration

Currently, Perplexity is hardcoded as the default AI provider. To change this in the future:

**File: `src/main/services/AssistantService.ts`**
```typescript
private perplexityUrl: string = 'https://www.perplexity.ai';
```

To support multiple providers, modify the constructor:
```typescript
private aiProvider: string = process.env.AI_PROVIDER || 'perplexity';
private providerUrls: Record<string, string> = {
    perplexity: 'https://www.perplexity.ai',
    chatgpt: 'https://chat.openai.com',
    // etc.
};
```

## Troubleshooting

### Perplexity doesn't open
- Verify internet connection
- Check that Perplexity website is accessible
- Look at browser console for errors

### Query not being passed to Perplexity
- Check if query contains special characters (they should be encoded)
- Verify `processQuery()` is being called in AssistantManager
- Check network tab to see actual URL being opened

### Still showing old response types
- Clear browser cache
- Rebuild the application: `npm run build`
- Restart the development server: `npm run dev`

---

**Last Updated**: October 2025  
**Related Files**:
- `src/main/services/AssistantService.ts`
- `src/renderer/managers/AssistantManager.ts`
- `src/renderer/managers/UIManager.ts`
- `src/shared/types/DataTypes.ts`
- `src/renderer/styles.css`
