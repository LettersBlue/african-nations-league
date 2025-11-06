declare module '@g-loot/react-tournament-brackets' {
  import * as React from 'react';

  export type ParticipantType = {
    id: string | number;
    isWinner?: boolean;
    name?: string;
    status?: 'PLAYED' | 'NO_SHOW' | 'WALK_OVER' | 'NO_PARTY' | string | null;
    resultText?: string | null;
    [key: string]: any;
  };

  export type MatchType = {
    id: number | string;
    href?: string;
    name?: string;
    nextMatchId: number | string | null;
    nextLooserMatchId?: number | string;
    tournamentRoundText?: string;
    startTime: string;
    state: 'PLAYED' | 'NO_SHOW' | 'WALK_OVER' | 'NO_PARTY' | string;
    participants: ParticipantType[];
    [key: string]: any;
  };

  export type OptionsType = {
    width?: number;
    boxHeight?: number;
    canvasPadding?: number;
    spaceBetweenColumns?: number;
    spaceBetweenRows?: number;
    connectorColor?: string;
    connectorColorHighlight?: string;
    roundHeader?: {
      isShown?: boolean;
      height?: number;
      marginBottom?: number;
      fontSize?: number;
      fontColor?: string;
      backgroundColor?: string;
      fontFamily?: string;
      roundTextGenerator?: (currentRoundNumber: number, roundsTotalNumber: number) => string | undefined;
    };
    roundSeparatorWidth?: number;
    lineInfo?: {
      separation?: number;
      homeVisitorSpread?: number;
    };
    horizontalOffset?: number;
    wonBywalkOverText?: string;
    lostByNoShowText?: string;
  };

  export type MatchComponentProps = {
    match: MatchType;
    onMatchClick?: (args: {
      match: MatchType;
      topWon: boolean;
      bottomWon: boolean;
      event: React.MouseEvent<HTMLAnchorElement, MouseEvent>;
    }) => void;
    onPartyClick?: (party: ParticipantType, partyWon: boolean) => void;
    onMouseEnter?: (partyId: string | number) => void;
    onMouseLeave?: () => void;
    topParty: ParticipantType;
    bottomParty: ParticipantType;
    topWon: boolean;
    bottomWon: boolean;
    topText?: string;
    bottomText?: string;
    connectorColor?: string;
    computedStyles?: OptionsType & { rowHeight?: number; columnWidth?: number };
    teamNameFallback?: string;
    resultFallback?: (participant: ParticipantType) => string;
  };

  export type SingleElimLeaderboardProps = {
    matches: MatchType[];
    matchComponent: (props: MatchComponentProps) => JSX.Element;
    options?: { style: OptionsType };
  };

  export const SingleEliminationBracket: React.FC<SingleElimLeaderboardProps>;
}


