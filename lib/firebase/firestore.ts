import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './config';
import { User, Team, Tournament, Match, TournamentHistory } from '@/types';

// Collection references
export const usersCollection = collection(db, 'users');
export const teamsCollection = collection(db, 'teams');
export const tournamentsCollection = collection(db, 'tournaments');
export const matchesCollection = collection(db, 'matches');
export const tournamentHistoryCollection = collection(db, 'tournamentHistory');

// Helper function to convert Firestore timestamps
export const convertTimestamp = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

// User operations
export const createUser = async (userData: Omit<User, 'createdAt' | 'updatedAt'>) => {
  // Remove undefined fields (Firestore doesn't allow undefined values)
  const cleanUserData: any = {
    uid: userData.uid,
    email: userData.email,
    displayName: userData.displayName,
    role: userData.role,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  // Only include country if it's defined (not undefined)
  if (userData.country !== undefined) {
    cleanUserData.country = userData.country;
  }
  
  // Use setDoc with UID as document ID instead of addDoc (auto-generated ID)
  const userRef = doc(usersCollection, userData.uid);
  return await setDoc(userRef, cleanUserData);
};

export const getUser = async (uid: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(usersCollection, uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    return {
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as User;
  }
  return null;
};

export const updateUser = async (uid: string, updates: Partial<User>) => {
  const userRef = doc(usersCollection, uid);
  return await updateDoc(userRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

// Query users by email
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const q = query(usersCollection, where('email', '==', email), limit(1));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      uid: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      invitationSentAt: data.invitationSentAt ? convertTimestamp(data.invitationSentAt) : undefined,
      acceptedAt: data.acceptedAt ? convertTimestamp(data.acceptedAt) : undefined,
    } as User;
  }
  return null;
};

// Query user by invitation token
export const getUserByInvitationToken = async (token: string): Promise<User | null> => {
  const q = query(usersCollection, where('invitationToken', '==', token), limit(1));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      uid: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      invitationSentAt: data.invitationSentAt ? convertTimestamp(data.invitationSentAt) : undefined,
      acceptedAt: data.acceptedAt ? convertTimestamp(data.acceptedAt) : undefined,
    } as User;
  }
  return null;
};

// Team operations
export const createTeam = async (teamData: Omit<Team, 'id' | 'createdAt'>) => {
  const teamWithTimestamp = {
    ...teamData,
    createdAt: Timestamp.now(),
  };
  return await addDoc(teamsCollection, teamWithTimestamp);
};

export const getTeam = async (teamId: string): Promise<Team | null> => {
  const teamDoc = await getDoc(doc(teamsCollection, teamId));
  if (teamDoc.exists()) {
    const data = teamDoc.data();
    return {
      id: teamDoc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
    } as Team;
  }
  return null;
};

export const getTeamsByTournament = async (tournamentId: string): Promise<Team[]> => {
  const q = query(teamsCollection, where('tournamentId', '==', tournamentId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: data.updatedAt ? convertTimestamp(data.updatedAt) : undefined,
    };
  }) as Team[];
};

export const getTeamsByRepresentative = async (representativeUid: string): Promise<Team[]> => {
  const q = query(teamsCollection, where('representativeUid', '==', representativeUid));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as Team[];
};

export const updateTeam = async (teamId: string, updates: Partial<Team>) => {
  const teamRef = doc(teamsCollection, teamId);
  return await updateDoc(teamRef, updates);
};

// Tournament operations
export const createTournament = async (tournamentData: Omit<Tournament, 'id'>) => {
  const tournamentWithTimestamp = {
    ...tournamentData,
    createdAt: Timestamp.now(),
  };
  return await addDoc(tournamentsCollection, tournamentWithTimestamp);
};

export const getCurrentTournament = async (): Promise<Tournament | null> => {
  const q = query(tournamentsCollection, orderBy('createdAt', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || 'Tournament',
      status: data.status || 'registration',
      teamIds: data.teamIds || [],
      currentRound: data.currentRound || null,
      bracket: data.bracket || { quarterFinals: [], semiFinals: [], final: { matchId: '', team1Id: '', team2Id: '' } },
      ...data,
      // Convert dates if they exist
      createdAt: data.createdAt ? convertTimestamp(data.createdAt) : new Date(),
      startedAt: data.startedAt ? convertTimestamp(data.startedAt) : undefined,
      completedAt: data.completedAt ? convertTimestamp(data.completedAt) : undefined,
    } as Tournament;
  }
  return null;
};

export const getTournament = async (tournamentId: string): Promise<Tournament | null> => {
  const tournamentDoc = await getDoc(doc(tournamentsCollection, tournamentId));
  if (tournamentDoc.exists()) {
    return {
      id: tournamentDoc.id,
      ...tournamentDoc.data(),
    } as Tournament;
  }
  return null;
};

export const updateTournament = async (tournamentId: string, updates: Partial<Tournament>) => {
  const tournamentRef = doc(tournamentsCollection, tournamentId);
  return await updateDoc(tournamentRef, updates);
};

// Match operations
export const createMatch = async (matchData: Omit<Match, 'id' | 'createdAt'>) => {
  const matchWithTimestamp = {
    ...matchData,
    createdAt: Timestamp.now(),
  };
  return await addDoc(matchesCollection, matchWithTimestamp);
};

export const getMatch = async (matchId: string): Promise<Match | null> => {
  const matchDoc = await getDoc(doc(matchesCollection, matchId));
  if (matchDoc.exists()) {
    const data = matchDoc.data();
    return {
      id: matchDoc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      completedAt: data.completedAt ? convertTimestamp(data.completedAt) : undefined,
    } as Match;
  }
  return null;
};

export const getMatchesByTournament = async (tournamentId: string): Promise<Match[]> => {
  const q = query(matchesCollection, where('tournamentId', '==', tournamentId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      completedAt: data.completedAt ? convertTimestamp(data.completedAt) : undefined,
    };
  }) as Match[];
};

export const updateMatch = async (matchId: string, updates: Partial<Match>) => {
  const matchRef = doc(matchesCollection, matchId);
  return await updateDoc(matchRef, updates);
};

// Tournament History operations
export const createTournamentHistory = async (historyData: Omit<TournamentHistory, 'id'>) => {
  return await addDoc(tournamentHistoryCollection, historyData);
};

export const getTournamentHistory = async (): Promise<TournamentHistory[]> => {
  const q = query(tournamentHistoryCollection, orderBy('archivedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      completedAt: convertTimestamp(data.completedAt),
      archivedAt: convertTimestamp(data.archivedAt),
    };
  }) as TournamentHistory[];
};

// Real-time listeners
export const subscribeToTournament = (tournamentId: string, callback: (tournament: Tournament | null) => void) => {
  return onSnapshot(doc(tournamentsCollection, tournamentId), (doc) => {
    if (doc.exists()) {
      callback({
        id: doc.id,
        ...doc.data(),
      } as Tournament);
    } else {
      callback(null);
    }
  });
};

export const subscribeToMatches = (tournamentId: string, callback: (matches: Match[]) => void) => {
  const q = query(matchesCollection, where('tournamentId', '==', tournamentId));
  return onSnapshot(q, (querySnapshot) => {
    const matches = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        completedAt: data.completedAt ? convertTimestamp(data.completedAt) : undefined,
      };
    }) as Match[];
    callback(matches);
  });
};

