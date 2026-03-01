import React, { useEffect, useRef } from 'react';
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
import { MatchSettings } from '@/components/match/MatchSettings';
import { Player } from '@/types/match';

const MatchApp = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const configLoadedRef = useRef(false);

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
  } = useMatch();

  // Load match config from MatchSetup on first mount
  useEffect(() => {
    if (configLoadedRef.current || !id) return;
    
    const configKey = `match_config_${id}`;
    const savedConfig = localStorage.getItem(configKey);
    
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        
        if (config.homeTeam?.name) setHomeTeamName(config.homeTeam.name);
        if (config.awayTeam?.name) setAwayTeamName(config.awayTeam.name);
        
        // Add home players
        if (config.homeTeam?.players?.length > 0) {
          config.homeTeam.players.forEach((p: Player) => {
            addPlayer(p.name);
          });
          // Apply numbers after adding
          setTimeout(() => {
            config.homeTeam.players.forEach((p: Player) => {
              if (p.number !== null) {
                updatePlayerNumber(p.id, p.number);
              }
            });
          }, 50);
        }
        
        // Add away players
        if (config.awayTeam?.players?.length > 0) {
          config.awayTeam.players.forEach((p: Player) => {
            if (p.number !== null) {
              addOpponentPlayer(p.number);
            }
          });
        }
        
        // Clean up config after loading
        localStorage.removeItem(configKey);
      } catch (e) {
        console.error('Failed to load match config:', e);
      }
    }
    
    configLoadedRef.current = true;
  }, [id]);

  // Timer tick interval (UI refresh only - actual time comes from timestamp delta)
  useEffect(() => {
    if (!state.isRunning || state.isPaused) return;
    
    const interval = setInterval(() => {
      updateElapsedTime();
    }, 250); // Update 4x/sec for smooth display
    
    return () => clearInterval(interval);
  }, [state.isRunning, state.isPaused, updateElapsedTime]);

  // Handle starter confirmation
  const handleConfirmStarters = (homeStarters: string[], awayStarters: string[]) => {
    setStarters(homeStarters, true);
    setStarters(awayStarters, false);
    confirmStarters();
  };

  const handleNewMatch = () => {
    const quickId = "quick-" + Date.now();
    navigate(`/match-setup/${quickId}`, { state: { mode: 'single' } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNavButtons onNewMatch={handleNewMatch} />
      
      <main className="p-3 max-w-6xl mx-auto space-y-4">
        {/* Match Header / Scoreboard */}
        <MatchHeader state={state} />

        {/* Starter Selection Phase */}
        {state.needsStarterSelection && !state.isMatchEnded ? (
          <StarterSelection
            homePlayers={state.homeTeam.players}
            awayPlayers={state.awayTeam.players}
            period={state.currentPeriod}
            onConfirm={handleConfirmStarters}
          />
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

            {/* Team Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </main>
    </div>
  );
};

export default MatchApp;
