
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Plus, Calendar, Trophy, Edit, Trash2, GripVertical } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function LeagueDetail() {
    const queryClient = useQueryClient();
    const urlParams = new URLSearchParams(window.location.search);
    const leagueId = urlParams.get('id');

    const [isAddTournamentModalOpen, setAddTournamentModalOpen] = useState(false);
    const [isEditLeagueModalOpen, setEditLeagueModalOpen] = useState(false);
    const [isEditTournamentModalOpen, setEditTournamentModalOpen] = useState(false);
    const [isManageRoundsModalOpen, setManageRoundsModalOpen] = useState(false);
    const [editingTournament, setEditingTournament] = useState(null);
    const [tournamentForm, setTournamentForm] = useState({
        round_name: '',
        dates_by_division: {},
        date_tentative: false // Added new state for tentative date in creation
    });
    const [editLeagueForm, setEditLeagueForm] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        age_divisions: '',
        contact_info: '',
        rounds: []
    });
    const [editTournamentForm, setEditTournamentForm] = useState({
        name: '',
        round_name: '',
        location: '',
        start_date: '',
        end_date: '',
        date_tentative: false
    });
    const [roundsForm, setRoundsForm] = useState([]);
    const [newRoundName, setNewRoundName] = useState('');

    const { data: league, isLoading: isLoadingLeague } = useQuery({
        queryKey: ['league', leagueId],
        queryFn: () => base44.entities.League.get(leagueId),
        enabled: !!leagueId,
    });

    const { data: tournaments, isLoading: isLoadingTournaments } = useQuery({
        queryKey: ['leagueTournaments', leagueId],
        queryFn: () => base44.entities.Tournament.filter({ league_id: leagueId }),
        enabled: !!leagueId,
    });

    const createTournamentsMutation = useMutation({
        mutationFn: async ({ roundName, datesByDivision, dateTentative }) => { // Added dateTentative parameter
            const tournamentsToCreate = Object.entries(datesByDivision).map(([division, data]) => {
                return base44.entities.Tournament.create({
                    name: `${roundName} - ${division}`,
                    league_id: leagueId,
                    round_name: roundName,
                    age_division_focus: division,
                    start_date: data.start_date,
                    end_date: data.end_date || data.start_date,
                    location: data.location || '',
                    status: 'Not Started',
                    date_tentative: dateTentative // Passed dateTentative to creation
                });
            });
            return Promise.all(tournamentsToCreate);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagueTournaments', leagueId] });
            setAddTournamentModalOpen(false);
            setTournamentForm({ round_name: '', dates_by_division: {}, date_tentative: false }); // Reset date_tentative
        }
    });

    const updateLeagueMutation = useMutation({
        mutationFn: (data) => {
            const leagueData = {
                ...data,
                age_divisions: data.age_divisions.split(',').map(d => d.trim()).filter(d => d),
                rounds: data.rounds || []
            };
            return base44.entities.League.update(leagueId, leagueData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
            queryClient.invalidateQueries({ queryKey: ['leagues'] });
            setEditLeagueModalOpen(false);
            setManageRoundsModalOpen(false);
        }
    });

    const updateTournamentMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Tournament.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagueTournaments', leagueId] });
            queryClient.invalidateQueries({ queryKey: ['tournaments'] });
            setEditTournamentModalOpen(false);
            setEditingTournament(null);
        }
    });

    const deleteTournamentMutation = useMutation({
        mutationFn: async (tournamentId) => {
            const [tournamentTeams, rooms, reminders, transactions, coaches] = await Promise.all([
                base44.entities.TournamentTeam.filter({ tournament_id: tournamentId }),
                base44.entities.Room.filter({ tournament_id: tournamentId }),
                base44.entities.ActionReminder.filter({ tournament_id: tournamentId }),
                base44.entities.FinanceTransaction.filter({ tournament_id: tournamentId }),
                base44.entities.CoachTravel.filter({ tournament_id: tournamentId })
            ]);

            await Promise.all([
                ...tournamentTeams.map(tt => base44.entities.TournamentTeam.delete(tt.id)),
                ...rooms.map(r => base44.entities.Room.delete(r.id)),
                ...reminders.map(r => base44.entities.ActionReminder.delete(r.id)),
                ...transactions.map(t => base44.entities.FinanceTransaction.delete(t.id)),
                ...coaches.map(c => base44.entities.CoachTravel.delete(c.id))
            ]);

            return base44.entities.Tournament.delete(tournamentId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagueTournaments', leagueId] });
            queryClient.invalidateQueries({ queryKey: ['tournaments'] });
        }
    });

    const updateTournamentRoundMutation = useMutation({
        mutationFn: ({ tournamentId, newRound }) =>
            base44.entities.Tournament.update(tournamentId, { round_name: newRound }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagueTournaments', leagueId] });
            queryClient.invalidateQueries({ queryKey: ['tournaments'] });
        }
    });

    const handleOpenAddTournamentModal = () => {
        const initialDates = {};
        league?.age_divisions?.forEach(div => {
            initialDates[div] = { start_date: '', end_date: '', location: '', days: '1' };
        });
        setTournamentForm({ round_name: '', dates_by_division: initialDates, date_tentative: false }); // Initialize date_tentative
        setAddTournamentModalOpen(true);
    };

    const handleOpenEditLeagueModal = () => {
        const formatForInput = (dateString) => {
            if (!dateString) return '';
            return dateString.split('T')[0];
        };

        setEditLeagueForm({
            name: league.name,
            description: league.description || '',
            start_date: formatForInput(league.start_date),
            end_date: formatForInput(league.end_date),
            age_divisions: league.age_divisions?.join(', ') || '',
            contact_info: league.contact_info || '',
            rounds: league.rounds || ['League Qualifier', 'League 1', 'League 2', 'League 3', 'Regionals']
        });
        setEditLeagueModalOpen(true);
    };

    const handleOpenManageRoundsModal = () => {
        setRoundsForm(league.rounds || ['League Qualifier', 'League 1', 'League 2', 'League 3', 'Regionals']);
        setManageRoundsModalOpen(true);
    };

    const handleAddRound = () => {
        if (newRoundName.trim() && !roundsForm.includes(newRoundName.trim())) {
            setRoundsForm([...roundsForm, newRoundName.trim()]);
            setNewRoundName('');
        }
    };

    const handleRemoveRound = (index) => {
        setRoundsForm(roundsForm.filter((_, i) => i !== index));
    };

    const handleSaveRounds = () => {
        if (!league) return;
        updateLeagueMutation.mutate({
            ...league,
            rounds: roundsForm,
            age_divisions: league.age_divisions?.join(', ') || '',
            start_date: league.start_date,
            end_date: league.end_date,
            description: league.description,
            contact_info: league.contact_info
        });
    };

    const handleCreateTournaments = () => {
        const validDates = Object.fromEntries(
            Object.entries(tournamentForm.dates_by_division).filter(([_, data]) => data.start_date)
        );

        if (tournamentForm.round_name && Object.keys(validDates).length > 0) {
            createTournamentsMutation.mutate({
                roundName: tournamentForm.round_name,
                datesByDivision: validDates,
                dateTentative: tournamentForm.date_tentative // Pass date_tentative from form state
            });
        }
    };

    const handleUpdateLeague = () => {
        if (editLeagueForm.name && editLeagueForm.age_divisions) {
            updateLeagueMutation.mutate(editLeagueForm);
        }
    };

    const updateDivisionDate = (division, field, value) => {
        setTournamentForm(prev => ({
            ...prev,
            dates_by_division: {
                ...prev.dates_by_division,
                [division]: {
                    ...prev.dates_by_division[division],
                    [field]: value
                }
            }
        }));
    };

    const handleOpenEditTournamentModal = (tournament) => {
        const formatForInput = (dateString) => {
            if (!dateString) return '';
            return dateString.split('T')[0];
        };

        setEditingTournament(tournament);
        setEditTournamentForm({
            name: tournament.name,
            round_name: tournament.round_name || '',
            location: tournament.location || '',
            start_date: formatForInput(tournament.start_date),
            end_date: formatForInput(tournament.end_date),
            date_tentative: tournament.date_tentative || false
        });
        setEditTournamentModalOpen(true);
    };

    const handleUpdateTournament = () => {
        if (editTournamentForm.name && editingTournament) {
            updateTournamentMutation.mutate({
                id: editingTournament.id,
                data: editTournamentForm
            });
        }
    };

    const handleDeleteTournament = (tournament) => {
        if (confirm(`Are you sure you want to delete "${tournament.name}"? This will also delete all associated teams, coaches, rooms, reminders, and transactions.`)) {
            deleteTournamentMutation.mutate(tournament.id);
        }
    };

    const handleDragEnd = (result) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;

        // If moved within the same round, or to the same round, do nothing for now
        // This implementation only handles moving between different rounds
        if (source.droppableId === destination.droppableId) return;

        let newRoundValue;
        if (destination.droppableId === 'Unassigned') {
            newRoundValue = ''; // Set to empty string for 'Unassigned' in the database
        } else {
            newRoundValue = destination.droppableId;
        }

        updateTournamentRoundMutation.mutate({
            tournamentId: draggableId,
            newRound: newRoundValue
        });
    };

    if (isLoadingLeague || isLoadingTournaments) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (!league) {
        return <p>League not found.</p>;
    }

    const sortedTournaments = [...(tournaments || [])].sort((a, b) => {
        const dateA = new Date(a.start_date || '9999-12-31');
        const dateB = new Date(b.start_date || '9999-12-31');
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
        }
        return a.name.localeCompare(b.name);
    });

    const defaultRounds = ['League Qualifier', 'League 1', 'League 2', 'League 3', 'Regionals'];
    const leagueRounds = league?.rounds && league.rounds.length > 0 ? league.rounds : defaultRounds;

    const tournamentsByRound = leagueRounds.map(roundName => ({
        roundName,
        tournaments: sortedTournaments.filter(t => t.round_name === roundName)
    }));

    const tournamentsWithoutRound = sortedTournaments.filter(t => !t.round_name || !leagueRounds.includes(t.round_name));
    if (tournamentsWithoutRound.length > 0) {
        tournamentsByRound.push({
            roundName: 'Unassigned',
            tournaments: tournamentsWithoutRound
        });
    }

    return (
        <div className="space-y-6">
            <Link to={createPageUrl('Leagues')} className="flex items-center text-sm text-gray-600 hover:text-black">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Leagues
            </Link>

            <Card className="bg-blush-50 border-blush-100">
                <CardHeader className="flex flex-row justify-between items-start">
                    <div className="flex-1">
                        <CardTitle className="text-2xl font-bold text-blush-800">{league.name}</CardTitle>
                        {league.description && (
                            <p className="text-gray-600 mt-2">{league.description}</p>
                        )}
                    </div>
                    <Button variant="outline" size="icon" onClick={handleOpenEditLeagueModal}>
                        <Edit className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="w-4 h-4 text-blush-800" />
                        <span>
                            {league.start_date ? format(parseISO(league.start_date), 'MMM d, yyyy') : 'TBA'} - {league.end_date ? format(parseISO(league.end_date), 'MMM d, yyyy') : 'TBA'}
                        </span>
                    </div>
                    {league.age_divisions && league.age_divisions.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-medium text-gray-500 mb-2">Age Divisions:</p>
                            <div className="flex flex-wrap gap-1">
                                {league.age_divisions.map((div, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                        {div}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5" />
                        Tournament Schedule ({sortedTournaments.length})
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button onClick={handleOpenManageRoundsModal} variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-2" /> Manage Rounds
                        </Button>
                        <Button onClick={handleOpenAddTournamentModal} className="bg-blush-800 hover:bg-blush-800/90 text-black">
                            <Plus className="w-4 h-4 mr-2" /> Add Tournament Dates
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {sortedTournaments.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No tournaments scheduled yet. Add tournament dates by age division.</p>
                    ) : (
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Accordion type="multiple" defaultValue={[]} className="space-y-3">
                                {tournamentsByRound.map(({ roundName, tournaments }) => (
                                    <AccordionItem key={roundName} value={roundName} className="border rounded-lg">
                                        <AccordionTrigger className="px-4 hover:no-underline">
                                            <div className="flex items-center justify-between w-full pr-4">
                                                <span className="font-semibold text-lg">{roundName}</span>
                                                <Badge variant="outline">{tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-4">
                                            <Droppable droppableId={roundName}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className={`space-y-2 min-h-[60px] p-2 rounded transition-colors ${
                                                            snapshot.isDraggingOver ? 'bg-blush-50' : ''
                                                        }`}
                                                    >
                                                        {tournaments.length === 0 && !snapshot.isDraggingOver ? (
                                                            <p className="text-gray-500 text-center py-4 text-sm">
                                                                No tournaments scheduled for this round yet.
                                                            </p>
                                                        ) : (
                                                            tournaments.map((tournament, index) => (
                                                                <Draggable
                                                                    key={tournament.id}
                                                                    draggableId={tournament.id}
                                                                    index={index}
                                                                >
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            className={`flex items-center justify-between p-3 bg-white rounded-lg border transition-shadow ${
                                                                                snapshot.isDragging ? 'shadow-lg' : ''
                                                                            }`}
                                                                        >
                                                                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 -ml-1">
                                                                                <GripVertical className="w-5 h-5 text-gray-400" />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <p className="font-medium">{tournament.name}</p>
                                                                                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Calendar className="w-3 h-3" />
                                                                                        {tournament.start_date ? (
                                                                                            <>
                                                                                                {tournament.date_tentative && tournament.end_date && tournament.start_date !== tournament.end_date ? (
                                                                                                    <span className="flex items-center gap-1">
                                                                                                        {format(parseISO(tournament.start_date), 'MMM d')} or {format(parseISO(tournament.end_date), 'd, yyyy')}
                                                                                                        <Badge variant="outline" className="ml-1 text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                                                                                                            Tentative
                                                                                                        </Badge>
                                                                                                    </span>
                                                                                                ) : tournament.end_date && tournament.start_date !== tournament.end_date ? (
                                                                                                    <span>
                                                                                                        {format(parseISO(tournament.start_date), 'MMM d, yyyy')} - {format(parseISO(tournament.end_date), 'MMM d, yyyy')}
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    format(parseISO(tournament.start_date), 'MMM d, yyyy')
                                                                                                )}
                                                                                            </>
                                                                                        ) : 'TBA'}
                                                                                    </span>
                                                                                    {tournament.location && (
                                                                                        <span>📍 {tournament.location}</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => handleOpenEditTournamentModal(tournament)}
                                                                                >
                                                                                    <Edit className="w-4 h-4" />
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => handleDeleteTournament(tournament)}
                                                                                    disabled={deleteTournamentMutation.isPending}
                                                                                >
                                                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                                                </Button>
                                                                                <Button asChild variant="outline" size="sm">
                                                                                    <Link to={createPageUrl(`TournamentCommandPage?id=${tournament.id}`)}>
                                                                                        View Details
                                                                                    </Link>
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))
                                                        )}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </DragDropContext>
                    )}
                </CardContent>
            </Card>

            {/* Add Tournament Modal */}
            <Dialog open={isAddTournamentModalOpen} onOpenChange={setAddTournamentModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Tournament Dates by Age Division</DialogTitle>
                        <DialogDescription>
                            Create tournaments for each age division. Select a round and specify dates/locations for each division.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="round_name">Tournament Round*</Label>
                            <Select
                                value={tournamentForm.round_name}
                                onValueChange={(val) => setTournamentForm(prev => ({ ...prev, round_name: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a round..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {leagueRounds.map(round => (
                                        <SelectItem key={round} value={round}>{round}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <input
                                type="checkbox"
                                id="add-date-tentative"
                                checked={tournamentForm.date_tentative}
                                onChange={(e) => setTournamentForm(prev => ({ ...prev, date_tentative: e.target.checked }))}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="add-date-tentative" className="cursor-pointer text-sm font-medium">
                                Dates are tentative (e.g., "Oct 18 or 19")
                            </Label>
                        </div>

                        <div className="border rounded-lg p-4 space-y-4">
                            <h3 className="font-semibold text-sm">Dates by Age Division</h3>
                            {league?.age_divisions?.map(division => (
                                <div key={division} className="space-y-2 p-3 bg-gray-50 rounded">
                                    <div className="flex items-center gap-3">
                                        <div className="font-medium w-24">{division}</div>
                                        <Select
                                            value={tournamentForm.dates_by_division[division]?.days || '1'}
                                            onValueChange={(val) => updateDivisionDate(division, 'days', val)}
                                        >
                                            <SelectTrigger className="w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">1 Day</SelectItem>
                                                <SelectItem value="2">2 Days</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            value={tournamentForm.dates_by_division[division]?.location || ''}
                                            onChange={(e) => updateDivisionDate(division, 'location', e.target.value)}
                                            placeholder="Location (optional)"
                                            className="flex-1"
                                        />
                                    </div>
                                    <div className="flex gap-3 ml-24">
                                        <div className="flex-1">
                                            <Label className="text-xs text-gray-600">
                                                {tournamentForm.date_tentative ? 'First Possible Date' : 'Start Date'}
                                            </Label>
                                            <Input
                                                type="date"
                                                value={tournamentForm.dates_by_division[division]?.start_date || ''}
                                                onChange={(e) => updateDivisionDate(division, 'start_date', e.target.value)}
                                            />
                                        </div>
                                        {tournamentForm.dates_by_division[division]?.days === '2' && (
                                            <div className="flex-1">
                                                <Label className="text-xs text-gray-600">
                                                    {tournamentForm.date_tentative ? 'Second Possible Date' : 'End Date'}
                                                </Label>
                                                <Input
                                                    type="date"
                                                    value={tournamentForm.dates_by_division[division]?.end_date || ''}
                                                    onChange={(e) => updateDivisionDate(division, 'end_date', e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500">Leave start date blank for divisions not participating in this round</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddTournamentModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreateTournaments}
                            disabled={createTournamentsMutation.isPending || !tournamentForm.round_name}
                            className="bg-blush-800 hover:bg-blush-800/90 text-black"
                        >
                            {createTournamentsMutation.isPending ? 'Creating...' : 'Create Tournaments'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit League Modal */}
            <Dialog open={isEditLeagueModalOpen} onOpenChange={setEditLeagueModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit League</DialogTitle>
                        <DialogDescription>Update league information</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">Name*</Label>
                            <Input
                                id="edit-name"
                                value={editLeagueForm.name}
                                onChange={(e) => setEditLeagueForm(prev => ({ ...prev, name: e.target.value }))}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="edit-description" className="text-right pt-2">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={editLeagueForm.description}
                                onChange={(e) => setEditLeagueForm(prev => ({ ...prev, description: e.target.value }))}
                                className="col-span-3"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-start-date" className="text-right">Start Date</Label>
                            <Input
                                id="edit-start-date"
                                type="date"
                                value={editLeagueForm.start_date}
                                onChange={(e) => setEditLeagueForm(prev => ({ ...prev, start_date: e.target.value }))}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-end-date" className="text-right">End Date</Label>
                            <Input
                                id="edit-end-date"
                                type="date"
                                value={editLeagueForm.end_date}
                                onChange={(e) => setEditLeagueForm(prev => ({ ...prev, end_date: e.target.value }))}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-age-divisions" className="text-right">Age Divisions*</Label>
                            <Input
                                id="edit-age-divisions"
                                value={editLeagueForm.age_divisions}
                                onChange={(e) => setEditLeagueForm(prev => ({ ...prev, age_divisions: e.target.value }))}
                                className="col-span-3"
                                placeholder="e.g., 10U, 12U, 14U, High School"
                            />
                            <div className="col-start-2 col-span-3">
                                <p className="text-xs text-gray-500">Enter divisions separated by commas</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-contact-info" className="text-right">Contact Info</Label>
                            <Input
                                id="edit-contact-info"
                                value={editLeagueForm.contact_info}
                                onChange={(e) => setEditLeagueForm(prev => ({ ...prev, contact_info: e.target.value }))}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditLeagueModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleUpdateLeague}
                            disabled={updateLeagueMutation.isPending || !editLeagueForm.name || !editLeagueForm.age_divisions}
                            className="bg-blush-800 hover:bg-blush-800/90 text-black"
                        >
                            {updateLeagueMutation.isPending ? 'Updating...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Tournament Modal */}
            <Dialog open={isEditTournamentModalOpen} onOpenChange={setEditTournamentModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Tournament</DialogTitle>
                        <DialogDescription>Update tournament details</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-tournament-name" className="text-right">Name*</Label>
                            <Input
                                id="edit-tournament-name"
                                value={editTournamentForm.name}
                                onChange={(e) => setEditTournamentForm(prev => ({ ...prev, name: e.target.value }))}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-tournament-round" className="text-right">Round*</Label>
                            <Select
                                value={editTournamentForm.round_name}
                                onValueChange={(val) => setEditTournamentForm(prev => ({ ...prev, round_name: val }))}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select round..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {leagueRounds.map(round => (
                                        <SelectItem key={round} value={round}>{round}</SelectItem>
                                    ))}
                                    <SelectItem value={null}>Unassigned</SelectItem> {/* Option for unassigning round */}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-tournament-location" className="text-right">Location</Label>
                            <Input
                                id="edit-tournament-location"
                                value={editTournamentForm.location}
                                onChange={(e) => setEditTournamentForm(prev => ({ ...prev, location: e.target.value }))}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-tournament-start" className="text-right">Start Date</Label>
                            <Input
                                id="edit-tournament-start"
                                type="date"
                                value={editTournamentForm.start_date}
                                onChange={(e) => setEditTournamentForm(prev => ({ ...prev, start_date: e.target.value }))}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-tournament-end" className="text-right">End Date</Label>
                            <Input
                                id="edit-tournament-end"
                                type="date"
                                value={editTournamentForm.end_date}
                                onChange={(e) => setEditTournamentForm(prev => ({ ...prev, end_date: e.target.value }))}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date-tentative" className="text-right">Date Tentative</Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="date-tentative"
                                    checked={editTournamentForm.date_tentative}
                                    onChange={(e) => setEditTournamentForm(prev => ({ ...prev, date_tentative: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="date-tentative" className="cursor-pointer text-sm text-gray-600">
                                    Date is between start and end date (e.g., "Oct 18 or 19")
                                </Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTournamentModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleUpdateTournament}
                            disabled={updateTournamentMutation.isPending || !editTournamentForm.name}
                            className="bg-blush-800 hover:bg-blush-800/90 text-black"
                        >
                            {updateTournamentMutation.isPending ? 'Updating...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Rounds Modal */}
            <Dialog open={isManageRoundsModalOpen} onOpenChange={setManageRoundsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Tournament Rounds</DialogTitle>
                        <DialogDescription>Add, remove, or reorder tournament rounds for this league</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {roundsForm.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center">No rounds defined. Add one below!</p>
                            ) : (
                                roundsForm.map((round, index) => (
                                    <div key={round} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                        <span className="flex-1 font-medium">{round}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveRound(index)}
                                            aria-label={`Remove ${round}`}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={newRoundName}
                                onChange={(e) => setNewRoundName(e.target.value)}
                                placeholder="New round name (e.g., League 4)"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRound())}
                            />
                            <Button onClick={handleAddRound} disabled={!newRoundName.trim()}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Tournament names within a round will automatically include the round name and age division (e.g., "League Qualifier - 10U").
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setManageRoundsModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSaveRounds}
                            disabled={updateLeagueMutation.isPending}
                            className="bg-blush-800 hover:bg-blush-800/90 text-black"
                        >
                            {updateLeagueMutation.isPending ? 'Saving...' : 'Save Rounds'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
