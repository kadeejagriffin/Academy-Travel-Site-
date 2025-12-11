
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import TournamentHeader from "../components/tournament/TournamentHeader";
import TeamsAttending from "../components/tournament/TeamsAttending";
import RoomList from "../components/tournament/RoomList";
import ActionReminders from "../components/tournament/ActionReminders";
import FinanceSummary from "../components/tournament/FinanceSummary";
import { Skeleton } from "@/components/ui/skeleton";

export default function TournamentCommandPage() {
    const queryClient = useQueryClient();
    const urlParams = new URLSearchParams(window.location.search);
    const tournamentId = urlParams.get('id');

    const [isCompleteButtonVisible, setCompleteButtonVisible] = useState(false);

    const { data: tournament, isLoading: isLoadingTournament } = useQuery({
        queryKey: ['tournament', tournamentId],
        queryFn: () => base44.entities.Tournament.get(tournamentId),
        enabled: !!tournamentId,
    });

    const { data: tournamentTeams, isLoading: isLoadingTournamentTeams } = useQuery({
        queryKey: ['tournamentTeams', tournamentId],
        queryFn: () => base44.entities.TournamentTeam.filter({ tournament_id: tournamentId }),
        enabled: !!tournamentId,
    });

    const { data: coaches, isLoading: isLoadingCoaches } = useQuery({
        queryKey: ['coaches', tournamentId],
        queryFn: () => base44.entities.CoachTravel.filter({ tournament_id: tournamentId }),
        enabled: !!tournamentId,
    });
    
    useEffect(() => {
        if (coaches && coaches.every(c => c.flight_booked && c.hotel_booked)) {
             setCompleteButtonVisible(true);
        } else {
            setCompleteButtonVisible(false);
        }
    }, [coaches]);

    const updateTournamentMutation = useMutation({
        mutationFn: (data) => base44.entities.Tournament.update(tournamentId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
            queryClient.invalidateQueries({ queryKey: ['tournaments'] });
        },
    });

    const handleMarkComplete = () => {
        updateTournamentMutation.mutate({ status: 'Complete' });
    };

    if (isLoadingTournament) {
        return (
            <div>
                <Skeleton className="h-12 w-1/2 mb-4" />
                <Skeleton className="h-32 w-full mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                    <div className="space-y-6">
                         <Skeleton className="h-96 w-full" />
                    </div>
                </div>
            </div>
        );
    }
    
    if (!tournament) {
        return <p>Tournament not found.</p>;
    }

    const isNoHousing = tournament.housing_required === false;

    // Determine back link based on whether this is a league tournament
    const backLink = tournament.league_id 
        ? createPageUrl(`LeagueDetail?id=${tournament.league_id}`)
        : createPageUrl('Tournaments');
    const backText = tournament.league_id ? 'Back to League' : 'Back to Tournaments';

    return (
        <div className="space-y-6">
            <Link to={backLink} className="flex items-center text-sm text-gray-600 hover:text-black">
                <ChevronLeft className="w-4 h-4 mr-1" />
                {backText}
            </Link>

            {isNoHousing && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <p className="text-center text-gray-600 font-medium">
                        ℹ️ This tournament does not require housing or travel arrangements
                    </p>
                </div>
            )}

            <TournamentHeader tournament={tournament} onUpdate={updateTournamentMutation.mutate} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <TeamsAttending tournamentId={tournamentId} tournament={tournament} />
                    {!isNoHousing && (
                        <>
                            <RoomList tournamentId={tournamentId} />
                            <FinanceSummary tournamentId={tournamentId} />
                        </>
                    )}
                    {isNoHousing && (
                        <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                            <p className="text-gray-500">No housing or travel tracking needed for this tournament</p>
                        </div>
                    )}
                </div>
                <div className="space-y-6">
                    <ActionReminders tournamentId={tournamentId} />
                </div>
            </div>

            {!isNoHousing && isCompleteButtonVisible && tournament.status !== 'Complete' && (
                 <div className="mt-8 flex justify-center">
                    <Button
                        size="lg"
                        className="bg-sage-800 hover:bg-sage-800/90"
                        onClick={handleMarkComplete}
                        disabled={updateTournamentMutation.isPending}
                    >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        {updateTournamentMutation.isPending ? 'Marking Complete...' : 'Mark Tournament as Complete'}
                    </Button>
                </div>
            )}
        </div>
    );
}
