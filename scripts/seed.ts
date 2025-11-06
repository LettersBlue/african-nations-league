import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { generateRandomTeam, calculateTeamRating } from '../lib/utils/ratings';
import { AFRICAN_COUNTRIES } from '../types';

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY || '{}')),
});

const db = getFirestore(app);

// Sample teams for seeding
const sampleTeams = [
  { country: 'Nigeria', manager: 'José Peseiro' },
  { country: 'Egypt', manager: 'Rui Vitória' },
  { country: 'Senegal', manager: 'Aliou Cissé' },
  { country: 'Morocco', manager: 'Walid Regragui' },
  { country: 'Ivory Coast', manager: 'Jean-Louis Gasset' },
  { country: 'Ghana', manager: 'Chris Hughton' },
  { country: 'Cameroon', manager: 'Rigobert Song' },
];

async function seedData() {
  try {
    console.log('Starting data seeding...');

    // Create admin user
    const adminUser = {
      uid: 'admin-001',
      email: 'admin@african-nations-league.com',
      displayName: 'Tournament Administrator',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('users').doc(adminUser.uid).set(adminUser);
    console.log('✅ Admin user created');

    // Create representative users and teams
    for (let i = 0; i < sampleTeams.length; i++) {
      const teamData = sampleTeams[i];
      const uid = `rep-${i + 1}`;
      const email = `rep${i + 1}@example.com`;

      // Create representative user
      const representativeUser = {
        uid,
        email,
        displayName: `${teamData.country} Representative`,
        role: 'representative',
        country: teamData.country,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection('users').doc(uid).set(representativeUser);
      console.log(`✅ Representative user created for ${teamData.country}`);

      // Generate team players
      const players = generateRandomTeam(
        teamData.country,
        teamData.manager,
        uid,
        email
      ).map((player, index) => ({
        id: `player-${i}-${index}`,
        ...player,
      }));

      // Calculate team rating
      const overallRating = calculateTeamRating(players);

      // Create team
      const team = {
        country: teamData.country,
        managerName: teamData.manager,
        representativeUid: uid,
        representativeEmail: email,
        players,
        overallRating,
        tournamentId: '', // Will be set when tournament starts
        stats: {
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsScored: 0,
          goalsConceded: 0,
          goalDifference: 0,
        },
        createdAt: new Date(),
      };

      const teamRef = await db.collection('teams').add(team);
      console.log(`✅ Team created for ${teamData.country} (ID: ${teamRef.id})`);
    }

    // Create initial tournament
    const tournament = {
      name: 'African Nations League 2026',
      status: 'registration',
      teamIds: [], // Will be populated when tournament starts
      currentRound: null,
      bracket: {
        quarterFinals: [],
        semiFinals: [],
        final: { team1Id: '', team2Id: '', winnerId: '' },
      },
      createdAt: new Date(),
    };

    const tournamentRef = await db.collection('tournaments').add(tournament);
    console.log(`✅ Tournament created (ID: ${tournamentRef.id})`);

    console.log('\n🎉 Data seeding completed successfully!');
    console.log('\nAdmin credentials:');
    console.log('Email: admin@african-nations-league.com');
    console.log('Password: admin123');
    console.log('\nRepresentative credentials:');
    console.log('Email: rep1@example.com (Nigeria)');
    console.log('Email: rep2@example.com (Egypt)');
    console.log('Email: rep3@example.com (Senegal)');
    console.log('Email: rep4@example.com (Morocco)');
    console.log('Email: rep5@example.com (Ivory Coast)');
    console.log('Email: rep6@example.com (Ghana)');
    console.log('Email: rep7@example.com (Cameroon)');
    console.log('Password: password123 (for all representatives)');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seeder
seedData().then(() => {
  console.log('Seeding process completed');
  process.exit(0);
}).catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});

