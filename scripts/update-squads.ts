/**
 * Utility functions to update teams with the most recent squad data
 * Uses the same method as the application: fetchRealTimeTeamData
 * 
 * NOTE: This code is designed to be used within the application context (server actions),
 * not as a standalone script. The Firebase Admin SDK parts are commented out.
 */

import { fetchRealTimeTeamData } from '@/app/actions/team-data';
import { generatePlayerRatings, calculateTeamRating, validateTeamComposition } from '@/lib/utils/ratings';
// import { adminDb } from '@/lib/firebase/admin'; // Commented out - use within application context
// import { Timestamp } from 'firebase-admin/firestore'; // Commented out - use within application context
import { Player, Team } from '@/types';

/**
 * Process squad data fetched from fetchRealTimeTeamData and prepare it for database update
 * This function uses the application's existing methods to get the most recent team squads
 */
export async function processSquadDataForUpdate(
  country: string,
  existingTeamData: Team
): Promise<{
  success: boolean;
  data?: {
    players: Player[];
    starting11Ids: string[];
    overallRating: number;
    managerName: string;
  };
  error?: string;
}> {
  try {
    // Fetch latest squad data using the same method as the app
    const squadResult = await fetchRealTimeTeamData(country);

    if (!squadResult.success || !squadResult.data) {
      return {
        success: false,
        error: squadResult.error || 'Failed to fetch squad data',
      };
    }

    const squadData = squadResult.data;

    // Ensure we have exactly 23 players
    if (squadData.players.length < 23) {
      const targetDistribution = { GK: 3, DF: 8, MD: 7, AT: 5 };
      const currentCounts = { GK: 0, DF: 0, MD: 0, AT: 0 };
      squadData.players.forEach(p => currentCounts[p.position]++);

      while (squadData.players.length < 23) {
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
          position = 'GK';
        }
        squadData.players.push({ name: `Player ${squadData.players.length + 1}`, position });
      }
    }

    // Limit to 23 players
    const playersData = squadData.players.slice(0, 23);

    // Generate players with ratings (preserve existing IDs where possible)
    const existingPlayers = (existingTeamData.players || []) as Player[];
    const players: Player[] = playersData.map((p, idx) => {
      // Try to find existing player by name (case-insensitive)
      const existingPlayer = existingPlayers.find((ep: Player) => 
        ep.name.trim().toLowerCase() === p.name.trim().toLowerCase()
      );

      const playerId = existingPlayer?.id || `player_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        id: playerId,
        name: p.name.trim(),
        naturalPosition: p.position,
        isCaptain: existingPlayer?.isCaptain || (idx === 0 && !existingPlayers.some(ep => ep.isCaptain)),
        ratings: existingPlayer?.ratings || generatePlayerRatings(p.position, country),
        goals: existingPlayer?.goals || 0,
        appearances: existingPlayer?.appearances || 0,
      };
    });

    // Ensure exactly one captain
    const captains = players.filter(p => p.isCaptain);
    if (captains.length === 0) {
      players[0].isCaptain = true;
    } else if (captains.length > 1) {
      // Keep first captain, remove others
      let foundFirst = false;
      players.forEach(p => {
        if (p.isCaptain && !foundFirst) {
          foundFirst = true;
        } else if (p.isCaptain) {
          p.isCaptain = false;
        }
      });
    }

    // Generate starting 11 IDs
    let starting11Ids: string[] = [];

    // If we have starting 11 from the fetched data, try to match by name
    if (squadData.starting11 && squadData.starting11.length > 0) {
      const starting11Names = squadData.starting11.map(name => name.toLowerCase().trim());
      
      // Try to match players by name (handle "Last, First" format)
      starting11Ids = players
        .filter(p => {
          const playerName = p.name.toLowerCase().trim();
          return starting11Names.some(name => {
            // Handle "Last, First" format
            if (name.includes(',')) {
              const [lastName] = name.split(',').map(s => s.trim());
              return playerName.includes(lastName.toLowerCase()) || lastName.toLowerCase().includes(playerName.split(' ')[0]);
            }
            // Direct match or partial match
            return playerName === name || playerName.includes(name) || name.includes(playerName);
          });
        })
        .slice(0, 11)
        .map(p => p.id);

      // If we don't have 11 matches, fill with best players (but ensure only 1 GK total)
      if (starting11Ids.length < 11) {
        const currentStartingPlayers = players.filter(p => starting11Ids.includes(p.id));
        const hasGK = currentStartingPlayers.some(p => p.naturalPosition === 'GK');
        
        const remaining = players
          .filter(p => {
            // Don't include players already in starting 11
            if (starting11Ids.includes(p.id)) return false;
            // If we already have a GK, exclude all GKs
            if (hasGK && p.naturalPosition === 'GK') return false;
            return true;
          })
          .sort((a, b) => {
            // Sort by natural position rating
            const aRating = a.ratings[a.naturalPosition];
            const bRating = b.ratings[b.naturalPosition];
            return bRating - aRating;
          })
          .slice(0, 11 - starting11Ids.length)
          .map(p => p.id);
        
        starting11Ids = [...starting11Ids, ...remaining];
      }
    } else {
      // Default: select best 11 players (ensure exactly 1 GK, not more)
      const sortedPlayers = [...players].sort((a, b) => {
        const aRating = a.ratings[a.naturalPosition];
        const bRating = b.ratings[b.naturalPosition];
        return bRating - aRating;
      });

      // Find the best goalkeeper
      const gk = sortedPlayers.find(p => p.naturalPosition === 'GK');
      if (gk) {
        starting11Ids = [gk.id];
      }

      // Get the best non-GK players (exactly 10)
      const others = sortedPlayers
        .filter(p => p.naturalPosition !== 'GK') // Exclude all goalkeepers
        .slice(0, 10)
        .map(p => p.id);

      starting11Ids = [...starting11Ids, ...others];
    }

    // Final validation: ensure exactly 1 GK in starting 11
    const startingPlayers = players.filter(p => starting11Ids.includes(p.id));
    const gkCount = startingPlayers.filter(p => p.naturalPosition === 'GK').length;
    
    if (gkCount > 1) {
      // Remove extra goalkeepers, keep only the best one
      const gks = startingPlayers.filter(p => p.naturalPosition === 'GK');
      const bestGK = gks.sort((a, b) => b.ratings.GK - a.ratings.GK)[0];
      const extraGKs = gks.filter(gk => gk.id !== bestGK.id);
      
      // Replace extra GKs with best non-GK players not already in starting 11
      const nonGKPlayers = players
        .filter(p => p.naturalPosition !== 'GK' && !starting11Ids.includes(p.id))
        .sort((a, b) => {
          const aRating = a.ratings[a.naturalPosition];
          const bRating = b.ratings[b.naturalPosition];
          return bRating - aRating;
        });
      
      extraGKs.forEach((extraGK, idx) => {
        if (nonGKPlayers[idx]) {
          const index = starting11Ids.indexOf(extraGK.id);
          if (index !== -1) {
            starting11Ids[index] = nonGKPlayers[idx].id;
          }
        }
      });
    } else if (gkCount === 0) {
      // If no GK, add the best one
      const bestGK = players
        .filter(p => p.naturalPosition === 'GK')
        .sort((a, b) => b.ratings.GK - a.ratings.GK)[0];
      
      if (bestGK) {
        // Replace the last player with the goalkeeper
        starting11Ids[starting11Ids.length - 1] = bestGK.id;
      }
    }

    // Validate team composition
    const validation = validateTeamComposition(players, starting11Ids);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    // Calculate overall rating
    const overallRating = calculateTeamRating(players);

    // Update manager name if we got one
    const managerName = squadData.manager && squadData.manager !== 'Unknown Manager' 
      ? squadData.manager 
      : existingTeamData.managerName;

    return {
      success: true,
      data: {
        players,
        starting11Ids,
        overallRating,
        managerName,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to process squad data',
    };
  }
}

// ============================================================================
// STANDALONE SCRIPT CODE - COMMENTED OUT (for use outside application context)
// ============================================================================
/*
async function updateAllTeams() {
  try {
    console.log('🚀 Starting squad update process...\n');

    // Get all teams from Firestore
    const teamsSnapshot = await adminDb.collection('teams').get();
    
    if (teamsSnapshot.empty) {
      console.log('❌ No teams found in database');
      return;
    }

    console.log(`📋 Found ${teamsSnapshot.size} teams to update\n`);

    for (const teamDoc of teamsSnapshot.docs) {
      const teamData = teamDoc.data() as Team;
      const teamId = teamDoc.id;
      const country = teamData.country;

      console.log(`\n🔄 Processing: ${country} (${teamId})`);

      try {
        const result = await processSquadDataForUpdate(country, teamData);
        
        if (!result.success || !result.data) {
          console.log(`  ⚠️  Failed to process squad data: ${result.error}`);
          console.log(`  ⏭️  Skipping ${country} - keeping existing data`);
          continue;
        }

        const { players, starting11Ids, overallRating, managerName } = result.data;

        // Prepare update data
        const updateData: Partial<Team> = {
          players,
          starting11Ids,
          overallRating,
          managerName,
          updatedAt: Timestamp.now(),
        };

        // Update team in Firestore
        await adminDb.collection('teams').doc(teamId).update(updateData);

        console.log(`  ✅ Updated ${country}:`);
        console.log(`     - ${players.length} players`);
        console.log(`     - Manager: ${managerName}`);
        console.log(`     - Overall Rating: ${overallRating.toFixed(2)}`);
        console.log(`     - Starting 11: ${starting11Ids.length} players`);

      } catch (error: any) {
        console.log(`  ❌ Error updating ${country}: ${error.message}`);
        console.log(`  ⏭️  Skipping ${country}`);
        continue;
      }
    }

    console.log('\n✨ Squad update process completed!');
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
updateAllTeams()
  .then(() => {
    console.log('\n✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
*/

