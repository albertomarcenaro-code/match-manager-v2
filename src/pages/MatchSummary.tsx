import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, Loader2, Trophy, Clock, User, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PlayerSummary {
  name: string;
  number: number | null;
  goals: number;
  ownGoals: number;
  yellowCards: number;
  redCards: number;
  minutes: number;
  isHome: boolean;
}

interface MatchSummaryData {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  events: any[];
  periodScores: any[];
  homePlayers: any[];
  awayPlayers: any[];
  matchDate: string;
}

export default function MatchSummary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const source = searchParams.get("source") || "local"; // "db" or "local"
  const backTo = searchParams.get("backTo") || "/dashboard";

  const [data, setData] = useState<MatchSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    if (source === "db") {
      loadFromDb();
    } else {
      loadFromLocal();
    }
  }, [id, source]);

  const loadFromDb = async () => {
    setLoading(true);
    try {
      const { data: m, error } = await supabase
        .from("matches")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      const md = (m.match_data as any) || {};
      setData({
        homeTeamName: m.home_team_name,
        awayTeamName: m.away_team_name,
        homeScore: m.home_score,
        awayScore: m.away_score,
        events: md.events || [],
        periodScores: md.periodScores || [],
        homePlayers: md.homeTeam?.players || md.homePlayers || [],
        awayPlayers: md.awayTeam?.players || md.awayPlayers || [],
        matchDate: m.match_date,
      });
    } catch (err: any) {
      console.error("Load match error:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocal = () => {
    setLoading(true);
    try {
      const raw = localStorage.getItem(`match_state_${id}`);
      if (!raw) { setData(null); setLoading(false); return; }
      const s = JSON.parse(raw);
      setData({
        homeTeamName: s.homeTeam?.name || "Casa",
        awayTeamName: s.awayTeam?.name || "Ospiti",
        homeScore: s.homeTeam?.score || 0,
        awayScore: s.awayTeam?.score || 0,
        events: s.events || [],
        periodScores: s.periodScores || [],
        homePlayers: s.homeTeam?.players || [],
        awayPlayers: s.awayTeam?.players || [],
        matchDate: "",
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const buildPlayerSummaries = (): PlayerSummary[] => {
    if (!data) return [];
    const map: Record<string, PlayerSummary> = {};

    const processPlayers = (players: any[], isHome: boolean) => {
      for (const p of players) {
        const key = `${isHome ? "h" : "a"}_${p.name}`;
        const totalSec = p.totalSecondsPlayed || 0;
        map[key] = {
          name: p.name,
          number: p.number ?? null,
          goals: p.goals || 0,
          ownGoals: 0,
          yellowCards: p.cards?.yellow || 0,
          redCards: p.cards?.red || 0,
          minutes: Math.round(totalSec / 60),
          isHome,
        };
      }
    };

    processPlayers(data.homePlayers, true);
    processPlayers(data.awayPlayers, false);

    // Supplement from events for own goals
    for (const ev of data.events) {
      if (ev.type === "own_goal") {
        const key = `${ev.team === "home" ? "h" : "a"}_${ev.playerName}`;
        if (map[key]) map[key].ownGoals += 1;
      }
    }

    return Object.values(map).filter(p => p.minutes > 0 || p.goals > 0 || p.yellowCards > 0 || p.redCards > 0);
  };

  const getScorers = (team: "home" | "away"): { name: string; count: number }[] => {
    if (!data) return [];
    const scorerMap: Record<string, number> = {};
    for (const ev of data.events) {
      if (ev.type === "goal" && ev.team === team) {
        const name = ev.playerName || "?";
        scorerMap[name] = (scorerMap[name] || 0) + 1;
      }
      if (ev.type === "own_goal" && ev.team !== team) {
        const name = `${ev.playerName || "?"} (AG)`;
        scorerMap[name] = (scorerMap[name] || 0) + 1;
      }
    }
    return Object.entries(scorerMap).map(([name, count]) => ({ name, count }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 p-4 max-w-2xl mx-auto w-full pt-6 text-center">
          <p className="text-muted-foreground">Partita non trovata.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(backTo)}>
            Indietro
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const homeScorers = getScorers("home");
  const awayScorers = getScorers("away");
  const playerSummaries = buildPlayerSummaries();
  const homePlayerSummaries = playerSummaries.filter(p => p.isHome).sort((a, b) => b.minutes - a.minutes);
  const awayPlayerSummaries = playerSummaries.filter(p => !p.isHome).sort((a, b) => b.minutes - a.minutes);

  // Build chronicle from events
  const chronicleEvents = data.events.filter(
    (ev: any) => ev.description && ev.description.trim() !== ""
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pt-6 space-y-5">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate(backTo)}>
          <ChevronLeft className="h-4 w-4" /> Indietro
        </Button>

        {/* Score Card */}
        <Card className="p-6 text-center space-y-2">
          {data.matchDate && (
            <p className="text-xs text-muted-foreground">
              {new Date(data.matchDate).toLocaleDateString("it-IT", {
                day: "2-digit", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          )}
          <div className="flex items-center justify-center gap-4">
            <div className="flex-1 text-right">
              <p className="text-lg font-bold truncate">{data.homeTeamName}</p>
            </div>
            <div className="text-3xl font-black text-primary tabular-nums">
              {data.homeScore} - {data.awayScore}
            </div>
            <div className="flex-1 text-left">
              <p className="text-lg font-bold truncate">{data.awayTeamName}</p>
            </div>
          </div>

          {/* Period scores */}
          {data.periodScores.length > 0 && (
            <div className="flex justify-center gap-3 text-xs text-muted-foreground">
              {data.periodScores.map((ps: any, i: number) => (
                <span key={i} className="bg-muted px-2 py-0.5 rounded">
                  {ps.period || i + 1}° T: {ps.homeScore ?? 0}-{ps.awayScore ?? 0}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Scorers */}
        {(homeScorers.length > 0 || awayScorers.length > 0) && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-primary" /> Marcatori
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                {homeScorers.length > 0 ? homeScorers.map((s, i) => (
                  <p key={i} className="text-sm">
                    ⚽ {s.name} {s.count > 1 ? `(${s.count})` : ""}
                  </p>
                )) : <p className="text-xs text-muted-foreground">—</p>}
              </div>
              <div className="space-y-1 text-right">
                {awayScorers.length > 0 ? awayScorers.map((s, i) => (
                  <p key={i} className="text-sm">
                    {s.name} {s.count > 1 ? `(${s.count})` : ""} ⚽
                  </p>
                )) : <p className="text-xs text-muted-foreground">—</p>}
              </div>
            </div>
          </Card>
        )}

        {/* Player minutes - Home */}
        {homePlayerSummaries.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" /> Minutaggio — {data.homeTeamName}
            </h3>
            <div className="space-y-1.5">
              {homePlayerSummaries.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-7 text-xs text-muted-foreground text-center font-mono">
                    {p.number ? `#${p.number}` : ""}
                  </span>
                  <span className="flex-1 truncate font-medium">{p.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0 text-xs">
                    {p.goals > 0 && <span>⚽{p.goals}</span>}
                    {p.yellowCards > 0 && <span>🟨{p.yellowCards}</span>}
                    {p.redCards > 0 && <span>🟥{p.redCards}</span>}
                    <span className="font-mono text-muted-foreground w-10 text-right">{p.minutes}'</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Player minutes - Away */}
        {awayPlayerSummaries.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" /> Minutaggio — {data.awayTeamName}
            </h3>
            <div className="space-y-1.5">
              {awayPlayerSummaries.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-7 text-xs text-muted-foreground text-center font-mono">
                    {p.number ? `#${p.number}` : ""}
                  </span>
                  <span className="flex-1 truncate font-medium">{p.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0 text-xs">
                    {p.goals > 0 && <span>⚽{p.goals}</span>}
                    {p.yellowCards > 0 && <span>🟨{p.yellowCards}</span>}
                    {p.redCards > 0 && <span>🟥{p.redCards}</span>}
                    <span className="font-mono text-muted-foreground w-10 text-right">{p.minutes}'</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Match Chronicle */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-primary" /> Cronaca Partita
          </h3>
          {chronicleEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nessun evento registrato.</p>
          ) : (
            <div className="space-y-1">
              {chronicleEvents.map((ev: any, i: number) => (
                <div key={ev.id || i} className="text-xs py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground font-mono mr-2">
                    {ev.period ? `${ev.period}°T` : ""} {formatTime(ev.timestamp || 0)}
                  </span>
                  <span>{ev.description}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}
