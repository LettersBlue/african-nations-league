import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { notifyMatchResult } from '@/lib/email/resend';
import { Match } from '@/types';

/**
 * POST /api/email/notify
 * Send email notifications to team representatives after a match
 */
export async function POST(request: NextRequest) {
  try {
    const { matchId } = await request.json();

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'Match ID is required' },
        { status: 400 }
      );
    }

    // Fetch match from Firestore
    const matchDoc = await adminDb.collection('matches').doc(matchId).get();
    
    if (!matchDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    const matchData = matchDoc.data()!;
    const match: Match = {
      id: matchDoc.id,
      ...matchData,
      createdAt: matchData.createdAt?.toDate ? matchData.createdAt.toDate() : new Date(),
      completedAt: matchData.completedAt?.toDate ? matchData.completedAt.toDate() : undefined,
    } as Match;

    // Check if match is completed
    if (match.status !== 'completed' || !match.result) {
      return NextResponse.json(
        { success: false, error: 'Match is not completed yet' },
        { status: 400 }
      );
    }

    // Check if emails have already been sent
    if (match.emailsSent) {
      return NextResponse.json({
        success: true,
        message: 'Emails have already been sent for this match',
      });
    }

    // Send email notifications
    const notificationResult = await notifyMatchResult(match);

    if (notificationResult.success) {
      // Mark emails as sent
      await adminDb.collection('matches').doc(matchId).update({
        emailsSent: true,
      });
    }

    return NextResponse.json({
      success: notificationResult.success,
      message: notificationResult.success
        ? 'Email notifications sent successfully'
        : 'Some emails failed to send',
      errors: notificationResult.errors || [],
    });
  } catch (error: any) {
    console.error('Error in email notification API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email notifications' },
      { status: 500 }
    );
  }
}

