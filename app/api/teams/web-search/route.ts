import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

/**
 * Server-side API route to perform web search and extract team data
 * This uses server-side scraping since we can't use browser automation in API routes
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get('country');
    
    if (!country) {
      return NextResponse.json(
        { error: 'Country parameter is required' },
        { status: 400 }
      );
    }

    // Use DuckDuckGo HTML search (no API key needed)
    const searchQuery = encodeURIComponent(`${country} national football team current squad 2024 2025`);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${searchQuery}`;
    
    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const html = await response.text();
        
        // Extract links from search results
        const linkMatches = html.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>/g) || [];
        const links = linkMatches
          .map(match => {
            const hrefMatch = match.match(/href="([^"]+)"/);
            return hrefMatch ? decodeURIComponent(hrefMatch[1].replace(/^\/\/?l\.redirect\.lol\/l\/\?uddg=/, '')) : null;
          })
          .filter(Boolean)
          .slice(0, 5); // Get top 5 results

        // Try to fetch and parse each link
        for (const link of links) {
          if (!link || !link.startsWith('http')) continue;
          
          try {
            const pageResponse = await fetch(link as string, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
              signal: AbortSignal.timeout(8000),
            });

            if (pageResponse.ok) {
              const pageHtml = await pageResponse.text();
              const teamData = parseTeamData(pageHtml, country);
              
              if (teamData && teamData.players.length >= 15) {
                return NextResponse.json({ success: true, data: teamData, source: link });
              }
            }
          } catch (e) {
            // Continue to next link
            continue;
          }
        }
      }
    } catch (error) {
      console.error('Web search failed:', error);
    }

    // Fallback: Try Wikipedia directly
    return NextResponse.json(
      { error: 'Could not find current squad data online. Please use manual entry or static data.' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Error in web search API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search for team data' },
      { status: 500 }
    );
  }
}

/**
 * Parse team data from HTML - generic parser for multiple sites
 */
function parseTeamData(html: string, country: string): any | null {
  // Try multiple parsing strategies
  const players: Array<{ name: string; position: 'GK' | 'DF' | 'MD' | 'AT' }> = [];
  
  // Strategy 1: Look for table rows with player names
  const tableRowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  let rowMatch;
  const seenNames = new Set<string>();
  
  while ((rowMatch = tableRowRegex.exec(html)) !== null && players.length < 23) {
    const row = rowMatch[0];
    
    // Extract all text content from the row
    const textContent = row
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Look for patterns like "Player Name (Position)" or just names
    const nameMatches = textContent.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})\b/g);
    
    if (nameMatches) {
      for (const match of nameMatches) {
        const name = match.trim();
        
        // Skip if too short, too long, or common non-name words
        if (name.length < 3 || name.length > 40) continue;
        if (/^(Position|Name|No|Number|Age|Club|Date|Caps|Goals|Manager|Coach|GK|DF|MD|AT|Goalkeeper|Defender|Midfielder|Attacker)$/i.test(name)) continue;
        if (seenNames.has(name)) continue;
        
        seenNames.add(name);
        
        // Try to detect position from context
        const positionMatch = row.match(/\b(GK|DF|MD|MF|AT|FW|Goalkeeper|Defender|Midfielder|Attacker|Forward)\b/i);
        let position: 'GK' | 'DF' | 'MD' | 'AT' = 'GK';
        
        if (positionMatch) {
          const pos = positionMatch[1].toUpperCase();
          if (pos === 'GK' || pos === 'GOALKEEPER') position = 'GK';
          else if (pos === 'DF' || pos === 'DEFENDER' || pos === 'CB' || pos === 'LB' || pos === 'RB') position = 'DF';
          else if (pos === 'MD' || pos === 'MF' || pos === 'MIDFIELDER' || pos === 'CM' || pos === 'LM' || pos === 'RM') position = 'MD';
          else if (pos === 'AT' || pos === 'FW' || pos === 'ATTACKER' || pos === 'FORWARD' || pos === 'ST' || pos === 'LW' || pos === 'RW') position = 'AT';
        }
        
        // Distribute positions if not detected
        if (!positionMatch) {
          const counts = { GK: 0, DF: 0, MD: 0, AT: 0 };
          players.forEach(p => counts[p.position]++);
          
          if (counts.GK < 3) position = 'GK';
          else if (counts.DF < 8) position = 'DF';
          else if (counts.MD < 7) position = 'MD';
          else if (counts.AT < 5) position = 'AT';
          else continue; // Enough players
        }
        
        players.push({ name, position });
        if (players.length >= 23) break;
      }
    }
  }
  
  // Try to extract manager
  const managerRegex = /(?:Manager|Head Coach|Head coach|Coach)[^:\n]*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
  const managerMatch = html.match(managerRegex);
  const manager = managerMatch ? managerMatch[1].trim() : 'Unknown Manager';
  
  if (players.length >= 15) {
    // Pad to 23 if needed
    while (players.length < 23) {
      const counts = { GK: 0, DF: 0, MD: 0, AT: 0 };
      players.forEach(p => counts[p.position]++);
      
      let position: 'GK' | 'DF' | 'MD' | 'AT' = 'GK';
      if (counts.GK < 3) position = 'GK';
      else if (counts.DF < 8) position = 'DF';
      else if (counts.MD < 7) position = 'MD';
      else position = 'AT';
      
      players.push({ name: '', position });
    }
    
    return {
      country,
      manager,
      players: players.slice(0, 23),
    };
  }
  
  return null;
}

