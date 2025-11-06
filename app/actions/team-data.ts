'use server';

import * as cheerio from 'cheerio';

interface PlayerData {
  name: string;
  position: 'GK' | 'DF' | 'MD' | 'AT';
}

interface TeamData {
  country: string;
  manager: string;
  players: PlayerData[];
  starting11?: string[]; // Player names in starting 11
  bench?: string[]; // Player names on bench (from substitutions)
}

interface CacheEntry {
  data: TeamData;
  timestamp: number;
}

// Simple in-memory cache with 1-hour TTL (ensures fresh recent data while reducing API calls)
// Cache is keyed by country name - short TTL ensures we get updated squad information regularly
const dataCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get cached data if available and not expired
 * Also validates that cached data has valid player names (not dates)
 */
function getCachedData(country: string): TeamData | null {
  const entry = dataCache.get(country);
  if (entry && (Date.now() - entry.timestamp) < CACHE_TTL) {
    // Validate that cached data has valid player names (not dates)
    const validPlayers = entry.data.players.filter(p => {
      const name = p.name.trim();
      
      // Check if name looks like a date (contains date patterns)
      const isDate = name.match(/^\d{4}-\d{2}-\d{2}/) || 
                     name.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) ||
                     name.match(/\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i) ||
                     name.match(/\(age\s+\d+\)/i) ||
                     name.match(/^\d{4}$/);
      
      // Check if name is a valid player name
      const hasLetters = /[A-Za-z]{2,}/.test(name);
      const reasonableLength = name.length >= 2 && name.length < 50;
      const notHeader = !name.match(/^(Name|Position|Day of Birth|Date|FIFA|Non FIFA|No\.|Number|Age|Club|Current Club)$/i);
      
      return !isDate && hasLetters && reasonableLength && notHeader;
    });
    
    // Require at least 15 valid player names (reasonable threshold for a squad)
    if (validPlayers.length >= 15) {
      console.log(`📦 Using cached data for ${country} (${validPlayers.length} valid players)`);
      return entry.data;
    } else {
      // Cached data has too many invalid names (dates), invalidate cache
      console.log(`⚠️ Invalid cached data for ${country} (only ${validPlayers.length} valid players, contains dates instead of names), fetching fresh data`);
      dataCache.delete(country);
      return null;
    }
  }
  if (entry) {
    dataCache.delete(country); // Remove expired entry
  }
  return null;
}

/**
 * Store data in cache
 */
function setCachedData(country: string, data: TeamData): void {
  dataCache.set(country, {
    data,
    timestamp: Date.now(),
  });
}

// Country name mapping to different formats used by various websites
const COUNTRY_NAME_MAPPINGS: Record<string, string[]> = {
  'Nigeria': ['Nigeria'],
  'Egypt': ['Egypt'],
  'Senegal': ['Senegal'],
  'Morocco': ['Morocco'],
  'Ivory Coast': ['Ivory Coast', 'Côte d\'Ivoire', 'Cote d\'Ivoire'],
  'Ghana': ['Ghana'],
  'Cameroon': ['Cameroon'],
  'Algeria': ['Algeria'],
  'Tunisia': ['Tunisia'],
  'South Africa': ['South Africa', 'South_Africa'],
  'Mali': ['Mali'],
  'Burkina Faso': ['Burkina Faso'],
  'Kenya': ['Kenya'],
  'Uganda': ['Uganda'],
  'Tanzania': ['Tanzania'],
  'Ethiopia': ['Ethiopia'],
  'Zambia': ['Zambia'],
  'Zimbabwe': ['Zimbabwe'],
  'Angola': ['Angola'],
  'Mozambique': ['Mozambique'],
  'Gabon': ['Gabon'],
};

// Position mapping from various formats to our Position type
const POSITION_MAP: Record<string, 'GK' | 'DF' | 'MD' | 'AT'> = {
  // Goalkeeper
  'GK': 'GK',
  'Goalkeeper': 'GK',
  'Goal Keeper': 'GK',
  
  // Defender
  'DF': 'DF',
  'Defender': 'DF',
  'Centre Back': 'DF',
  'Center Back': 'DF',
  'CB': 'DF',
  'Right Back': 'DF',
  'RB': 'DF',
  'Left Back': 'DF',
  'LB': 'DF',
  'Central Defender': 'DF',
  
  // Midfielder
  'MD': 'MD',
  'MF': 'MD',
  'Midfielder': 'MD',
  'Centre Midfielder': 'MD',
  'Center Midfielder': 'MD',
  'CM': 'MD',
  'Attacking Midfielder': 'MD',
  'Defensive Midfielder': 'MD',
  'Left Midfielder': 'MD',
  'LM': 'MD',
  'Right Midfielder': 'MD',
  'RM': 'MD',
  'Central Midfielder': 'MD',
  
  // Attacker
  'AT': 'AT',
  'FW': 'AT',
  'Forward': 'AT',
  'Attacker': 'AT',
  'Centre Forward': 'AT',
  'Center Forward': 'AT',
  'CF': 'AT',
  'Striker': 'AT',
  'ST': 'AT',
  'Right Winger': 'AT',
  'RW': 'AT',
  'Left Winger': 'AT',
  'LW': 'AT',
  'Winger': 'AT',
};

