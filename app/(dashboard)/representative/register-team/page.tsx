"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { getUser } from "@/lib/firebase/firestore";
import { createTeam, getUserTeam, updateTeam } from "@/app/actions/team";
import { fetchRealTimeTeamData } from "@/app/actions/team-data";
import { AFRICAN_COUNTRIES, Position, POSITION_LABELS } from "@/types";
import { generatePlayerRatings } from "@/lib/utils/ratings";

export default function TeamRegistrationPage() {
  const [formData, setFormData] = useState({
    country: "",
    managerName: "",
    players: Array.from({ length: 23 }, (_, i) => ({
      name: "",
      naturalPosition: "GK" as Position,
      isCaptain: i === 0, // First player is captain by default
    })),
  });

  const [useRealData, setUseRealData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState<any>(null);
  const [existingTeam, setExistingTeam] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [realTeamsData, setRealTeamsData] = useState<any>(null);
  const [starting11Indices, setStarting11Indices] = useState<number[]>(Array.from({ length: 11 }, (_, i) => i)); // Default: first 11 players
  const [playerRatings, setPlayerRatings] = useState<Record<number, Record<Position, number>>>({}); // Store ratings by player index
  const [substitutionDropdown, setSubstitutionDropdown] = useState<number | null>(null); // Track which starter has dropdown open
  const [showAllSubs, setShowAllSubs] = useState<Record<number, boolean>>({}); // Track if "show all" is expanded for each starter dropdown
  const [benchDropdown, setBenchDropdown] = useState<number | null>(null); // Track which bench player has dropdown open
  const [benchShowAll, setBenchShowAll] = useState<Record<number, boolean>>({}); // Track if "show all" is expanded for each bench dropdown
  const router = useRouter();

  // Initialize ratings for all players on mount and when players change
  useEffect(() => {
    const newRatings: Record<number, Record<Position, number>> = {};
    formData.players.forEach((player, index) => {
      if (!playerRatings[index]) {
        // Use country for tier-based ratings
        newRatings[index] = generatePlayerRatings(player.naturalPosition, formData.country || undefined);
      }
    });
    if (Object.keys(newRatings).length > 0) {
      setPlayerRatings(prev => ({ ...prev, ...newRatings }));
    }
  }, [formData.players.length, formData.country]); // Regenerate when country changes too

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (substitutionDropdown !== null || benchDropdown !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('.substitution-dropdown')) {
          setSubstitutionDropdown(null);
          setShowAllSubs(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(key => {
              updated[parseInt(key)] = false;
            });
            return updated;
          });
          setBenchDropdown(null);
          setBenchShowAll(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(key => {
              updated[parseInt(key)] = false;
            });
            return updated;
          });
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [substitutionDropdown]);

  // Load real teams data
  useEffect(() => {
    const loadRealTeamsData = async () => {
      try {
        const response = await fetch('/african-teams.json');
        if (response.ok) {
          const data = await response.json();
          setRealTeamsData(data);
        }
      } catch (err) {
        console.error('Failed to load real teams data:', err);
      }
    };
    loadRealTeamsData();
  }, []);

  useEffect(() => {
    // Check auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await getUser(firebaseUser.uid);
        if (!userData || userData.role !== 'representative') {
          router.push('/login');
        } else {
          setUser(userData);
          
          // Check if user already has a team - if so, load it for editing
          const teamResult = await getUserTeam(firebaseUser.uid);
          if (teamResult.success && teamResult.team) {
            setExistingTeam(teamResult.team);
            setIsEditMode(true);
            
            // Load team data into form
            const loadedPlayers = teamResult.team.players.map((player: any) => ({
              name: player.name,
              naturalPosition: player.naturalPosition,
              isCaptain: player.isCaptain || false,
            }));
            
            setFormData({
              country: teamResult.team.country,
              managerName: teamResult.team.managerName,
              players: loadedPlayers,
            });
            
            // Load ratings from existing team
            const loadedRatings: Record<number, Record<Position, number>> = {};
            teamResult.team.players.forEach((player: any, idx: number) => {
              if (player.ratings) {
                loadedRatings[idx] = player.ratings;
              } else {
                // Generate if missing (use country for tier-based ratings)
                loadedRatings[idx] = generatePlayerRatings(player.naturalPosition, teamResult.team.country);
              }
            });
            setPlayerRatings(loadedRatings);
            
            // Load starting 11 indices (map IDs to indices)
            if (teamResult.team.starting11Ids && teamResult.team.starting11Ids.length === 11) {
              let startingIndices = teamResult.team.starting11Ids.map((id: string) => {
                return teamResult.team.players.findIndex((p: any) => p.id === id);
              }).filter((idx: number) => idx >= 0);
              
              // CRITICAL: Ensure exactly 1 GK in starting 11 (fix if corrupted data)
              const gkIndices = startingIndices.filter(idx => loadedPlayers[idx]?.naturalPosition === 'GK');
              if (gkIndices.length === 0) {
                // No GK, find first GK and replace last player
                const firstGKIndex = loadedPlayers.findIndex((p: any) => p.naturalPosition === 'GK');
                if (firstGKIndex >= 0) {
                  startingIndices[startingIndices.length - 1] = firstGKIndex;
                }
              } else if (gkIndices.length > 1) {
                // Multiple GKs, keep only the first one, replace others
                gkIndices.slice(1).forEach(gkIdx => {
                  const indexToRemove = startingIndices.indexOf(gkIdx);
                  if (indexToRemove >= 0) {
                    // Replace with first non-GK player not already in starting 11
                    for (let i = 0; i < loadedPlayers.length; i++) {
                      if (!startingIndices.includes(i) && loadedPlayers[i]?.naturalPosition !== 'GK') {
                        startingIndices[indexToRemove] = i;
                        break;
                      }
                    }
                  }
                });
              }
              
              if (startingIndices.length === 11) {
                setStarting11Indices(startingIndices);
              }
            }
          }
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePlayerChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      players: prev.players.map((player, i) => 
        i === index ? { ...player, [field]: value } : player
      ),
    }));
    
    // If position changed, regenerate ratings for this player (use country for tier-based ratings)
    if (field === 'naturalPosition') {
      const newRatings = generatePlayerRatings(value as Position, formData.country || undefined);
      setPlayerRatings(prev => ({
        ...prev,
        [index]: newRatings,
      }));
    }
  };

  const handleCaptainChange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      players: prev.players.map((player, i) => ({
        ...player,
        isCaptain: i === index,
      })),
    }));
  };

  const toggleStarting11 = (index: number) => {
    setStarting11Indices(prev => {
      const isSelected = prev.includes(index);
      if (isSelected) {
        // Remove from starting 11 (but ensure exactly 1 GK remains)
        const newIndices = prev.filter(i => i !== index);
        const remainingPlayers = formData.players.filter((_, i) => newIndices.includes(i));
        const gkCount = remainingPlayers.filter(p => p.naturalPosition === 'GK').length;
        
        // Can't remove if it would leave less than 1 GK
        if (formData.players[index].naturalPosition === 'GK' && gkCount === 0) {
          return prev; // Don't allow removing the only GK
        }
        return newIndices;
      } else {
        // Add to starting 11 (max 11 players)
        if (prev.length >= 11) {
          return prev; // Already 11 players
        }
        
        // Check if trying to add a 2nd goalkeeper
        const currentStartingPlayers = formData.players.filter((_, i) => prev.includes(i));
        const currentGKCount = currentStartingPlayers.filter(p => p.naturalPosition === 'GK').length;
        
        if (formData.players[index].naturalPosition === 'GK' && currentGKCount >= 1) {
          // Can't add another goalkeeper, starting 11 can only have 1 GK
          return prev;
        }
        
        return [...prev, index];
      }
    });
  };

  // Substitute a player in starting 11
  const substitutePlayer = (outIndex: number, inIndex: number) => {
    const outPlayer = formData.players[outIndex];
    const inPlayer = formData.players[inIndex];
    
    // Check goalkeeper constraint: can only have exactly 1 GK in starting 11
    if (inPlayer.naturalPosition === 'GK') {
      // Check if we already have a GK in starting 11 (and the one being subbed out is not the GK)
      const currentStartingPlayers = formData.players.filter((_, i) => starting11Indices.includes(i));
      const currentGKCount = currentStartingPlayers.filter(p => p.naturalPosition === 'GK').length;
      
      if (outPlayer.naturalPosition !== 'GK' && currentGKCount >= 1) {
        // Trying to add a 2nd GK, don't allow
        setError('Starting lineup can only have 1 goalkeeper. Please substitute the existing goalkeeper instead.');
        setTimeout(() => setError(''), 5000);
        return;
      }
    }
    
    setStarting11Indices(prev => {
      const newIndices = prev.map(idx => idx === outIndex ? inIndex : idx);
      setSubstitutionDropdown(null);
      setShowAllSubs(prev => ({ ...prev, [outIndex]: false }));
      return newIndices;
    });
  };

  // Get available substitute options
  const getSubstituteOptions = (outPlayerIndex: number) => {
    const outPlayer = formData.players[outPlayerIndex];
    const benchPlayers = formData.players
      .map((player, index) => ({ player, index }))
      .filter(({ index }) => !starting11Indices.includes(index));
    
    // Get players with matching position first
    const matchingPosition = benchPlayers.filter(({ player }) => 
      player.naturalPosition === outPlayer.naturalPosition
    );
    
    // Get other players
    const otherPlayers = benchPlayers.filter(({ player }) => 
      player.naturalPosition !== outPlayer.naturalPosition
    );
    
    return {
      matching: matchingPosition,
      others: otherPlayers,
      position: outPlayer.naturalPosition,
    };
  };

  // Start a bench player in place of a starter
  const startPlayer = (benchIndex: number, starterIndex: number) => {
    const benchPlayer = formData.players[benchIndex];
    const starterPlayer = formData.players[starterIndex];
    // GK constraint: replacing GK must be with GK; replacing outfield must NOT introduce a 2nd GK
    const isStarterGK = starterPlayer.naturalPosition === 'GK';
    const isBenchGK = benchPlayer.naturalPosition === 'GK';
    if (isStarterGK && !isBenchGK) {
      setError('You must replace the goalkeeper with another goalkeeper to keep exactly 1 GK.');
      setTimeout(() => setError(''), 5000);
      return;
    }
    if (!isStarterGK && isBenchGK) {
      // Only allowed if the current starter GK is the one being replaced
      setError('Starting lineup can only have 1 goalkeeper. Replace the current goalkeeper to start a GK.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setStarting11Indices(prev => {
      const newIndices = prev.map(idx => idx === starterIndex ? benchIndex : idx);
      setBenchDropdown(null);
      setBenchShowAll(prev => ({ ...prev, [benchIndex]: false }));
      return newIndices;
    });
  };

  // From a bench player, get available starters to replace (prioritize same position)
  const getStarterOptions = (benchPlayerIndex: number) => {
    const benchPlayer = formData.players[benchPlayerIndex];
    const starters = formData.players
      .map((player, index) => ({ player, index }))
      .filter(({ index }) => starting11Indices.includes(index));

    const matchingPosition = starters.filter(({ player }) =>
      player.naturalPosition === benchPlayer.naturalPosition
    );
    const otherPlayers = starters.filter(({ player }) =>
      player.naturalPosition !== benchPlayer.naturalPosition
    );
    return {
      matching: matchingPosition,
      others: otherPlayers,
      position: benchPlayer.naturalPosition,
    };
  };

  // COMMENTED OUT: Generate Random Names function - real-time data loading is working
  // const generateRandomNames = () => {
  //   const names = [
  //     "Ahmed", "Mohamed", "Ibrahim", "Omar", "Hassan", "Ali", "Youssef", "Karim",
  //     "Salah", "Mahmoud", "Tarek", "Nabil", "Khalid", "Rashid", "Fahad", "Waleed",
  //     "Amr", "Hany", "Sherif", "Mostafa", "Ashraf", "Tamer", "Samir", "Khaled"
  //   ];
    
  //   // Create position distribution (3 GK, 8 DF, 7 MD, 5 AT = 23 total)
  //   const positionDistribution: Position[] = [
  //     ...Array(3).fill('GK'),
  //     ...Array(8).fill('DF'),
  //     ...Array(7).fill('MD'),
  //     ...Array(5).fill('AT')
  //   ];
    
  //   // Shuffle the positions randomly
  //   const shuffledPositions = [...positionDistribution].sort(() => Math.random() - 0.5);
    
  //   const newRatings: Record<number, Record<Position, number>> = {};
    
  //   setFormData(prev => {
  //     const updatedPlayers = prev.players.map((player, i) => {
  //       const newPosition = shuffledPositions[i] || 'GK';
  //       // Generate ratings for new position (use country for tier-based ratings)
  //       newRatings[i] = generatePlayerRatings(newPosition, formData.country || undefined);
  //       return {
  //         ...player,
  //         name: `${names[Math.floor(Math.random() * names.length)]} ${Math.floor(Math.random() * 99) + 1}`,
  //         naturalPosition: newPosition,
  //       };
  //     });
      
  //     // Update ratings state
  //     setPlayerRatings(prev => ({ ...prev, ...newRatings }));
      
  //     return {
  //       ...prev,
  //       players: updatedPlayers,
  //     };
  //   });
  // };

  const loadRealTeamData = async () => {
    if (!formData.country) {
      setError('Please select a country first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // First, try real-time API/web scraping
      const realTimeResult = await fetchRealTimeTeamData(formData.country);
      
      if (realTimeResult.success && realTimeResult.data) {
        const positionMap: Record<string, Position> = {
          'GK': 'GK',
          'DF': 'DF',
          'MD': 'MD',
          'AT': 'AT'
        };

        const players = realTimeResult.data.players.slice(0, 23).map((player: any, index: number) => ({
          name: player.name,
          naturalPosition: positionMap[player.position] || 'GK',
          isCaptain: index === 0, // First player is captain
        }));

        // Pad with empty players if needed
        while (players.length < 23) {
          players.push({
            name: '',
            naturalPosition: 'GK' as Position,
            isCaptain: false,
          });
        }

        // Generate ratings for all players (use country for tier-based ratings)
        const newRatings: Record<number, Record<Position, number>> = {};
        players.forEach((player, index) => {
          newRatings[index] = generatePlayerRatings(player.naturalPosition, formData.country || undefined);
        });

        setFormData(prev => ({
          ...prev,
          managerName: realTimeResult.data!.manager || prev.managerName,
          players,
        }));

        // Set ratings
        setPlayerRatings(newRatings);

        // Initialize starting 11 - use match data if available, otherwise default
        let initialIndices: number[] = [];
        
        if (realTimeResult.data?.starting11 && realTimeResult.data.starting11.length > 0) {
          // Use starting 11 from match data
          const startingNames = realTimeResult.data.starting11;
          const matchedIndices: number[] = [];
          
          startingNames.forEach(name => {
            if (matchedIndices.length >= 11) return; // Stop at 11
            
            // Find player index by matching name (flexible matching)
            const index = players.findIndex(p => {
              const playerName = p.name.toLowerCase().trim();
              const matchName = name.toLowerCase().trim();
              
              // Extract last name (first part before comma) for matching
              const playerLastName = playerName.includes(',') 
                ? playerName.split(',')[0].trim()
                : playerName.split(' ').pop() || playerName;
              
              const matchLastName = matchName.includes(',')
                ? matchName.split(',')[0].trim()
                : matchName.split(' ').pop() || matchName;
              
              // Check multiple matching strategies
              return playerName === matchName || 
                     playerLastName === matchLastName ||
                     playerName.includes(matchLastName) ||
                     matchName.includes(playerLastName) ||
                     (playerName.split(',')[0] === matchName.split(',')[0] && 
                      playerName.includes(',') && matchName.includes(','));
            });
            
            if (index >= 0 && !matchedIndices.includes(index)) {
              matchedIndices.push(index);
            }
          });
          
          initialIndices = matchedIndices;
          
          // Fill remaining slots if less than 11 found
          if (initialIndices.length < 11) {
            for (let i = 0; i < players.length && initialIndices.length < 11; i++) {
              if (!initialIndices.includes(i)) {
                initialIndices.push(i);
              }
            }
          }
        } else {
          // Default: first 11 players
          initialIndices = Array.from({ length: Math.min(11, players.length) }, (_, i) => i);
        }
        
        // CRITICAL: Ensure exactly 1 GK in starting 11 (not more, not less)
        const gkIndices = initialIndices.filter(i => players[i].naturalPosition === 'GK');
        if (gkIndices.length === 0) {
          // No GK, find first GK and replace last player
          const firstGKIndex = players.findIndex(p => p.naturalPosition === 'GK');
          if (firstGKIndex >= 0) {
            // Replace last player with GK
            initialIndices[initialIndices.length - 1] = firstGKIndex;
          }
        } else if (gkIndices.length > 1) {
          // Multiple GKs, keep only the first one, replace others
          gkIndices.slice(1).forEach(gkIdx => {
            const indexToRemove = initialIndices.indexOf(gkIdx);
            if (indexToRemove >= 0) {
              // Replace with first non-GK player not already in starting 11
              for (let i = 0; i < players.length; i++) {
                if (!initialIndices.includes(i) && players[i].naturalPosition !== 'GK') {
                  initialIndices[indexToRemove] = i;
                  break;
                }
              }
            }
          });
        }
        
        // Ensure we have exactly 11 players
        if (initialIndices.length > 11) {
          initialIndices = initialIndices.slice(0, 11);
        } else while (initialIndices.length < 11 && initialIndices.length < players.length) {
          for (let i = 0; i < players.length; i++) {
            if (!initialIndices.includes(i)) {
              initialIndices.push(i);
              break;
            }
          }
        }
        
        setStarting11Indices(initialIndices);

        const message = realTimeResult.data?.starting11 
          ? `Loaded real-time team data for ${formData.country} with starting 11 from recent match!`
          : `Loaded real-time team data for ${formData.country} from Wikipedia!`;
        setSuccess(message);
        setLoading(false);
        return;
      }

      // Fallback to static JSON data
      if (realTeamsData) {
        const teamData = realTeamsData.teams.find((team: any) => team.country === formData.country);
        
        if (teamData) {
          const positionMap: Record<string, Position> = {
            'GK': 'GK',
            'DF': 'DF',
            'MD': 'MD',
            'AT': 'AT'
          };

          const players = teamData.players.slice(0, 23).map((player: any, index: number) => ({
            name: player.name,
            naturalPosition: positionMap[player.position] || 'GK',
            isCaptain: index === 0,
          }));

          while (players.length < 23) {
            players.push({
              name: '',
              naturalPosition: 'GK' as Position,
              isCaptain: false,
            });
          }

          // Generate ratings for all players (use country for tier-based ratings)
          const newRatings: Record<number, Record<Position, number>> = {};
          players.forEach((player: { naturalPosition: Position }, index: number) => {
            newRatings[index] = generatePlayerRatings(player.naturalPosition, formData.country || undefined);
          });

          setFormData(prev => ({
            ...prev,
            managerName: teamData.manager || prev.managerName,
            players,
          }));

          // Set ratings
          setPlayerRatings(newRatings);

          // Initialize starting 11 to first 11 players, ensuring at least 1 GK
          const initialIndices = Array.from({ length: Math.min(11, players.length) }, (_, i) => i);
          // Ensure at least 1 GK
          const hasGK = initialIndices.some((i: number) => players[i].naturalPosition === 'GK');
          if (!hasGK) {
            const firstGKIndex = players.findIndex((p: { naturalPosition: Position }) => p.naturalPosition === 'GK');
            if (firstGKIndex >= 0) {
              initialIndices[10] = firstGKIndex;
            }
          }
          setStarting11Indices(initialIndices);

          setSuccess(`Loaded static team data for ${formData.country}!`);
          setLoading(false);
          return;
        }
      }

      // If both fail, show error
      setError(realTimeResult.error || `No team data found for ${formData.country}. Please try another country or use random names.`);
    } catch (err: any) {
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!user) {
      setError("Please log in to register a team");
      setLoading(false);
      return;
    }

    try {
      // Validate required fields
      if (!formData.country || !formData.managerName) {
        setError("Please fill in all required fields");
        setLoading(false);
        return;
      }

      // Validate all players have names
      const playersWithoutNames = formData.players.filter(p => !p.name.trim());
      if (playersWithoutNames.length > 0) {
        setError(`Please provide names for all ${playersWithoutNames.length} player(s)`);
        setLoading(false);
        return;
      }

      // Prepare form data with starting 11 indices
      const formDataWithStarting11 = {
        ...formData,
        starting11Indices,
      };

      // Call appropriate server action based on mode
      let result;
      if (isEditMode && existingTeam) {
        result = await updateTeam(existingTeam.id, formDataWithStarting11, user.uid);
      } else {
        result = await createTeam(
          formDataWithStarting11,
          user.uid,
          user.email
        );
      }

      if (result.success) {
        setSuccess(result.message || (isEditMode ? "Team updated successfully!" : "Team registered successfully!"));
        setTimeout(() => {
          router.push("/representative");
        }, 2000);
      } else {
        setError(result.error || (isEditMode ? "Failed to update team" : "Failed to register team"));
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            {isEditMode ? 'Edit Your Team' : 'Register Your Team'}
          </h1>
          <p className="text-gray-600">
            {isEditMode ? 'Update your squad for the African Nations League' : 'Create your squad for the African Nations League'}
          </p>
        </div>
        
        <div className="card card-padding max-w-4xl mx-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {success}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Team Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <select
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  required
                  disabled={isEditMode}
                  className={`input-select ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">Select your country</option>
                  {AFRICAN_COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="managerName" className="label-field">
                  Manager Name *
                </label>
                <input
                  type="text"
                  id="managerName"
                  value={formData.managerName}
                  onChange={(e) => handleInputChange("managerName", e.target.value)}
                  required
                  className="input-field"
                  placeholder="Enter manager name"
                />
              </div>
            </div>

            {/* Real Data Option */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="useRealData"
                    checked={useRealData}
                    onChange={(e) => setUseRealData(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="useRealData" className="text-sm font-medium text-gray-700">
                    Use real-time team data (fetches latest players from Wikipedia API + falls back to static data)
                  </label>
                </div>
                {useRealData && formData.country && (
                  <button
                    type="button"
                    onClick={loadRealTeamData}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Fetching...' : 'Load Real-Time Team Data'}
                  </button>
                )}
              </div>
              {useRealData && !formData.country && (
                <p className="text-sm text-yellow-600 mt-2">
                  Please select a country first to load real team data.
                </p>
              )}
            </div>

            {/* Player Management */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Squad (23 Players)</h3>
                {/* COMMENTED OUT: Generate Random Names button - real-time data loading is working
                <button
                  type="button"
                  onClick={generateRandomNames}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Generate Random Names
                </button>
                */}
              </div>

              {/* Starting 11 Section */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-green-700 mb-3">
                  Starting 11 ({starting11Indices.length}/11) - {starting11Indices.length < 11 && <span className="text-red-600 text-sm">Select {11 - starting11Indices.length} more player(s)</span>}
                  {(() => {
                    const gkCount = formData.players.filter((_, i) => starting11Indices.includes(i)).filter(p => p.naturalPosition === 'GK').length;
                    return gkCount === 1 ? (
                      <span className="ml-2 text-xs text-green-600">✓ 1 Goalkeeper</span>
                    ) : (
                      <span className="ml-2 text-xs text-red-600">⚠ {gkCount === 0 ? 'No Goalkeeper' : `${gkCount} Goalkeepers (max 1)`}</span>
                    );
                  })()}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {formData.players
                    .map((player, index) => ({ player, index }))
                    .filter(({ index }) => starting11Indices.includes(index))
                    .map(({ player, index }) => (
                      <div key={index} className={`border-2 rounded-lg p-4 ${player.isCaptain ? 'border-yellow-400 bg-yellow-50' : 'border-green-500 bg-green-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Player {index + 1}</span>
                            <span className="text-xs bg-green-600 text-white px-2 py-1 rounded font-semibold">STARTER</span>
                          </div>
                          {player.isCaptain && (
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">Captain</span>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={player.name}
                            onChange={(e) => handlePlayerChange(index, "name", e.target.value)}
                            placeholder="Player name"
                            className="input-field text-sm"
                          />
                          
                          <select
                            value={player.naturalPosition}
                            onChange={(e) => handlePlayerChange(index, "naturalPosition", e.target.value as Position)}
                            className="input-select text-sm"
                          >
                            {Object.entries(POSITION_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          
                          {/* Player Ratings Display */}
                          {playerRatings[index] && (
                            <div className="bg-white rounded p-2 text-xs border border-gray-200">
                              <div className="grid grid-cols-4 gap-1 text-center">
                                <div>
                                  <div className="font-semibold text-blue-600">GK</div>
                                  <div className={player.naturalPosition === 'GK' ? 'text-green-600 font-bold' : 'text-gray-500'}>
                                    {playerRatings[index].GK}
                                  </div>
                                </div>
                                <div>
                                  <div className="font-semibold text-green-600">DF</div>
                                  <div className={player.naturalPosition === 'DF' ? 'text-green-600 font-bold' : 'text-gray-500'}>
                                    {playerRatings[index].DF}
                                  </div>
                                </div>
                                <div>
                                  <div className="font-semibold text-yellow-600">MD</div>
                                  <div className={player.naturalPosition === 'MD' ? 'text-green-600 font-bold' : 'text-gray-500'}>
                                    {playerRatings[index].MD}
                                  </div>
                                </div>
                                <div>
                                  <div className="font-semibold text-red-600">AT</div>
                                  <div className={player.naturalPosition === 'AT' ? 'text-green-600 font-bold' : 'text-gray-500'}>
                                    {playerRatings[index].AT}
                                  </div>
                                </div>
                              </div>
                              <div className="text-center mt-1 pt-1 border-t border-gray-200">
                                <span className="text-gray-500">Overall: </span>
                                <span className="font-bold text-gray-700">
                                  {((playerRatings[index].GK + playerRatings[index].DF + playerRatings[index].MD + playerRatings[index].AT) / 4).toFixed(1)}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleCaptainChange(index)}
                              className={`flex-1 py-1 px-2 rounded text-sm transition-colors ${
                                player.isCaptain 
                                  ? 'bg-yellow-200 text-yellow-800' 
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {player.isCaptain ? 'Captain' : 'Set as Captain'}
                            </button>
                            <div className="relative substitution-dropdown">
                              <button
                                type="button"
                                onClick={() => setSubstitutionDropdown(substitutionDropdown === index ? null : index)}
                                className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                                title="Substitute player"
                              >
                                Bench
                              </button>
                              {substitutionDropdown === index && (
                                <div className="absolute z-10 mt-1 w-64 glass border border-gray-300 rounded-lg right-0 substitution-dropdown">
                                  <div className="p-2 max-h-96 overflow-y-auto">
                                    {(() => {
                                      const options = getSubstituteOptions(index);
                                      const showAll = showAllSubs[index];
                                      return (
                                        <>
                                          {options.matching.length > 0 && (
                                            <div className="mb-2">
                                              <div className="text-xs font-semibold text-green-700 mb-1">
                                                {POSITION_LABELS[options.position]}s (Natural Position)
                                              </div>
                                              {options.matching.map(({ player: subPlayer, index: subIndex }) => (
                                                <button
                                                  key={subIndex}
                                                  type="button"
                                                  onClick={() => substitutePlayer(index, subIndex)}
                                                  className="w-full text-left px-2 py-1.5 hover:bg-blue-50 rounded text-sm mb-1 border border-green-200 bg-green-50"
                                                >
                                                  <div className="font-medium">{subPlayer.name || `Player ${subIndex + 1}`}</div>
                                                  <div className="text-xs text-gray-600">
                                                    Rating: {playerRatings[subIndex] ? ((playerRatings[subIndex][options.position]).toString()) : 'N/A'} 
                                                    <span className="text-green-600 ml-1">✓ Natural</span>
                                                  </div>
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                          {options.others.length > 0 && (
                                            <div>
                                              {!showAll && (
                                                <button
                                                  type="button"
                                                  onClick={() => setShowAllSubs(prev => ({ ...prev, [index]: true }))}
                                                  className="w-full text-center px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded mb-2"
                                                >
                                                  Load More ({options.others.length} other players)
                                                </button>
                                              )}
                                              {showAll && (
                                                <>
                                                  <div className="text-xs font-semibold text-orange-700 mb-1">
                                                    Other Positions (Rating ↓)
                                                  </div>
                                                  {options.others.map(({ player: subPlayer, index: subIndex }) => {
                                                    const subRatings = playerRatings[subIndex];
                                                    const outPositionRating = subRatings ? subRatings[options.position] : 0;
                                                    const isNatural = subPlayer.naturalPosition === options.position;
                                                    return (
                                                      <button
                                                        key={subIndex}
                                                        type="button"
                                                        onClick={() => substitutePlayer(index, subIndex)}
                                                        className="w-full text-left px-2 py-1.5 hover:bg-orange-50 rounded text-sm mb-1 border border-orange-200 bg-orange-50"
                                                      >
                                                        <div className="font-medium">{subPlayer.name || `Player ${subIndex + 1}`}</div>
                                                        <div className="text-xs text-gray-600">
                                                          {POSITION_LABELS[subPlayer.naturalPosition]} → {POSITION_LABELS[options.position]}
                                                        </div>
                                                        <div className="text-xs text-orange-600">
                                                          Rating: {outPositionRating} 
                                                          {!isNatural && <span className="ml-1">⚠ Not Natural</span>}
                                                        </div>
                                                      </button>
                                                    );
                                                  })}
                                                </>
                                              )}
                                            </div>
                                          )}
                                          {options.matching.length === 0 && options.others.length === 0 && (
                                            <div className="text-xs text-gray-500 text-center py-2">
                                              No substitutes available
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSubstitutionDropdown(null);
                                      setShowAllSubs(prev => ({ ...prev, [index]: false }));
                                    }}
                                    className="w-full px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 border-t border-gray-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {/* Empty slots for starting 11 */}
                  {Array.from({ length: Math.max(0, 11 - starting11Indices.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center justify-center">
                      <span className="text-sm text-gray-400">Select a player to add to starting 11</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bench Section */}
              <div>
                <h4 className="text-lg font-semibold text-blue-700 mb-3">
                  Bench ({23 - starting11Indices.length} players)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.players
                    .map((player, index) => ({ player, index }))
                    .filter(({ index }) => !starting11Indices.includes(index))
                    .map(({ player, index }) => (
                      <div key={index} className={`border rounded-lg p-4 ${player.isCaptain ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Player {index + 1}</span>
                          {player.isCaptain && (
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">Captain</span>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={player.name}
                            onChange={(e) => handlePlayerChange(index, "name", e.target.value)}
                            placeholder="Player name"
                            className="input-field text-sm"
                          />
                          
                          <select
                            value={player.naturalPosition}
                            onChange={(e) => handlePlayerChange(index, "naturalPosition", e.target.value as Position)}
                            className="input-select text-sm"
                          >
                            {Object.entries(POSITION_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          
                          {/* Player Ratings Display */}
                          {playerRatings[index] && (
                            <div className="bg-white rounded p-2 text-xs border border-gray-200">
                              <div className="grid grid-cols-4 gap-1 text-center">
                                <div>
                                  <div className="font-semibold text-blue-600">GK</div>
                                  <div className={player.naturalPosition === 'GK' ? 'text-green-600 font-bold' : 'text-gray-500'}>
                                    {playerRatings[index].GK}
                                  </div>
                                </div>
                                <div>
                                  <div className="font-semibold text-green-600">DF</div>
                                  <div className={player.naturalPosition === 'DF' ? 'text-green-600 font-bold' : 'text-gray-500'}>
                                    {playerRatings[index].DF}
                                  </div>
                                </div>
                                <div>
                                  <div className="font-semibold text-yellow-600">MD</div>
                                  <div className={player.naturalPosition === 'MD' ? 'text-green-600 font-bold' : 'text-gray-500'}>
                                    {playerRatings[index].MD}
                                  </div>
                                </div>
                                <div>
                                  <div className="font-semibold text-red-600">AT</div>
                                  <div className={player.naturalPosition === 'AT' ? 'text-green-600 font-bold' : 'text-gray-500'}>
                                    {playerRatings[index].AT}
                                  </div>
                                </div>
                              </div>
                              <div className="text-center mt-1 pt-1 border-t border-gray-200">
                                <span className="text-gray-500">Overall: </span>
                                <span className="font-bold text-gray-700">
                                  {((playerRatings[index].GK + playerRatings[index].DF + playerRatings[index].MD + playerRatings[index].AT) / 4).toFixed(1)}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleCaptainChange(index)}
                              className={`flex-1 py-1 px-2 rounded text-sm transition-colors ${
                                player.isCaptain 
                                  ? 'bg-yellow-200 text-yellow-800' 
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {player.isCaptain ? 'Captain' : 'Set as Captain'}
                            </button>
                            <div className="relative substitution-dropdown">
                              <button
                                type="button"
                                onClick={() => setBenchDropdown(benchDropdown === index ? null : index)}
                                className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                                title="Start this player"
                              >
                                Start
                              </button>
                              {benchDropdown === index && (
                                <div className="absolute z-10 mt-1 w-64 glass border border-gray-300 rounded-lg right-0 substitution-dropdown">
                                  <div className="p-2 max-h-96 overflow-y-auto">
                                    {(() => {
                                      const options = getStarterOptions(index);
                                      const showAll = benchShowAll[index];
                                      return (
                                        <>
                                          {options.matching.length > 0 && (
                                            <div className="mb-2">
                                              <div className="text-xs font-semibold text-green-700 mb-1">
                                                Replace {POSITION_LABELS[options.position]} (Starters)
                                              </div>
                                              {options.matching.map(({ player: starterPlayer, index: starterIndex }) => (
                                                <button
                                                  key={starterIndex}
                                                  type="button"
                                                  onClick={() => startPlayer(index, starterIndex)}
                                                  className="w-full text-left px-2 py-1.5 hover:bg-blue-50 rounded text-sm mb-1 border border-green-200 bg-green-50"
                                                >
                                                  <div className="font-medium">{starterPlayer.name || `Player ${starterIndex + 1}`}</div>
                                                  <div className="text-xs text-gray-600">
                                                    {POSITION_LABELS[starterPlayer.naturalPosition]}
                                                  </div>
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                          {options.others.length > 0 && (
                                            <div>
                                              {!showAll && (
                                                <button
                                                  type="button"
                                                  onClick={() => setBenchShowAll(prev => ({ ...prev, [index]: true }))}
                                                  className="w-full text-center px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded mb-2"
                                                >
                                                  Load More ({options.others.length} other starters)
                                                </button>
                                              )}
                                              {showAll && (
                                                <>
                                                  <div className="text-xs font-semibold text-orange-700 mb-1">
                                                    Other Starters
                                                  </div>
                                                  {options.others.map(({ player: starterPlayer, index: starterIndex }) => (
                                                    <button
                                                      key={starterIndex}
                                                      type="button"
                                                      onClick={() => startPlayer(index, starterIndex)}
                                                      className="w-full text-left px-2 py-1.5 hover:bg-orange-50 rounded text-sm mb-1 border border-orange-200 bg-orange-50"
                                                    >
                                                      <div className="font-medium">{starterPlayer.name || `Player ${starterIndex + 1}`}</div>
                                                      <div className="text-xs text-gray-600">
                                                        {POSITION_LABELS[starterPlayer.naturalPosition]}
                                                      </div>
                                                    </button>
                                                  ))}
                                                </>
                                              )}
                                            </div>
                                          )}
                                          {options.matching.length === 0 && options.others.length === 0 && (
                                            <div className="text-xs text-gray-500 text-center py-2">
                                              No starters available to replace
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBenchDropdown(null);
                                      setBenchShowAll(prev => ({ ...prev, [index]: false }));
                                    }}
                                    className="w-full px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 border-t border-gray-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center space-x-4">
              <button
                type="submit"
                disabled={loading || !user}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (isEditMode ? "Updating..." : "Registering...") : (isEditMode ? "Update Team" : "Register Team")}
              </button>
              <button
                type="button"
                className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-8 text-center">
          <a 
            href="/representative" 
            className="inline-block bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

