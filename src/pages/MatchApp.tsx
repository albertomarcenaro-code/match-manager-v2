import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';
import { Header } from '@/components/layout/Header';
import { MatchHeader } from '@/components/match/MatchHeader';
import { TeamPanel } from '@/components/match/TeamPanel';
import { TimerControls } from '@/components/match/TimerControls';
import { EventTimeline } from '@/components/match/EventTimeline';
import { StarterSelection } from '@/components/match/StarterSelection';
import { ExportButton } from '@/components/match/ExportButton';
import { PDFExportButton } from '@/components/match/PDFExportButton';
import { WhatsAppShareButton } from '@/components/match/WhatsAppShareButton';
import { RosterSetup } from '@/components/setup/RosterSetup';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, UserCheck, Play } from 'lucide-react';

const MatchApp = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    state,
    setHomeTeamName,
    setAwayTeamName,
    addPlayer,
    setStarters,
    confirmStarters,
    startPeriod,
    pauseTimer,
    resumeTimer,
    endPeriod,
    endMatch,
    recordGoal,
    recordOwnGoal,
    recordCard,
    recordSubstitution,
    resetMatch,
    updatePlayerNumber,
    removePlayer,
    addOpponentPlayer,
    removeOpponentPlayer,
    undoLastEvent,
    addPlayerToMatch,
    updateElapsedTime,
    bulkAddPlayers,
    swapTeams,
    createPlayersWithNumbers,
    updateHomePlayerName,
    addAwayPlayerFull,
    updateAwayPlayerName,
    updateAwayPlayerNumber,
    bulkAddAwayPlayers,
  } = useMatch();

  // Tab navigation: 'roster' | 'starters' | 'live'
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Auto-detect appropriate initial tab based on match state
    if (state.isMatchStarted && !state.needsStarterSelection) return 'live';
    if (state.isMatchStarted && state.needsStarterSelection) return 'starters';
    if (state.homeTeam.players.length > 0 || state.awayTeam.players.length > 0) return 'roster';
    return 'roster';
  });

  // Timer tick interval (UI refresh only)
  useEffect(() => {
    if (!state.isRunning || state.isPaused) return;
    const interval = setInterval(() => {
      updateElapsedTime();
    }, 250);
    return () => clearInterval(interval);
  }, [state.isRunning, state.isPaused, updateElapsedTime]);

  // Handle starter confirmation
  const handleConfirmStarters = (homeStarters: string[], awayStarters: string[]) => {
    setStarters(homeStarters, true);
    setStarters(awayStarters, false);
    confirmStarters();
    setActiveTab('live');
  };

  const handleNewMatch = () => {
    const quickId = "quick-" + Date.now();
    navigate(`/match/${quickId}`);
  };

  // When roster is complete, go to starters tab
  const handleRosterComplete = () => {
    setActiveTab('starters');
  };

  // Determine if each tab should be accessible
  const hasPlayers = state.homeTeam.players.some(p => p.number !== null) && state.awayTeam.players.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header showNavButtons onNewMatch={handleNewMatch} />
      
      <main className="p-3 max-w-6xl mx-auto space-y-3">
        {/* Match Header / Scoreboard - always visible when match started */}
        {state.isMatchStarted && <MatchHeader state={state} />}

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="roster" className="gap-1 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" />
              Rose
            </TabsTrigger>
            <TabsTrigger value="starters" className="gap-1 text-xs sm:text-sm" disabled={!hasPlayers}>
              <UserCheck className="h-3.5 w-3.5" />
              Titolari
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-1 text-xs sm:text-sm" disabled={!hasPlayers}>
              <Play className="h-3.5 w-3.5" />
              Live
            </TabsTrigger>
          </TabsList>

          {/* Rose Tab */}
          <TabsContent value="roster" className="mt-3">
            <RosterSetup
              homeTeamName={state.homeTeam.name}
              awayTeamName={state.awayTeam.name}
              homePlayers={state.homeTeam.players}
              awayPlayers={state.awayTeam.players}
              onHomeTeamNameChange={setHomeTeamName}
              onAwayTeamNameChange={setAwayTeamName}
              onAddPlayer={(name) => addPlayer(name)}
              onUpdatePlayerNumber={updatePlayerNumber}
              onUpdateHomePlayerName={updateHomePlayerName}
              onRemovePlayer={removePlayer}
              onAddOpponentPlayer={addOpponentPlayer}
              onRemoveOpponentPlayer={removeOpponentPlayer}
              onComplete={handleRosterComplete}
              onBulkAddPlayers={bulkAddPlayers}
              onSwapTeams={swapTeams}
              onCreatePlayersWithNumbers={createPlayersWithNumbers}
              onAddAwayPlayerFull={addAwayPlayerFull}
              onUpdateAwayPlayerName={updateAwayPlayerName}
              onUpdateAwayPlayerNumber={updateAwayPlayerNumber}
              onBulkAddAwayPlayers={bulkAddAwayPlayers}
            />
          </TabsContent>

          {/* Titolari Tab */}
          <TabsContent value="starters" className="mt-3">
            <StarterSelection
              homePlayers={state.homeTeam.players}
              awayPlayers={state.awayTeam.players}
              period={state.currentPeriod}
              onConfirm={handleConfirmStarters}
            />
          </TabsContent>

          {/* Live Tab */}
          <TabsContent value="live" className="mt-3 space-y-4">
            {!state.isMatchStarted && state.needsStarterSelection ? (
              <div className="text-center p-8 bg-card rounded-xl shadow-card">
                <p className="text-muted-foreground">
                  Seleziona prima i titolari nella tab "Titolari" per iniziare la partita.
                </p>
              </div>
            ) : (
              <>
                {/* Timer Controls */}
                <TimerControls
                  state={state}
                  onStartPeriod={startPeriod}
                  onPause={pauseTimer}
                  onResume={resumeTimer}
                  onEndPeriod={endPeriod}
                  onEndMatch={() => {
                    if (state.isRunning) endPeriod();
                    endMatch();
                  }}
                  onUndo={undoLastEvent}
                />

                {/* Team Panels - always side by side */}
                <div className="grid grid-cols-2 gap-2">
                  <TeamPanel
                    teamName={state.homeTeam.name}
                    players={state.homeTeam.players}
                    isHome={true}
                    isRunning={state.isRunning && !state.isPaused}
                    events={state.events}
                    isMatchEnded={state.isMatchEnded}
                    onGoal={(pid) => recordGoal('home', pid)}
                    onOwnGoal={(pid) => recordOwnGoal('home', pid)}
                    onSubstitution={(outId, inId) => recordSubstitution('home', outId, inId)}
                    onYellowCard={(pid) => recordCard('home', pid, 'yellow')}
                    onRedCard={(pid) => recordCard('home', pid, 'red')}
                    onAddPlayer={(name, num) => addPlayerToMatch('home', name, num)}
                  />
                  <TeamPanel
                    teamName={state.awayTeam.name}
                    players={state.awayTeam.players}
                    isHome={false}
                    isRunning={state.isRunning && !state.isPaused}
                    events={state.events}
                    isMatchEnded={state.isMatchEnded}
                    onGoal={(pid) => recordGoal('away', pid)}
                    onOwnGoal={(pid) => recordOwnGoal('away', pid)}
                    onSubstitution={(outId, inId) => recordSubstitution('away', outId, inId)}
                    onYellowCard={(pid) => recordCard('away', pid, 'yellow')}
                    onRedCard={(pid) => recordCard('away', pid, 'red')}
                    onAddPlayer={(name, num) => addPlayerToMatch('away', name, num)}
                  />
                </div>

                {/* Event Timeline */}
                <EventTimeline
                  events={state.events}
                  homeTeamName={state.homeTeam.name}
                  awayTeamName={state.awayTeam.name}
                />

                {/* Export buttons when match ended */}
                {state.isMatchEnded && (
                  <div className="flex flex-wrap gap-3 justify-center p-4 bg-card rounded-xl shadow-card">
                    <ExportButton state={state} />
                    <PDFExportButton state={state} />
                    <WhatsAppShareButton state={state} />
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MatchApp;