/**
 * Fetch real-time team data from multiple sources (national-football-teams.com, Wikipedia, etc.)
 */
export async function fetchRealTimeTeamData(country: string): Promise<{ success: boolean; data?: TeamData; error?: string }> {
  try {
    if (!country) {
      return { success: false, error: 'Country is required' };
    }

    // CACHE DISABLED - Fetch fresh data every time until player name loading is properly tested
    // Check cache first - if cached data exists and is fresh (< 1 hour old), use it
    // Otherwise fetch fresh data to ensure we always have recent squad information
    // const cachedData = getCachedData(country);
    // if (cachedData) {
    //   return { success: true, data: cachedData };
    // }
    
    // Method 1: Try national-football-teams.com first (most reliable for current squads)
    const nftData = await fetchFromNationalFootballTeams(country);
    if (nftData && nftData.players.length >= 15) {
      console.log(`✅ Successfully fetched ${nftData.players.length} players for ${country} from national-football-teams.com`);
      // setCachedData(country, nftData); // Cache successful result - DISABLED
      return { success: true, data: nftData };
    }

    // Method 2: Try Wikipedia API
    const wikiData = await fetchFromWikipedia(country);
    if (wikiData && wikiData.players.length >= 15) {
      console.log(`✅ Successfully fetched ${wikiData.players.length} players for ${country} from Wikipedia`);
      // setCachedData(country, wikiData); // Cache successful result - DISABLED
      return { success: true, data: wikiData };
    }

    // Method 3: Try web search API (searches multiple sources)
    try {
      const searchApiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/teams/web-search?country=${encodeURIComponent(country)}`;
      const searchResponse = await fetch(searchApiUrl, {
        signal: AbortSignal.timeout(15000), // 15 second timeout for web search
      });

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.success && searchResult.data && searchResult.data.players.length >= 15) {
          console.log(`✅ Successfully fetched ${searchResult.data.players.length} players for ${country} from web search`);
          // setCachedData(country, searchResult.data); // Cache successful result - DISABLED
          return { success: true, data: searchResult.data };
        }
      }
    } catch (searchError: any) {
      console.log('Web search API failed:', searchError.message);
    }

    // Method 4: Use static JSON as fallback
    return { 
      success: false, 
      error: `Real-time data not available for ${country}. Please use the manual form or the static data option.` 
    };

  } catch (error: any) {
    console.error('Error fetching real-time team data:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch real-time team data' 
    };
  }
}

// Country ID mapping for national-football-teams.com (discovered IDs)
const COUNTRY_IDS: Record<string, number> = {
  'South Africa': 172,
  'Nigeria': 135,
  'Egypt': 57,
  'Senegal': 163,
  'Morocco': 125,
  'Ivory Coast': 209,
  'Ghana': 72,
  'Cameroon': 35,
  'Algeria': 3,
  'Tunisia': 190,
  'Mali': 116,
  'Burkina Faso': 32,
  'Kenya': 97,
  'Uganda': 195,
  'Tanzania': 185,
  'Ethiopia': 63,
  'Zambia': 207,
  'Zimbabwe': 208,
  'Angola': 6,
  'Mozambique': 126,
  'Gabon': 68,
};

/**
 * Find the most recent match URL for a country
 * Searches the country's page for recent matches link
 */
async function findMostRecentMatch(country: string): Promise<string | null> {
  try {
    const countryVariants = COUNTRY_NAME_MAPPINGS[country] || [country];
    const currentYear = new Date().getFullYear();
    const countryId = COUNTRY_IDS[country];
    
    // Try to access country page to find recent matches
    if (!countryId) return null;
    
    const urlFormats: string[] = [];
    for (const variant of countryVariants) {
      urlFormats.push(
        `https://www.national-football-teams.com/country/${countryId}/${currentYear}/${variant.replace(/\s+/g, '_')}.html`,
        `https://www.national-football-teams.com/country/${countryId}/${currentYear - 1}/${variant.replace(/\s+/g, '_')}.html`
      );
    }

    for (const url of urlFormats) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html',
            'Referer': 'https://www.national-football-teams.com/',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);
          
          // Look for links to match reports (format: /matches/report/XXXXX/...)
          const matchLinks = $('a[href*="/matches/report/"]');
          if (matchLinks.length > 0) {
            const firstMatchUrl = matchLinks.first().attr('href');
            if (firstMatchUrl) {
              const fullUrl = firstMatchUrl.startsWith('http') 
                ? firstMatchUrl 
                : `https://www.national-football-teams.com${firstMatchUrl}`;
              console.log(`✅ Found recent match: ${fullUrl}`);
              return fullUrl;
            }
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.log(`Failed to fetch country page ${url}:`, error.message);
        }
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding recent match:', error);
    return null;
  }
}

