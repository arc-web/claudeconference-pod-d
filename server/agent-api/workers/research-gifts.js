const Anthropic = require('@anthropic-ai/sdk');
const { chromium } = require('playwright');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Research gift ideas using Claude + Playwright.
 *
 * Flow:
 * 1. Claude analyzes person context and generates search queries
 * 2. Playwright searches multiple sites with those queries
 * 3. Claude evaluates results against person's preferences
 * 4. Returns ranked results with confidence scores and reasoning
 */
async function researchGifts(instructions, context, job) {
  await job.updateProgress(10);

  // Step 1: Ask Claude to generate a search strategy
  const strategyResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: buildStrategyPrompt(instructions, context)
    }]
  });

  const strategy = JSON.parse(
    strategyResponse.content[0].text.match(/```json\n([\s\S]*?)```/)?.[1]
    || strategyResponse.content[0].text
  );

  await job.updateProgress(25);

  // Step 2: Use Playwright to search
  const searchResults = await executeSearches(strategy.queries, instructions);
  await job.updateProgress(60);

  // Step 3: Ask Claude to evaluate and rank results
  const evaluationResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: buildEvaluationPrompt(instructions, context, searchResults)
    }]
  });

  const evaluation = JSON.parse(
    evaluationResponse.content[0].text.match(/```json\n([\s\S]*?)```/)?.[1]
    || evaluationResponse.content[0].text
  );

  await job.updateProgress(100);

  return {
    recommendations: evaluation.recommendations || [],
    search_summary: strategy.reasoning,
    sources_checked: searchResults.length,
    generated_at: new Date().toISOString()
  };
}

function buildStrategyPrompt(instructions, context) {
  const { person_name, occasion, budget_min, budget_max } = instructions;
  const { personality, preferences, past_gifts } = context;

  const likes = (preferences || [])
    .filter(p => p.type === 'like')
    .map(p => `${p.category}: ${p.value}`)
    .join('\n  - ');

  const dislikes = (preferences || [])
    .filter(p => p.type === 'dislike')
    .map(p => `${p.category}: ${p.value}`)
    .join('\n  - ');

  const giftHistory = (past_gifts || [])
    .map(g => `"${g.title}" — rated ${g.reaction_rating}/5`)
    .join('\n  - ');

  return `You are a gift research assistant. Analyze this person's profile and generate specific search queries.

Person: ${person_name}
Occasion: ${occasion}
Budget: $${budget_min || 0} — $${budget_max || 200}

Personality:
  MBTI: ${personality?.mbti?.type || 'unknown'}
  Love Language: ${personality?.love_languages?.primary || 'unknown'}

Likes:
  - ${likes || 'No data'}

Dislikes:
  - ${dislikes || 'No data'}

Past gifts:
  - ${giftHistory || 'No history'}

Generate 4-6 specific search queries for sites like Amazon, Etsy, and Uncommon Goods.
Focus on personalized, thoughtful gifts that match their interests.
Avoid generic gifts — the goal is to show the person we KNOW them.

Respond ONLY with JSON:
\`\`\`json
{
  "reasoning": "Brief analysis of what would work well for this person",
  "queries": [
    { "site": "amazon", "query": "specific search terms", "category": "why this category" },
    { "site": "etsy", "query": "specific search terms", "category": "why this category" }
  ]
}
\`\`\``;
}

async function executeSearches(queries, instructions) {
  const results = [];
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    });

    const browserContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    for (const q of queries.slice(0, 4)) { // Limit to 4 searches for memory
      try {
        const page = await browserContext.newPage();
        const searchUrl = buildSearchUrl(q.site, q.query, instructions);

        await page.goto(searchUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const pageResults = await page.evaluate(() => {
          // Generic extraction — grab product-like elements
          const items = [];
          const selectors = [
            '[data-component-type="s-search-result"]',  // Amazon
            '.search-listing-group .listing-link',       // Etsy
            '.product-card',                              // Generic
            '[class*="product"]',                         // Generic fallback
          ];

          for (const sel of selectors) {
            const elements = document.querySelectorAll(sel);
            elements.forEach(el => {
              const title = el.querySelector('h2, h3, [class*="title"]')?.textContent?.trim();
              const price = el.querySelector('[class*="price"], .a-price .a-offscreen')?.textContent?.trim();
              const link = el.querySelector('a')?.href;
              const img = el.querySelector('img')?.src;

              if (title && title.length > 5) {
                items.push({ title: title.slice(0, 200), price, url: link, image: img });
              }
            });
            if (items.length > 0) break;
          }

          return items.slice(0, 5);
        });

        results.push(...pageResults.map(r => ({ ...r, source: q.site, search_query: q.query })));
        await page.close();

      } catch (err) {
        console.error(`Search failed for ${q.site}: ${err.message}`);
      }
    }

    await browserContext.close();
  } catch (err) {
    console.error('Browser error:', err.message);
  } finally {
    if (browser) await browser.close();
  }

  return results;
}

function buildSearchUrl(site, query, instructions) {
  const encoded = encodeURIComponent(query);
  const minPrice = instructions.budget_min || '';
  const maxPrice = instructions.budget_max || '';

  switch (site) {
    case 'amazon':
      return `https://www.amazon.com/s?k=${encoded}&rh=p_36%3A${minPrice}00-${maxPrice}00`;
    case 'etsy':
      return `https://www.etsy.com/search?q=${encoded}&min=${minPrice}&max=${maxPrice}`;
    case 'uncommon_goods':
      return `https://www.uncommongoods.com/search?q=${encoded}`;
    default:
      return `https://www.google.com/search?q=${encoded}+gift&tbm=shop`;
  }
}

function buildEvaluationPrompt(instructions, context, searchResults) {
  const { person_name, occasion, budget_min, budget_max } = instructions;

  const resultsText = searchResults
    .map((r, i) => `${i + 1}. "${r.title}" — ${r.price || 'price unknown'} (${r.source}) ${r.url || ''}`)
    .join('\n');

  return `You are evaluating gift search results for ${person_name}'s ${occasion}.
Budget: $${budget_min || 0}—$${budget_max || 200}

Person's interests: ${JSON.stringify(context.preferences?.filter(p => p.type === 'like').map(p => p.value) || [])}
Person's dislikes: ${JSON.stringify(context.preferences?.filter(p => p.type === 'dislike').map(p => p.value) || [])}
Personality: MBTI ${context.personality?.mbti?.type || '?'}, Love Language: ${context.personality?.love_languages?.primary || '?'}

Search results:
${resultsText}

Pick the top 3-5 best gifts. For each, explain WHY it's a good match for this specific person.
Score confidence 0.0–1.0 based on how well it matches their profile.

Respond ONLY with JSON:
\`\`\`json
{
  "recommendations": [
    {
      "title": "Product name",
      "url": "product URL",
      "price": "$XX",
      "image": "image URL or null",
      "confidence_score": 0.92,
      "reasoning": "Why this is perfect for them — reference specific preferences/personality"
    }
  ]
}
\`\`\``;
}

module.exports = researchGifts;