/**
 * Parse match report to extract starting 11 and bench players
 */
function parseMatchLineup(html: string, country: string): { starting11: string[]; bench: string[] } | null {
  try {
    const $ = cheerio.load(html);
    const starting11: string[] = [];
    const bench: string[] = [];
    
    // Find the country's formation section - try multiple selectors
    let countrySection = $(`h2:contains("Formation of ${country}")`);
    
    if (countrySection.length === 0) {
      // Try alternative format - look for country name in heading
      countrySection = $('h2').filter((i, el) => {
        const text = $(el).text();
        return text.includes(country) && text.includes('Formation');
      }).first();
    }
    
    if (countrySection.length === 0) {
      // Last resort: find any section with country name
      countrySection = $('h2, h3').filter((i, el) => {
        return $(el).text().includes(country);
      }).first();
    }
    
    if (countrySection.length === 0) {
      console.log(`⚠️ Could not find formation section for ${country}`);
      return null;
    }
    
    // Find the container - go up to find parent section/div
    let sectionContainer = countrySection.parent();
    
    // Also look in next sibling containers
    const nextSiblings = countrySection.nextAll('div, section').first();
    if (nextSiblings.length > 0) {
      sectionContainer = nextSiblings;
    }
    
    // Find "Starting Line-Up" heading (could be h6, strong, or div with text)
    let startingLineupHeading = sectionContainer.find('h6:contains("Starting Line-Up"), strong:contains("Starting Line-Up")');
    
    if (startingLineupHeading.length === 0) {
      // Try case-insensitive search in all elements
      startingLineupHeading = sectionContainer.find('*').filter((i, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('starting') && text.includes('line-up') || text.includes('starting lineup');
      }).first();
    }
    
    if (startingLineupHeading.length > 0) {
      // Find the next container after "Starting Line-Up" heading
      let lineupContainer = startingLineupHeading.next();
      if (lineupContainer.length === 0) {
        lineupContainer = startingLineupHeading.parent();
      }
      
      // Also try siblings
      if (lineupContainer.find('a[href*="/player/"]').length === 0) {
        lineupContainer = startingLineupHeading.nextAll().first();
      }
      
      // Extract all player links - limit to first 11 unique players
      const seen = new Set<string>();
      lineupContainer.find('a[href*="/player/"]').each((i, el) => {
        if (starting11.length >= 11) return false; // Stop at 11
        
        const playerName = $(el).text().trim();
        // Handle "Last, First" format - use last name if comma exists, otherwise full name
        let cleanedName = playerName;
        
        if (playerName.includes(',')) {
          // Format: "Williams, Ronwen" -> use "Williams" or full name for matching
          const parts = playerName.split(',').map(p => p.trim());
          cleanedName = parts[0]; // Use last name for matching
        }
        
        if (cleanedName && cleanedName.length > 2 && !seen.has(cleanedName.toLowerCase())) {
          starting11.push(playerName); // Store full name for better matching
          seen.add(cleanedName.toLowerCase());
          seen.add(playerName.toLowerCase());
        }
      });
    }
    
    // Find "Substitutions" heading
    let subsHeading = sectionContainer.find('h6:contains("Substitutions"), strong:contains("Substitutions")');
    
    if (subsHeading.length === 0) {
      subsHeading = sectionContainer.find('*').filter((i, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('substitut');
      }).first();
    }
    
    if (subsHeading.length > 0) {
      let subsContainer = subsHeading.next();
      if (subsContainer.length === 0) {
        subsContainer = subsHeading.parent();
      }
      
      if (subsContainer.find('a[href*="/player/"]').length === 0) {
        subsContainer = subsHeading.nextAll().first();
      }
      
      const seen = new Set<string>();
      subsContainer.find('a[href*="/player/"]').each((i, el) => {
        const playerName = $(el).text().trim();
        let cleanedName = playerName;
        
        if (playerName.includes(',')) {
          const parts = playerName.split(',').map(p => p.trim());
          cleanedName = parts[0];
        }
        
        // Check if this player is not already in starting 11
        const isInStarting11 = starting11.some(name => {
          const startName = name.toLowerCase();
          const checkName = playerName.toLowerCase();
          return startName.includes(checkName.split(',')[0].trim()) || 
                 checkName.includes(startName.split(',')[0].trim());
        });
        
        if (cleanedName && cleanedName.length > 2 && !isInStarting11 && !seen.has(cleanedName.toLowerCase())) {
          bench.push(playerName);
          seen.add(cleanedName.toLowerCase());
          seen.add(playerName.toLowerCase());
        }
      });
    }
    
    console.log(`📋 Parsed lineup: ${starting11.length} starters, ${bench.length} bench players`);
    
    // Validate we have reasonable data
    if (starting11.length === 0) {
      return null;
    }
    
    return { starting11, bench };
  } catch (error) {
    console.error('Error parsing match lineup:', error);
    return null;
  }
}

/**
 * Fetch team data from national-football-teams.com
 * This is the most reliable source for current squad data
 * Now also tries to fetch starting 11 from most recent match
 */
async function fetchFromNationalFootballTeams(country: string): Promise<TeamData | null> {
  try {
    const countryVariants = COUNTRY_NAME_MAPPINGS[country] || [country];
    const currentYear = new Date().getFullYear();
    const countryId = COUNTRY_IDS[country];
    
    // Build URL formats - try with country ID first (most reliable), then without
    const urlFormats: string[] = [];
    
    // If we have a country ID, use it (preferred method)
    if (countryId) {
      for (const variant of countryVariants) {
        urlFormats.push(
          `https://www.national-football-teams.com/country/${countryId}/${currentYear}/${variant.replace(/\s+/g, '_')}.html`,
          `https://www.national-football-teams.com/country/${countryId}/${currentYear - 1}/${variant.replace(/\s+/g, '_')}.html`
        );
      }
    }
    
    // Fallback: try without country ID (some countries might work)
    for (const variant of countryVariants) {
      urlFormats.push(
        `https://www.national-football-teams.com/country/${currentYear}/${variant.replace(/\s+/g, '_')}.html`,
        `https://www.national-football-teams.com/national_team/${variant.replace(/\s+/g, '_')}.html`,
        `https://www.national-football-teams.com/country/${currentYear - 1}/${variant.replace(/\s+/g, '_')}.html`
      );
    }

    let teamData: TeamData | null = null;

    for (const url of urlFormats) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.national-football-teams.com/',
          },
          signal: AbortSignal.timeout(15000), // Increased timeout
        });

        if (response.ok) {
          const html = await response.text();
          teamData = parseNationalFootballTeams(html, country);
          
          if (teamData && teamData.players.length >= 15) {
            console.log(`✅ Successfully parsed ${teamData.players.length} players from ${url}`);
            break;
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.log(`Failed to fetch from ${url}:`, error.message);
        }
        continue;
      }
    }

    // Now try to fetch most recent match lineup if we have squad data
    if (teamData && teamData.players.length >= 15) {
      try {
        const matchUrl = await findMostRecentMatch(country);
        if (matchUrl) {
          const matchResponse = await fetch(matchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html',
              'Referer': 'https://www.national-football-teams.com/',
            },
            signal: AbortSignal.timeout(10000),
          });

          if (matchResponse.ok) {
            const matchHtml = await matchResponse.text();
            const lineup = parseMatchLineup(matchHtml, country);
            
            if (lineup && lineup.starting11.length > 0) {
              teamData.starting11 = lineup.starting11;
              teamData.bench = lineup.bench;
              console.log(`✅ Extracted lineup from recent match: ${lineup.starting11.length} starters, ${lineup.bench.length} bench`);
            }
          }
        }
      } catch (error: any) {
        console.log(`⚠️ Could not fetch match lineup (using squad data only):`, error.message);
      }
    }

    return teamData;
  } catch (error) {
    console.error('Error fetching from national-football-teams.com:', error);
    return null;
  }
}

/**
 * Parse HTML from national-football-teams.com
 * The site has a table structure: Name | Day of Birth | Position | Current Club | Stats
 */
function parseNationalFootballTeams(html: string, country: string): TeamData | null {
  try {
    const $ = cheerio.load(html);
    const players: PlayerData[] = [];
    
    // Find the players table - look for table with "Players of [country] in [year]" heading
    // The table structure has headers: Name | Day of Birth | Position | Current Club | M | S | G ...
    const playersSection = $('h2:contains("Players"), h2:contains("Squad")').first();
    let playersTable = $('table').filter((i, table) => {
      const allText = $(table).text();
      const hasName = allText.includes('Name') || allText.includes('Player');
      const hasPosition = allText.includes('Position') || allText.includes('Pos.');
      return hasName && hasPosition;
    }).first();

    // If no table found, try finding any table after the players heading
    if (playersTable.length === 0 && playersSection.length > 0) {
      playersTable = playersSection.nextAll('table').first();
    }
    
    // Also try finding table that contains player links
    if (playersTable.length === 0) {
      playersTable = $('table').filter((i, table) => {
        return $(table).find('td a[href*="/player/"]').length > 0;
      }).first();
    }

    if (playersTable.length === 0) {
      console.log('No players table found in HTML');
      return null;
    }

    // Find column indices - look at second header row (first might be FIFA/Non FIFA)
    const rows = playersTable.find('tr');
    let headerRow = rows.eq(0);
    
    // Check if first row has headers, otherwise use second row
    const firstRowText = headerRow.text();
    if (!firstRowText.includes('Name') && rows.length > 1) {
      headerRow = rows.eq(1);
    }
    
    const headers: string[] = [];
    headerRow.find('th, td').each((i, cell) => {
      headers.push($(cell).text().trim());
    });
    
    const nameColIndex = headers.findIndex(h => h.includes('Name') || h.includes('Player'));
    const positionColIndex = headers.findIndex(h => h.includes('Position') || h.includes('Pos.'));

    if (nameColIndex === -1) {
      console.log('Could not find Name column in table');
      return null;
    }

    const positionCount = { GK: 0, DF: 0, MD: 0, AT: 0 };
    const maxPlayers = { GK: 3, DF: 8, MD: 7, AT: 5 };

    // Extract players from table rows (skip header rows)
    playersTable.find('tbody tr, tr').each((i, row) => {
      if (players.length >= 23) return false; // Stop if we have enough players

      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length === 0) return; // Skip header rows

      // Extract name - PRIORITIZE player links (most reliable)
      let name = '';
      
      // First, try to find a link that points to /player/ (most reliable indicator)
      const playerLinks = $row.find('td a[href*="/player/"]');
      if (playerLinks.length > 0) {
        name = playerLinks.first().text().trim();
      } else if (nameColIndex !== -1 && cells.length > nameColIndex) {
        // Use name column if found and no player link available
        const nameCell = $(cells[nameColIndex]);
        const nameLink = nameCell.find('a');
        if (nameLink.length > 0) {
          name = nameLink.text().trim();
        } else {
          const cellText = nameCell.text().trim();
          // Only use cell text if it looks like a name (has letters)
          if (/[A-Za-z]{2,}/.test(cellText)) {
            name = cellText;
          }
        }
      } else {
        // Last resort: try first link in row
        const firstLink = $row.find('td a').first();
        if (firstLink.length > 0) {
          name = firstLink.text().trim();
        }
      }
      
      // Validate name - skip if it looks like a date or invalid
      if (!name || name.length < 2) return;
      
      // Skip if it looks like a date (YYYY-MM-DD or similar patterns)
      if (name.match(/^\d{4}-\d{2}-\d{2}/) || 
          name.match(/^\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i) ||
          name.match(/\(age\s+\d+\)/i) ||
          name.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) ||
          name.match(/^\d{4}$/)) {
        return; // Skip date patterns
      }
      
      // Skip if it's not a player name (header rows, etc.)
      if (name.match(/^(Name|Position|Day of Birth|Date|FIFA|Non FIFA|No\.|Number|Age|Club|Current Club|M|S|G|Matches|Goals|Substitutions)$/i)) return;
      
      // Must look like a name (contains letters, not just numbers or dates)
      if (!/[A-Za-z]{2,}/.test(name)) return;
      
      // Additional validation: name should have at least 2 letters and not be mostly numbers
      const letterCount = (name.match(/[A-Za-z]/g) || []).length;
      const numberCount = (name.match(/[0-9]/g) || []).length;
      if (letterCount < 2 || numberCount > letterCount) return;

      // Extract position
      let position: 'GK' | 'DF' | 'MD' | 'AT' = 'GK';
      let foundPosition = false;
      
      if (positionColIndex !== -1 && cells.length > positionColIndex) {
        const positionText = $(cells[positionColIndex]).text().trim();
        if (POSITION_MAP[positionText]) {
          position = POSITION_MAP[positionText];
          foundPosition = true;
        }
      }
      
      // If position not found in expected column, search all cells
      if (!foundPosition) {
        cells.each((j, cell) => {
          const cellText = $(cell).text().trim();
          if (POSITION_MAP[cellText]) {
            position = POSITION_MAP[cellText];
            foundPosition = true;
            return false; // Break
          }
        });
      }

      // If position still not found, distribute based on current counts
      if (!foundPosition) {
        if (positionCount.GK < maxPlayers.GK) {
          position = 'GK';
        } else if (positionCount.DF < maxPlayers.DF) {
          position = 'DF';
        } else if (positionCount.MD < maxPlayers.MD) {
          position = 'MD';
        } else if (positionCount.AT < maxPlayers.AT) {
          position = 'AT';
        } else {
          return; // Enough players
        }
      }
      
      positionCount[position]++;

      // Clean up name (remove extra whitespace, numbers, etc.)
      const cleanName = name
        .replace(/\s+/g, ' ')
        .replace(/\(\d+\)/g, '')
        .replace(/^\d+\.?\s*/, '') // Remove leading numbers
        .trim();

      if (cleanName.length >= 2 && !players.some(p => p.name === cleanName)) {
        players.push({ name: cleanName, position });
      }
    });

    // Extract manager name from "Coaches in [year]" section
    // The structure is: h4 elements with text like "Broos, Hugo (Coach)" or "Ntseki, Molefi (Coach)"
    let manager = 'Unknown Manager';
    
    // Find all h4 elements that contain "(Coach)"
    const coachH4s = $('h4').filter((i, el) => {
      const text = $(el).text();
      return text.includes('(Coach)');
    });
    
    if (coachH4s.length > 0) {
      // Get the first coach h4
      const firstCoachH4 = $(coachH4s[0]);
      
      // Try to extract from the link text first (most reliable)
      const linkText = firstCoachH4.find('a').first().text().trim();
      const coachText = linkText || firstCoachH4.text().trim();
      
      // Match pattern like "Broos, Hugo (Coach)" or "Ntseki, Molefi (Coach)"
      // Format is typically "Surname, Firstname (Coach)"
      const nameMatch = coachText.match(/^([^,]+),\s*([^(]+)/);
      
      if (nameMatch && nameMatch[1] && nameMatch[2]) {
        // Format as "Firstname Surname"
        manager = nameMatch[2].trim() + ' ' + nameMatch[1].trim();
        manager = manager
          .replace(/\(Coach\)/gi, '')
          .replace(/\(\d+[^)]*\)/g, '')
          .trim();
      } else {
        // Fallback: try to extract any name before "(Coach)"
        const simpleMatch = coachText.match(/^([^(]+)/);
        if (simpleMatch && simpleMatch[1]) {
          manager = simpleMatch[1]
            .replace(/\(Coach\)/gi, '')
            .trim()
            .split(',')
            .reverse()
            .map(n => n.trim())
            .join(' ')
            .replace(/\(\d+[^)]*\)/g, '')
            .trim();
        }
      }
    }

    // Fallback: try regex search for manager in HTML
    if (manager === 'Unknown Manager') {
      const managerPatterns = [
        /<h4[^>]*>([^<(,]+),\s*([^<(]+)\s*\(Coach\)/i,
        /(?:Coach|Manager|Head coach)[^:\n]*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /Coach[^<\n]*:?\s*<strong[^>]*>([^<]+)<\/strong>/i,
      ];
      
      for (const pattern of managerPatterns) {
        const match = html.match(pattern);
        if (match) {
          if (match[2]) {
            // Has firstname and surname
            manager = (match[2].trim() + ' ' + match[1].trim()).trim();
          } else if (match[1]) {
            manager = match[1].trim();
          }
          if (manager && manager.length > 2) {
            break;
          }
        }
      }
    }

    console.log(`Parsed ${players.length} players, manager: ${manager}`);

    if (players.length >= 15) {
      // Ensure exactly 23 players with proper position distribution
      const targetDistribution = { GK: 3, DF: 8, MD: 7, AT: 5 };
      const currentCounts = { GK: 0, DF: 0, MD: 0, AT: 0 };
      players.forEach(p => currentCounts[p.position]++);

      // Pad missing positions to reach 23 total
      while (players.length < 23) {
        let position: 'GK' | 'DF' | 'MD' | 'AT' = 'GK';
        if (currentCounts.GK < targetDistribution.GK) {
          position = 'GK';
          currentCounts.GK++;
        } else if (currentCounts.DF < targetDistribution.DF) {
          position = 'DF';
          currentCounts.DF++;
        } else if (currentCounts.MD < targetDistribution.MD) {
          position = 'MD';
          currentCounts.MD++;
        } else if (currentCounts.AT < targetDistribution.AT) {
          position = 'AT';
          currentCounts.AT++;
        } else {
          position = 'GK'; // Fallback
        }
        players.push({ name: '', position });
      }

      return {
        country,
        manager: manager || 'Unknown Manager',
        players: players.slice(0, 23),
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing national-football-teams.com:', error);
    return null;
  }
}

/**
 * Fetch team data from Wikipedia
 */
async function fetchFromWikipedia(country: string): Promise<TeamData | null> {
  const wikiPages = [
    `${country} national football team`,
    `${country} national football squad`,
    `${country} national soccer team`,
  ];
  
  for (const pageName of wikiPages) {
    try {
      const wikiApiUrl = `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(pageName)}`;
      
      const response = await fetch(wikiApiUrl, {
        headers: {
          'User-Agent': 'AfricanNationsLeague/1.0 (educational project)',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(8000), // 8 second timeout
      });

      if (response.ok) {
        const html = await response.text();
        const teamData = parseWikipediaSquad(html, country);
        
        if (teamData && teamData.players.length >= 15) {
          return teamData;
        }
      }
    } catch (wikiError: any) {
      // Continue to next page format
      if (wikiError.name !== 'AbortError') {
        console.log(`Wikipedia fetch failed for ${pageName}:`, wikiError.message);
      }
    }
  }
  
  return null;
}

/**
 * Parse Wikipedia HTML to extract squad information using cheerio
 */
function parseWikipediaSquad(html: string, country: string): TeamData | null {
  try {
    const $ = cheerio.load(html);
    const players: PlayerData[] = [];
    
    // Find squad tables - Wikipedia often uses "Current squad" or year-based sections
    const squadTables = $('table.wikitable, table.sortable').filter((i, table) => {
      const header = $(table).find('tr:first-child').text();
      const caption = $(table).find('caption').text();
      return (header.includes('Name') || header.includes('Player')) && 
             (caption.includes('squad') || caption.includes('Squad') || 
              header.includes('Position') || header.includes('Pos.'));
    });

    if (squadTables.length === 0) {
      return null;
    }

    // Process the first valid squad table
    const squadTable = squadTables.first();
    const headers = squadTable.find('tr:first-child th, tr:first-child td')
      .map((i, el) => $(el).text().trim().toLowerCase()).get();
    
    const nameColIndex = headers.findIndex(h => h.includes('name') || h.includes('player'));
    const posColIndex = headers.findIndex(h => h.includes('position') || h.includes('pos.'));

    const positionCount = { GK: 0, DF: 0, MD: 0, AT: 0 };
    const maxPlayers = { GK: 3, DF: 8, MD: 7, AT: 5 };

    // Extract players from table rows
    squadTable.find('tbody tr, tr').each((i, row) => {
      if (players.length >= 23) return false; // Stop if we have enough players

      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length === 0) return; // Skip header rows

      let playerName = '';
      let position: 'GK' | 'DF' | 'MD' | 'AT' | null = null;

      // Extract name - prioritize links (most reliable)
      if (nameColIndex !== -1 && cells.length > nameColIndex) {
        const nameCell = $(cells[nameColIndex]);
        const nameLink = nameCell.find('a').first();
        
        if (nameLink.length > 0) {
          // Link text is usually just the name
          playerName = nameLink.text().trim();
        } else {
          // No link, extract from cell text but filter out dates/age
          let cellText = nameCell.text().trim();
          
          // Remove date patterns like "(1992-01-21)" or "21 January 1992" or "(age 33)"
          cellText = cellText
            .replace(/\(?\d{4}-\d{2}-\d{2}\)?/g, '') // Remove date patterns
            .replace(/\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/gi, '')
            .replace(/\(age\s+\d+\)/gi, '')
            .replace(/\(\d+\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Try to extract just the name part (usually before any parentheses or dates)
          const nameMatch = cellText.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/);
          if (nameMatch) {
            playerName = nameMatch[1].trim();
          } else if (cellText.length >= 3 && cellText.length < 50 && /^[A-Z]/.test(cellText)) {
            playerName = cellText;
          }
        }
      } else {
        // Fallback: try first cell with a link
        const firstCellLink = $row.find('td a').first();
        if (firstCellLink.length > 0) {
          playerName = firstCellLink.text().trim();
        } else {
          // Try first cell but filter dates
          const firstCellText = $(cells[0]).text().trim();
          const nameMatch = firstCellText.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/);
          if (nameMatch && nameMatch[1].length >= 3 && nameMatch[1].length < 50) {
            playerName = nameMatch[1].trim();
          }
        }
      }
      
      // Skip if name looks like a date or invalid
      if (!playerName || playerName.match(/^\d{4}-\d{2}-\d{2}|age|January|February|March|April|May|June|July|August|September|October|November|December/i)) {
        return; // Skip this row
      }

      // Extract position
      if (posColIndex !== -1 && cells.length > posColIndex) {
        const posText = $(cells[posColIndex]).text().trim();
        if (POSITION_MAP[posText]) {
          position = POSITION_MAP[posText];
        }
      } else {
        // Try to find position in any cell
        cells.each((j, cell) => {
          const cellText = $(cell).text().trim();
          if (POSITION_MAP[cellText]) {
            position = POSITION_MAP[cellText];
            return false; // Break
          }
        });
      }

      // If position still not found, distribute based on current counts
      if (!position) {
        // Position wasn't found in table, assign based on distribution
        if (positionCount.GK < maxPlayers.GK) {
          position = 'GK';
        } else if (positionCount.DF < maxPlayers.DF) {
          position = 'DF';
        } else if (positionCount.MD < maxPlayers.MD) {
          position = 'MD';
        } else if (positionCount.AT < maxPlayers.AT) {
          position = 'AT';
        } else {
          return; // Enough players
        }
      }
      
      // Update position count
      positionCount[position]++;

      // Clean up name - remove dates, parentheses, brackets, etc.
      let cleanName = playerName
        .replace(/\(?\d{4}-\d{2}-\d{2}\)?/g, '') // Remove ISO dates
        .replace(/\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/gi, '')
        .replace(/\(age\s+\d+\)/gi, '')
        .replace(/\(\d+\)/g, '')
        .replace(/\[.*?\]/g, '') // Remove Wikipedia-style citations
        .replace(/\s+/g, ' ')
        .trim();

      // Skip if invalid name, looks like a date, or duplicate
      if (cleanName.length >= 2 && 
          cleanName.length < 50 &&
          !cleanName.match(/^(Name|Position|No\.|Number|Age|Club|Date|Caps|Goals|Manager|Coach)$/i) &&
          !cleanName.match(/^\d{4}-\d{2}-\d{2}|age|January|February|March|April|May|June|July|August|September|October|November|December/i) &&
          /^[A-Z][a-z]/.test(cleanName) && // Must start with capital letter
          !players.some(p => p.name === cleanName)) {
        players.push({ name: cleanName, position });
      }
    });

    // Extract manager name
    let manager = 'Unknown Manager';
    
    // Try to find manager in info box
    const infobox = $('.infobox, .vcard').first();
    const managerRow = infobox.find('tr').filter((i, el) => {
      const rowText = $(el).text().toLowerCase();
      return rowText.includes('manager') || rowText.includes('head coach') || rowText.includes('coach');
    }).first();
    
    if (managerRow.length > 0) {
      // Get the text from the last cell (where manager name usually is)
      const managerText = managerRow.find('td').last().text().trim();
      
      // Also try getting from link if available (more reliable)
      const managerLink = managerRow.find('td a').last().text().trim();
      const finalManagerText = managerLink || managerText;
      
      if (finalManagerText && finalManagerText.length > 2) {
        manager = finalManagerText
          .replace(/\(Coach\)/gi, '')
          .replace(/\(\d+[^)]*\)/g, '')
          .replace(/\[.*?\]/g, '') // Remove Wikipedia citations
          .split('\n')[0]
          .split('[')[0] // Remove citations
          .trim();
        
        // Validate it's not just a label
        if (manager.length < 3 || manager.toLowerCase().includes('manager') || manager.toLowerCase().includes('coach')) {
          manager = 'Unknown Manager';
        }
      }
    }

    // Fallback 1: Search for manager in "Current coaching staff" or similar sections
    if (manager === 'Unknown Manager') {
      const coachingHeadings = $('h2, h3, h4').filter((i, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('coach') || text.includes('manager') || text.includes('staff');
      });
      
      if (coachingHeadings.length > 0) {
        const firstHeading = $(coachingHeadings[0]);
        // Look for name links or text in the following content
        const managerLink = firstHeading.nextAll('ul li a, p a, table a').first();
        if (managerLink.length > 0) {
          const linkText = managerLink.text().trim();
          if (linkText.length > 2 && linkText.length < 50 && /^[A-Z]/.test(linkText)) {
            manager = linkText;
          }
        }
      }
    }

    // Fallback 2: regex search for manager patterns
    if (manager === 'Unknown Manager') {
      const managerPatterns = [
        /(?:Manager|Head coach|Coach)[\s:]*[^:\n]*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
        /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+\(.*?manager.*?\)/i,
        /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+\(.*?coach.*?\)/i,
      ];
      
      for (const pattern of managerPatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].length > 3 && match[1].length < 50) {
          manager = match[1].trim();
          break;
        }
      }
    }

    if (players.length >= 15) {
      // Ensure exactly 23 players with proper position distribution
      const targetDistribution = { GK: 3, DF: 8, MD: 7, AT: 5 };
      const currentCounts = { GK: 0, DF: 0, MD: 0, AT: 0 };
      players.forEach(p => currentCounts[p.position]++);

      // Pad missing positions to reach 23 total
      while (players.length < 23) {
        let position: 'GK' | 'DF' | 'MD' | 'AT' = 'GK';
        if (currentCounts.GK < targetDistribution.GK) {
          position = 'GK';
          currentCounts.GK++;
        } else if (currentCounts.DF < targetDistribution.DF) {
          position = 'DF';
          currentCounts.DF++;
        } else if (currentCounts.MD < targetDistribution.MD) {
          position = 'MD';
          currentCounts.MD++;
        } else if (currentCounts.AT < targetDistribution.AT) {
          position = 'AT';
          currentCounts.AT++;
        } else {
          position = 'GK'; // Fallback
        }
        players.push({ name: '', position });
      }

      return {
        country,
        manager: manager || 'Unknown Manager',
        players: players.slice(0, 23),
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing Wikipedia squad:', error);
    return null;
  }
}

