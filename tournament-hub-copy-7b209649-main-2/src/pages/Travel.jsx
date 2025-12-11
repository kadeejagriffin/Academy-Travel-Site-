import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plane, Hotel, Edit, Trophy, CheckCircle2, Users, MapPin, Calendar, Filter, Trash2, UserCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, parseISO, isPast, isToday } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Travel() {
    const queryClient = useQueryClient();
    const [editingCoach, setEditingCoach] = useState(null);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isRoomAssignmentModalOpen, setRoomAssignmentModalOpen] = useState(false);
    const [selectedTournamentForRooming, setSelectedTournamentForRooming] = useState(null);
    const [editData, setEditData] = useState({});
    const [selectedTournament, setSelectedTournament] = useState('all');
    const [activeTab, setActiveTab] = useState('rooms');

    const { data: coaches, isLoading: isLoadingCoaches } = useQuery({
        queryKey: ['allCoaches'],
        queryFn: async () => {
            const allCoaches = await base44.entities.CoachTravel.list('-created_date');
            return allCoaches.sort((a, b) => a.coach_name.localeCompare(b.coach_name));
        },
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });

    const { data: tournaments } = useQuery({
        queryKey: ['tournaments'],
        queryFn: () => base44.entities.Tournament.list('-created_date'),
    });

    const { data: teams } = useQuery({
        queryKey: ['teams'],
        queryFn: () => base44.entities.Team.list(),
    });

    const { data: rooms } = useQuery({
        queryKey: ['rooms'],
        queryFn: () => base44.entities.Room.list(),
    });

    const { data: tournamentTeams } = useQuery({
        queryKey: ['tournamentTeams'],
        queryFn: () => base44.entities.TournamentTeam.list(),
    });

    const coachesForTournament = useMemo(() => {
        if (!coaches) return [];
        if (selectedTournament === 'all') {
            return coaches;
        }
        return coaches.filter(c => c.tournament_id === selectedTournament);
    }, [coaches, selectedTournament]);

    const toggleMutation = useMutation({
        mutationFn: ({ coachId, field, value }) => base44.entities.CoachTravel.update(coachId, { [field]: value }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
            queryClient.invalidateQueries({ queryKey: ['coaches'] });
        }
    });

    const updateCoachMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const currentCoaches = queryClient.getQueryData(['allCoaches']);
            const coachBeforeUpdate = currentCoaches?.find(c => c.id === id);

            await base44.entities.CoachTravel.update(id, data);

            if (!coachBeforeUpdate) {
                console.warn(`Coach with ID ${id} not found in cache before update. Finance transactions skipped.`);
                return;
            }

            const tournamentId = coachBeforeUpdate.tournament_id;
            const teamId = coachBeforeUpdate.team_id;
            const coachName = coachBeforeUpdate.coach_name;

            const allTournamentTransactions = await base44.entities.FinanceTransaction.filter({ tournament_id: tournamentId });
            const coachTransactions = allTournamentTransactions.filter(
                t => t.description?.includes(coachName)
            );

            if (data.flight_cost !== undefined) {
                const newFlightCost = parseFloat(data.flight_cost) || 0;
                const newFlightBooked = data.flight_booked !== undefined ? data.flight_booked : coachBeforeUpdate.flight_booked;

                const existingFlightTx = coachTransactions.find(t => t.category === 'Flight');

                if (newFlightCost > 0 && newFlightBooked) {
                    const description = `Flight for ${coachName}`;
                    const notes = data.flight_confirmation || '';

                    if (existingFlightTx) {
                        await base44.entities.FinanceTransaction.update(existingFlightTx.id, {
                            amount: newFlightCost,
                            date: new Date().toISOString().split('T')[0],
                            notes: notes
                        });
                    } else {
                        await base44.entities.FinanceTransaction.create({
                            tournament_id: tournamentId,
                            team_id: teamId,
                            category: 'Flight',
                            description: description,
                            amount: newFlightCost,
                            date: new Date().toISOString().split('T')[0],
                            notes: notes
                        });
                    }
                } else if (existingFlightTx) {
                    await base44.entities.FinanceTransaction.delete(existingFlightTx.id);
                }
            }

            if (data.hotel_cost !== undefined) {
                const newHotelCost = parseFloat(data.hotel_cost) || 0;
                const newHotelBooked = data.hotel_booked !== undefined ? data.hotel_booked : coachBeforeUpdate.hotel_booked;

                const existingHotelTx = coachTransactions.find(t => t.category === 'Hotel');

                if (newHotelCost > 0 && newHotelBooked) {
                    const description = `Hotel for ${coachName}`;
                    const notes = data.hotel_confirmation || '';

                    if (existingHotelTx) {
                        await base44.entities.FinanceTransaction.update(existingHotelTx.id, {
                            amount: newHotelCost,
                            date: new Date().toISOString().split('T')[0],
                            notes: notes
                        });
                    } else {
                        await base44.entities.FinanceTransaction.create({
                            tournament_id: tournamentId,
                            team_id: teamId,
                            category: 'Hotel',
                            description: description,
                            amount: newHotelCost,
                            date: new Date().toISOString().split('T')[0],
                            notes: notes
                        });
                    }
                } else if (existingHotelTx) {
                    await base44.entities.FinanceTransaction.delete(existingHotelTx.id);
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
            queryClient.invalidateQueries({ queryKey: ['coaches'] });
            queryClient.invalidateQueries({ queryKey: ['financeTransactions'] });
            setEditModalOpen(false);
            setEditingCoach(null);
        }
    });

    const assignCoachMutation = useMutation({
        mutationFn: ({ coachId, roomId }) => {
            const targetRoom = rooms?.find(r => r.id === roomId);
            if (!targetRoom) {
                throw new Error("Target room not found.");
            }
            const updatedOccupants = Array.from(new Set([...(targetRoom.occupants || []), coachId]));
            return base44.entities.Room.update(roomId, { occupants: updatedOccupants });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
        },
        onError: (error) => {
            console.error("Failed to assign coach to room:", error);
        }
    });

    const deleteCoachMutation = useMutation({
        mutationFn: (coachId) => base44.entities.CoachTravel.delete(coachId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
            queryClient.invalidateQueries({ queryKey: ['coaches'] });
        }
    });

    const getTournamentName = (tournamentId) => {
        return tournaments?.find(t => t.id === tournamentId)?.name || 'Unknown Tournament';
    };

    const getTeamName = (teamId) => {
        return teams?.find(t => t.id === teamId)?.name || 'Unknown Team';
    };

    const getTeamLocation = (teamId) => {
        const team = teams?.find(t => t.id === teamId);
        return team?.club_location || '';
    };

    const getTournamentTeamLocation = (teamId, tournamentId) => {
        const tournamentTeamEntry = tournamentTeams?.find(
            tt => tt.team_id === teamId && tt.tournament_id === tournamentId
        );
        
        if (tournamentTeamEntry && tournamentTeamEntry.team_location) {
            return tournamentTeamEntry.team_location;
        }
        
        const team = teams?.find(t => t.id === teamId);
        return team?.club_location || '';
    };

    const getRoomForCoach = (coachId) => {
        return rooms?.find(r => r.occupants?.includes(coachId));
    };

    const unassignedCoaches = useMemo(() => {
        return coachesForTournament.filter(coach =>
            (coach.flight_booked || coach.hotel_booked) &&
            !getRoomForCoach(coach.id) &&
            !coach.no_roommate_needed
        );
    }, [coachesForTournament, rooms]);

    const coachesByTournamentForDisplay = useMemo(() => {
        if (!coaches || !tournaments || !rooms) return { active: [], completed: [] };

        let tournamentsToProcess = tournaments;
        let coachesWithTravelNeeds = coaches.filter(c => c.flight_booked || c.hotel_booked || c.attendance_confirmed);

        if (selectedTournament !== 'all') {
            tournamentsToProcess = tournaments.filter(t => t.id === selectedTournament);
            coachesWithTravelNeeds = coachesWithTravelNeeds.filter(c => c.tournament_id === selectedTournament);
        }

        const sortedTournaments = [...tournamentsToProcess].sort((a, b) => {
            const dateA = a.start_date ? new Date(a.start_date).getTime() : Infinity;
            const dateB = b.start_date ? new Date(b.start_date).getTime() : Infinity;
            return dateA - dateB;
        });

        const activeTournaments = [];
        const completedTournaments = [];

        sortedTournaments.forEach(tournament => {
            const tournamentCoaches = coachesWithTravelNeeds.filter(c => c.tournament_id === tournament.id);

            const roomGroups = new Map();
            const unassignedCoachesForTournament = [];
            const noRoommateCoachesForTournament = [];

            tournamentCoaches.forEach(coach => {
                if (coach.no_roommate_needed) {
                    noRoommateCoachesForTournament.push(coach);
                } else {
                    const room = rooms.find(r => r.occupants?.includes(coach.id));
                    if (room) {
                        if (!roomGroups.has(room.id)) {
                            roomGroups.set(room.id, { room, coaches: [] });
                        }
                        roomGroups.get(room.id).coaches.push(coach);
                    } else {
                        unassignedCoachesForTournament.push(coach);
                    }
                }
            });

            const sortedRoomGroups = Array.from(roomGroups.values()).map(group => ({
                ...group,
                coaches: group.coaches.sort((a, b) => a.coach_name.localeCompare(b.coach_name))
            })).sort((a, b) => (a.room.room_number || '').localeCompare(b.room.room_number || ''));

            const sortedUnassignedCoachesForTournament = unassignedCoachesForTournament.sort((a, b) => a.coach_name.localeCompare(b.coach_name));
            const sortedNoRoommateCoachesForTournament = noRoommateCoachesForTournament.sort((a, b) => a.coach_name.localeCompare(b.coach_name));

            const allRelevantCoaches = [...tournamentCoaches];
            const allComplete = allRelevantCoaches.length > 0 && allRelevantCoaches.every(c => c.travel_complete);
            const totalRelevantCoaches = sortedRoomGroups.reduce((sum, rg) => sum + rg.coaches.length, 0) + sortedUnassignedCoachesForTournament.length + sortedNoRoommateCoachesForTournament.length;

            if (totalRelevantCoaches === 0 && selectedTournament === 'all') return;

            const processedTournament = {
                tournament,
                roomGroups: sortedRoomGroups,
                unassignedCoaches: sortedUnassignedCoachesForTournament,
                noRoommateCoaches: sortedNoRoommateCoachesForTournament,
                allComplete,
                totalCoaches: totalRelevantCoaches
            };

            if (allComplete) {
                completedTournaments.push(processedTournament);
            } else {
                activeTournaments.push(processedTournament);
            }
        });

        return {
            active: activeTournaments,
            completed: completedTournaments
        };
    }, [coaches, tournaments, rooms, selectedTournament]);

    const handleEditCoach = (coach) => {
        setEditingCoach(coach);
        setEditData({
            gender: coach.gender || 'Male',
            preferred_airport: coach.preferred_airport || '',
            flight_confirmation: coach.flight_confirmation || '',
            hotel_confirmation: coach.hotel_confirmation || '',
            flight_cost: coach.flight_cost || 0,
            hotel_cost: coach.hotel_cost || 0,
            rooming_notes: coach.rooming_notes || '',
            notes: coach.notes || ''
        });
        setEditModalOpen(true);
    };

    const handleSaveEdit = () => {
        const dataToSend = {
            ...editData,
            flight_cost: parseFloat(editData.flight_cost),
            hotel_cost: parseFloat(editData.hotel_cost)
        };
        updateCoachMutation.mutate({ id: editingCoach.id, data: dataToSend });
    };

    const handleOpenRoomAssignment = (tournament) => {
        setSelectedTournamentForRooming(tournament);
        setRoomAssignmentModalOpen(true);
    };

    const CoachCard = ({ coach, onAssignToRoom, onDelete, rooms, showTournament, getTournamentName, getTeamName, getTournamentTeamLocation, handleEditCoach }) => {
        const availableRooms = rooms.filter(r => r.tournament_id === coach.tournament_id);

        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>{coach.coach_name}</span>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditCoach(coach)}>
                                <Edit className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => onDelete(coach.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    </CardTitle>
                    {showTournament && coach.tournament_id && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Trophy className="w-3 h-3" /> {getTournamentName(coach.tournament_id)}
                        </p>
                    )}
                    {coach.team_id && (
                        <div className="text-sm text-gray-500">
                            <p className="flex items-center gap-1 font-medium">
                                <Users className="w-3 h-3" /> {getTeamName(coach.team_id)}
                            </p>
                            {getTournamentTeamLocation(coach.team_id, coach.tournament_id) && (
                                <p className="text-xs ml-4">{getTournamentTeamLocation(coach.team_id, coach.tournament_id)}</p>
                            )}
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            coach.gender === 'Male' ? 'bg-blue-100 text-blue-800' :
                            coach.gender === 'Female' ? 'bg-pink-100 text-pink-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {coach.gender || 'Not Set'}
                        </span>
                        <span className={`flex items-center gap-1 ${coach.travel_complete ? 'text-sage-700' : 'text-gray-500'}`}>
                            {coach.travel_complete && <CheckCircle2 className="w-4 h-4" />}
                            {coach.travel_complete ? 'Complete' : 'Pending'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <UserCheck className={`w-4 h-4 ${coach.attendance_confirmed ? 'text-green-500' : 'text-gray-400'}`} />
                        <span>Attending: {coach.attendance_confirmed ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Plane className={`w-4 h-4 ${coach.flight_booked ? 'text-blue-500' : 'text-gray-400'}`} />
                        <span>Flight: {coach.flight_confirmation || 'Not Booked'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Hotel className={`w-4 h-4 ${coach.hotel_booked ? 'text-blue-500' : 'text-gray-400'}`} />
                        <span>Hotel: {coach.hotel_confirmation || 'Not Booked'}</span>
                    </div>

                    {coach.rooming_notes && (
                        <p className="text-xs text-gray-600 italic mt-2">Notes: {coach.rooming_notes}</p>
                    )}

                    <div className="border-t pt-3 mt-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full mb-2"
                            onClick={() => toggleMutation.mutate({
                                coachId: coach.id,
                                field: 'no_roommate_needed',
                                value: true
                            })}
                        >
                            No Roommate Needed
                        </Button>

                        <Select onValueChange={(roomId) => onAssignToRoom(coach.id, roomId)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Assign to Room" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableRooms.length === 0 ? (
                                    <SelectItem value="no_rooms" disabled>No rooms available for this tournament</SelectItem>
                                ) : (
                                    availableRooms.map(room => (
                                        <SelectItem key={room.id} value={room.id}>
                                            {`Room ${room.room_number} (${room.hotel})`}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const totalRoomsCount = useMemo(() => {
        if (!coachesByTournamentForDisplay.active) return 0;
        const activeRooms = coachesByTournamentForDisplay.active.reduce((sum, item) => sum + item.roomGroups.length, 0);
        return activeRooms;
    }, [coachesByTournamentForDisplay]);

    const completedTournamentsCount = useMemo(() => {
        return coachesByTournamentForDisplay.completed?.length || 0;
    }, [coachesByTournamentForDisplay]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Travel Management</h1>
                    <p className="text-gray-500 mt-1">Organize travel and rooming by tournament</p>
                </div>
            </div>

            <Card className="mb-6">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        Filter by Tournament
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a tournament..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tournaments</SelectItem>
                            {tournaments?.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {isLoadingCoaches ? (
                <Card>
                    <CardContent className="py-8 text-center">Loading coaches...</CardContent>
                </Card>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="rooms">
                            Active Tournaments ({totalRoomsCount} rooms)
                        </TabsTrigger>
                        <TabsTrigger value="unassigned">
                            Unassigned Coaches ({unassignedCoaches.length})
                        </TabsTrigger>
                        <TabsTrigger value="completed">
                            Completed ({completedTournamentsCount})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="rooms" className="space-y-4">
                        {coachesByTournamentForDisplay.active.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center text-gray-500">
                                    No active tournaments with travel needs for this selection.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-gray-900">Active Tournaments</h2>
                                <Accordion
                                    type="multiple"
                                    defaultValue={selectedTournament !== 'all' && coachesByTournamentForDisplay.active.length > 0 ? [selectedTournament] : []}
                                    className="space-y-4"
                                >
                                    {coachesByTournamentForDisplay.active.map(({ tournament, roomGroups, unassignedCoaches: unassignedInAccordion, noRoommateCoaches, allComplete, totalCoaches }) => (
                                        <AccordionItem value={tournament.id} key={tournament.id} className="border rounded-lg bg-white">
                                            <AccordionTrigger className="px-6 hover:no-underline">
                                                <div className="flex items-center justify-between w-full pr-4">
                                                    <div className="flex items-center gap-3">
                                                        <Trophy className="w-5 h-5 text-blush-800" />
                                                        <div className="text-left">
                                                            <Link 
                                                                to={createPageUrl(`TournamentCommandPage?id=${tournament.id}`)}
                                                                className="text-lg font-bold hover:text-blush-800 hover:underline transition-colors inline-flex items-center gap-1"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {tournament.name}
                                                                <ExternalLink className="w-4 h-4" />
                                                            </Link>
                                                            {tournament.location && (
                                                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                                    <MapPin className="w-3 h-3" /> {tournament.location}
                                                                </p>
                                                            )}
                                                            {tournament.start_date && tournament.end_date && (
                                                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {format(parseISO(tournament.start_date), 'MMM d')} - {format(parseISO(tournament.end_date), 'MMM d, yyyy')}
                                                                </p>
                                                            )}
                                                            <p className="text-sm text-gray-500 mt-1">{totalCoaches} coach{totalCoaches !== 1 ? 'es' : ''} needing travel</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenRoomAssignment(tournament);
                                                            }}
                                                            className="text-black"
                                                        >
                                                            <Users className="w-4 h-4 mr-2" />
                                                            Assign Rooms
                                                        </Button>
                                                        {allComplete && <CheckCircle2 className="w-6 h-6 text-sage-800" />}
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-6 pt-4">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Coach Name(s)</TableHead>
                                                            <TableHead>Gender</TableHead>
                                                            <TableHead>Preferred Airport</TableHead>
                                                            <TableHead>Team</TableHead>
                                                            <TableHead className="text-center">Attending</TableHead>
                                                            <TableHead className="text-center">Flight</TableHead>
                                                            <TableHead className="text-center">Hotel</TableHead>
                                                            <TableHead className="text-center">Complete</TableHead>
                                                            <TableHead>Flight Conf #</TableHead>
                                                            <TableHead>Hotel Conf #</TableHead>
                                                            <TableHead>Room Assignment</TableHead>
                                                            <TableHead className="text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {roomGroups.map(({ room, coaches: roomedCoaches }) => (
                                                            <TableRow key={room.id} className="bg-green-50">
                                                                <TableCell className="font-medium">
                                                                    <div className="space-y-1">
                                                                        {roomedCoaches.map(coach => (
                                                                            <div key={coach.id}>{coach.coach_name}</div>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="space-y-1">
                                                                        {roomedCoaches.map(coach => (
                                                                            <div key={coach.id}>
                                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                                    coach.gender === 'Male' ? 'bg-blue-100 text-blue-800' :
                                                                                    coach.gender === 'Female' ? 'bg-pink-100 text-pink-800' :
                                                                                    'bg-gray-100 text-gray-800'
                                                                                }`}>
                                                                                    {coach.gender || 'Not Set'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="space-y-1">
                                                                        {roomedCoaches.map(coach => (
                                                                            <div key={coach.id} className="text-sm">
                                                                                {coach.preferred_airport ? (
                                                                                    <span className="text-blue-600 font-medium">{coach.preferred_airport}</span>
                                                                                ) : (
                                                                                    <span className="text-gray-400">-</span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="space-y-1">
                                                                        {roomedCoaches.map(coach => (
                                                                            <div key={coach.id} className="text-sm">
                                                                                <div className="font-medium">{coach.team_id ? getTeamName(coach.team_id) : '-'}</div>
                                                                                {coach.team_id && getTournamentTeamLocation(coach.team_id, tournament.id) && (
                                                                                    <div className="text-xs text-gray-500">{getTournamentTeamLocation(coach.team_id, tournament.id)}</div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {roomedCoaches.map(coach => (
                                                                        <div key={coach.id} className="py-1">
                                                                            <Switch
                                                                                checked={coach.attendance_confirmed}
                                                                                onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'attendance_confirmed', value: checked })}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {roomedCoaches.map(coach => (
                                                                        <div key={coach.id} className="py-1">
                                                                            <Switch
                                                                                checked={coach.flight_booked}
                                                                                onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'flight_booked', value: checked })}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {roomedCoaches.map(coach => (
                                                                        <div key={coach.id} className="py-1">
                                                                            <Switch
                                                                                checked={coach.hotel_booked}
                                                                                onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'hotel_booked', value: checked })}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {roomedCoaches.map(coach => (
                                                                        <div key={coach.id} className="py-1">
                                                                            <Switch
                                                                                checked={coach.travel_complete}
                                                                                onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'travel_complete', value: checked })}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </TableCell>
                                                                <TableCell>{roomedCoaches.map(coach => <div key={coach.id}>{coach.flight_confirmation || '-'}</div>)}</TableCell>
                                                                <TableCell>{roomedCoaches.map(coach => <div key={coach.id}>{coach.hotel_confirmation || '-'}</div>)}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <Hotel className="w-4 h-4" />
                                                                        <span>Room {room.room_number} ({room.hotel})</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {roomedCoaches.map(coach => (
                                                                        <Button key={coach.id} variant="ghost" size="sm" onClick={() => handleEditCoach(coach)}>
                                                                            <Edit className="h-4 w-4 text-blue-500" />
                                                                        </Button>
                                                                    ))}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {unassignedInAccordion.map(coach => (
                                                            <TableRow key={coach.id}>
                                                                <TableCell className="font-medium">{coach.coach_name}</TableCell>
                                                                <TableCell>
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                        coach.gender === 'Male' ? 'bg-blue-100 text-blue-800' :
                                                                        coach.gender === 'Female' ? 'bg-pink-100 text-pink-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                        {coach.gender || 'Not Set'}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {coach.preferred_airport ? (
                                                                        <span className="text-blue-600 font-medium">{coach.preferred_airport}</span>
                                                                    ) : (
                                                                        <span className="text-gray-400">-</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-sm">
                                                                    <div className="font-medium">{coach.team_id ? getTeamName(coach.team_id) : '-'}</div>
                                                                    {coach.team_id && getTournamentTeamLocation(coach.team_id, tournament.id) && (
                                                                        <div className="text-xs text-gray-500">{getTournamentTeamLocation(coach.team_id, tournament.id)}</div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.attendance_confirmed}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'attendance_confirmed', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.flight_booked}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'flight_booked', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.hotel_booked}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'hotel_booked', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.travel_complete}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'travel_complete', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>{coach.flight_confirmation || '-'}</TableCell>
                                                                <TableCell>{coach.hotel_confirmation || '-'}</TableCell>
                                                                <TableCell className="text-orange-500 font-medium">Unassigned</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="sm" onClick={() => handleEditCoach(coach)}>
                                                                        <Edit className="h-4 w-4 text-blue-500" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {noRoommateCoaches.map(coach => (
                                                            <TableRow key={coach.id}>
                                                                <TableCell className="font-medium">{coach.coach_name}</TableCell>
                                                                <TableCell>
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                        coach.gender === 'Male' ? 'bg-blue-100 text-blue-800' :
                                                                        coach.gender === 'Female' ? 'bg-pink-100 text-pink-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                        {coach.gender || 'Not Set'}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {coach.preferred_airport ? (
                                                                        <span className="text-blue-600 font-medium">{coach.preferred_airport}</span>
                                                                    ) : (
                                                                        <span className="text-gray-400">-</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-sm">
                                                                    <div className="font-medium">{coach.team_id ? getTeamName(coach.team_id) : '-'}</div>
                                                                    {coach.team_id && getTournamentTeamLocation(coach.team_id, tournament.id) && (
                                                                        <div className="text-xs text-gray-500">{getTournamentTeamLocation(coach.team_id, tournament.id)}</div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.attendance_confirmed}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'attendance_confirmed', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.flight_booked}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'flight_booked', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.hotel_booked}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'hotel_booked', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.travel_complete}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'travel_complete', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>{coach.flight_confirmation || '-'}</TableCell>
                                                                <TableCell>{coach.hotel_confirmation || '-'}</TableCell>
                                                                <TableCell className="text-blue-500 font-medium">No Roommate</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="sm" onClick={() => handleEditCoach(coach)}>
                                                                        <Edit className="h-4 w-4 text-blue-500" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="unassigned" className="space-y-4">
                        {unassignedCoaches.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center text-gray-500">
                                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <p className="text-lg">All coaches are assigned to rooms or marked as not needing roommates!</p>
                                    {coachesForTournament.filter(c => c.flight_booked || c.hotel_booked).length === 0 && (
                                        <p className="text-sm mt-2">No coaches with travel needs found for the selected tournament.</p>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {unassignedCoaches.map(coach => (
                                    <CoachCard
                                        key={coach.id}
                                        coach={coach}
                                        onAssignToRoom={(coachId, roomId) => assignCoachMutation.mutate({ coachId, roomId })}
                                        onDelete={(coachId) => {
                                            if (confirm(`Are you sure you want to delete ${coach.coach_name}? This action cannot be undone.`)) {
                                                deleteCoachMutation.mutate(coachId);
                                            }
                                        }}
                                        rooms={rooms || []}
                                        showTournament={selectedTournament === 'all'}
                                        getTournamentName={getTournamentName}
                                        getTeamName={getTeamName}
                                        getTournamentTeamLocation={getTournamentTeamLocation}
                                        handleEditCoach={handleEditCoach}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="completed" className="space-y-4">
                        {coachesByTournamentForDisplay.completed.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center text-gray-500">
                                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <p className="text-lg">No completed tournaments yet</p>
                                    <p className="text-sm mt-2">Tournaments will appear here once all travel arrangements are marked complete</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-sage-800">Completed Tournaments</h2>
                                <Accordion type="multiple" className="space-y-4">
                                    {coachesByTournamentForDisplay.completed.map(({ tournament, roomGroups, unassignedCoaches: unassignedInAccordion, noRoommateCoaches, allComplete, totalCoaches }) => (
                                        <AccordionItem value={tournament.id} key={tournament.id} className="border-2 border-sage-200 rounded-lg bg-sage-50">
                                            <AccordionTrigger className="px-6 hover:no-underline">
                                                <div className="flex items-center justify-between w-full pr-4">
                                                    <div className="flex items-center gap-3">
                                                        <Trophy className="w-5 h-5 text-sage-800" />
                                                        <div className="text-left">
                                                            <Link 
                                                                to={createPageUrl(`TournamentCommandPage?id=${tournament.id}`)}
                                                                className="text-lg font-bold hover:text-sage-800 hover:underline transition-colors inline-flex items-center gap-1"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {tournament.name}
                                                                <ExternalLink className="w-4 h-4" />
                                                            </Link>
                                                            {tournament.location && (
                                                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                                    <MapPin className="w-3 h-3" /> {tournament.location}
                                                                </p>
                                                            )}
                                                            {tournament.start_date && tournament.end_date && (
                                                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {format(parseISO(tournament.start_date), 'MMM d')} - {format(parseISO(tournament.end_date), 'MMM d, yyyy')}
                                                                </p>
                                                            )}
                                                            <p className="text-sm text-gray-500 mt-1">{totalCoaches} coach{totalCoaches !== 1 ? 'es' : ''}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle2 className="w-6 h-6 text-sage-800" />
                                                        <span className="text-sm font-medium text-sage-800">Complete</span>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-6 pt-4">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Coach Name(s)</TableHead>
                                                            <TableHead>Gender</TableHead>
                                                            <TableHead>Preferred Airport</TableHead>
                                                            <TableHead>Team</TableHead>
                                                            <TableHead className="text-center">Attending</TableHead>
                                                            <TableHead className="text-center">Flight</TableHead>
                                                            <TableHead className="text-center">Hotel</TableHead>
                                                            <TableHead className="text-center">Complete</TableHead>
                                                            <TableHead>Flight Conf #</TableHead>
                                                            <TableHead>Hotel Conf #</TableHead>
                                                            <TableHead>Room Assignment</TableHead>
                                                            <TableHead className="text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {roomGroups.map(({ room, coaches: roomedCoaches }) => (
                                                            <TableRow key={room.id} className="bg-green-50">
                                                                <TableCell className="font-medium">
                                                                    <div className="space-y-1">
                                                                        {roomedCoaches.map(coach => (
                                                                            <div key={coach.id}>{coach.coach_name}</div>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="space-y-1">
                                                                        {roomedCoaches.map(coach => (
                                                                            <div key={coach.id}>
                                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                                    coach.gender === 'Male' ? 'bg-blue-100 text-blue-800' :
                                                                                    coach.gender === 'Female' ? 'bg-pink-100 text-pink-800' :
                                                                                    'bg-gray-100 text-gray-800'
                                                                                }`}>
                                                                                    {coach.gender || 'Not Set'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="space-y-1">
                                                                        {roomedCoaches.map(coach => (
                                                                            <div key={coach.id} className="text-sm">
                                                                                {coach.preferred_airport ? (
                                                                                    <span className="text-blue-600 font-medium">{coach.preferred_airport}</span>
                                                                                ) : (
                                                                                    <span className="text-gray-400">-</span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="space-y-1">
                                                                        {roomedCoaches.map(coach => (
                                                                            <div key={coach.id} className="text-sm">
                                                                                <div className="font-medium">{coach.team_id ? getTeamName(coach.team_id) : '-'}</div>
                                                                                {coach.team_id && getTournamentTeamLocation(coach.team_id, tournament.id) && (
                                                                                    <div className="text-xs text-gray-500">{getTournamentTeamLocation(coach.team_id, tournament.id)}</div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {roomedCoaches.map(coach => (
                                                                        <div key={coach.id} className="py-1">
                                                                            <Switch
                                                                                checked={coach.attendance_confirmed}
                                                                                onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'attendance_confirmed', value: checked })}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {roomedCoaches.map(coach => (
                                                                        <div key={coach.id} className="py-1">
                                                                            <Switch
                                                                                checked={coach.flight_booked}
                                                                                onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'flight_booked', value: checked })}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {roomedCoaches.map(coach => (
                                                                        <div key={coach.id} className="py-1">
                                                                            <Switch
                                                                                checked={coach.hotel_booked}
                                                                                onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'hotel_booked', value: checked })}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {roomedCoaches.map(coach => (
                                                                        <div key={coach.id} className="py-1">
                                                                            <Switch
                                                                                checked={coach.travel_complete}
                                                                                onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'travel_complete', value: checked })}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </TableCell>
                                                                <TableCell>{roomedCoaches.map(coach => <div key={coach.id}>{coach.flight_confirmation || '-'}</div>)}</TableCell>
                                                                <TableCell>{roomedCoaches.map(coach => <div key={coach.id}>{coach.hotel_confirmation || '-'}</div>)}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <Hotel className="w-4 h-4" />
                                                                        <span>Room {room.room_number} ({room.hotel})</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {roomedCoaches.map(coach => (
                                                                        <Button key={coach.id} variant="ghost" size="sm" onClick={() => handleEditCoach(coach)}>
                                                                            <Edit className="h-4 w-4 text-blue-500" />
                                                                        </Button>
                                                                    ))}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {unassignedInAccordion.map(coach => (
                                                            <TableRow key={coach.id}>
                                                                <TableCell className="font-medium">{coach.coach_name}</TableCell>
                                                                <TableCell>
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                        coach.gender === 'Male' ? 'bg-blue-100 text-blue-800' :
                                                                        coach.gender === 'Female' ? 'bg-pink-100 text-pink-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                        {coach.gender || 'Not Set'}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {coach.preferred_airport ? (
                                                                        <span className="text-blue-600 font-medium">{coach.preferred_airport}</span>
                                                                    ) : (
                                                                        <span className="text-gray-400">-</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-sm">
                                                                    <div className="font-medium">{coach.team_id ? getTeamName(coach.team_id) : '-'}</div>
                                                                    {coach.team_id && getTournamentTeamLocation(coach.team_id, tournament.id) && (
                                                                        <div className="text-xs text-gray-500">{getTournamentTeamLocation(coach.team_id, tournament.id)}</div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.attendance_confirmed}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'attendance_confirmed', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.flight_booked}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'flight_booked', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.hotel_booked}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'hotel_booked', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.travel_complete}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'travel_complete', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>{coach.flight_confirmation || '-'}</TableCell>
                                                                <TableCell>{coach.hotel_confirmation || '-'}</TableCell>
                                                                <TableCell className="text-orange-500 font-medium">Unassigned</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="sm" onClick={() => handleEditCoach(coach)}>
                                                                        <Edit className="h-4 w-4 text-blue-500" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {noRoommateCoaches.map(coach => (
                                                            <TableRow key={coach.id}>
                                                                <TableCell className="font-medium">{coach.coach_name}</TableCell>
                                                                <TableCell>
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                        coach.gender === 'Male' ? 'bg-blue-100 text-blue-800' :
                                                                        coach.gender === 'Female' ? 'bg-pink-100 text-pink-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                        {coach.gender || 'Not Set'}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {coach.preferred_airport ? (
                                                                        <span className="text-blue-600 font-medium">{coach.preferred_airport}</span>
                                                                    ) : (
                                                                        <span className="text-gray-400">-</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-sm">
                                                                    <div className="font-medium">{coach.team_id ? getTeamName(coach.team_id) : '-'}</div>
                                                                    {coach.team_id && getTournamentTeamLocation(coach.team_id, tournament.id) && (
                                                                        <div className="text-xs text-gray-500">{getTournamentTeamLocation(coach.team_id, tournament.id)}</div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.attendance_confirmed}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'attendance_confirmed', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.flight_booked}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'flight_booked', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.hotel_booked}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'hotel_booked', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Switch
                                                                        checked={coach.travel_complete}
                                                                        onCheckedChange={(checked) => toggleMutation.mutate({ coachId: coach.id, field: 'travel_complete', value: checked })}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>{coach.flight_confirmation || '-'}</TableCell>
                                                                <TableCell>{coach.hotel_confirmation || '-'}</TableCell>
                                                                <TableCell className="text-blue-500 font-medium">No Roommate</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="sm" onClick={() => handleEditCoach(coach)}>
                                                                        <Edit className="h-4 w-4 text-blue-500" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}

            <Dialog open={isEditModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Travel Details - {editingCoach?.coach_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="gender">Gender</Label>
                            <Select
                                value={editData.gender}
                                onValueChange={val => setEditData({...editData, gender: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="preferred_airport">Preferred Airport</Label>
                            <Input
                                id="preferred_airport"
                                value={editData.preferred_airport}
                                onChange={e => setEditData({...editData, preferred_airport: e.target.value})}
                                placeholder="e.g., SFO, OAK, SJC"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="flightConf">Flight Confirmation #</Label>
                                <Input
                                    id="flightConf"
                                    value={editData.flight_confirmation}
                                    onChange={e => setEditData({...editData, flight_confirmation: e.target.value})}
                                    placeholder="Flight confirmation"
                                />
                            </div>
                            <div>
                                <Label htmlFor="flightCost">Flight Cost ($)</Label>
                                <Input
                                    id="flightCost"
                                    type="number"
                                    step="0.01"
                                    value={editData.flight_cost}
                                    onChange={e => setEditData({...editData, flight_cost: e.target.value})}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="hotelConf">Hotel Confirmation #</Label>
                                <Input
                                    id="hotelConf"
                                    value={editData.hotel_confirmation}
                                    onChange={e => setEditData({...editData, hotel_confirmation: e.target.value})}
                                    placeholder="Hotel confirmation"
                                />
                            </div>
                            <div>
                                <Label htmlFor="hotelCost">Hotel Cost ($)</Label>
                                <Input
                                    id="hotelCost"
                                    type="number"
                                    step="0.01"
                                    value={editData.hotel_cost}
                                    onChange={e => setEditData({...editData, hotel_cost: e.target.value})}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="roomingNotes">Rooming Notes</Label>
                            <Textarea
                                id="roomingNotes"
                                value={editData.rooming_notes}
                                onChange={e => setEditData({...editData, rooming_notes: e.target.value})}
                                placeholder="e.g., Single room preferred, prefers to room with John Doe"
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="notes">General Notes</Label>
                            <Textarea
                                id="notes"
                                value={editData.notes}
                                onChange={e => setEditData({...editData, notes: e.target.value})}
                                placeholder="Travel notes"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={updateCoachMutation.isPending}
                            className="bg-blush-800 hover:bg-blush-800/90 text-black"
                        >
                            {updateCoachMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {selectedTournamentForRooming && (
                <RoomAssignmentModal
                    tournament={selectedTournamentForRooming}
                    coaches={coaches?.filter(c =>
                        c.tournament_id === selectedTournamentForRooming.id &&
                        (c.flight_booked || c.hotel_booked) &&
                        !c.no_roommate_needed
                    ) || []}
                    rooms={rooms?.filter(r => r.tournament_id === selectedTournamentForRooming.id) || []}
                    isOpen={isRoomAssignmentModalOpen}
                    onClose={() => {
                        setRoomAssignmentModalOpen(false);
                        setSelectedTournamentForRooming(null);
                    }}
                />
            )}
        </div>
    );
}

function RoomAssignmentModal({ tournament, coaches, rooms, isOpen, onClose }) {
    const queryClient = useQueryClient();
    const [localRooms, setLocalRooms] = useState([]);
    const [selectedCoaches, setSelectedCoaches] = useState([]);

    useEffect(() => {
        // Update localRooms when rooms prop changes or modal opens
        setLocalRooms(rooms);
        setSelectedCoaches([]); // Clear selection when modal opens or rooms change
    }, [rooms, isOpen]);

    const createRoomMutation = useMutation({
        mutationFn: (roomData) => base44.entities.Room.create({
            ...roomData,
            tournament_id: tournament.id,
            occupants: roomData.occupants || []
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
            setSelectedCoaches([]);
        }
    });

    const updateRoomMutation = useMutation({
        mutationFn: ({ roomId, occupants }) => base44.entities.Room.update(roomId, { occupants }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
        }
    });

    const deleteRoomMutation = useMutation({
        mutationFn: (roomId) => base44.entities.Room.delete(roomId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
        }
    });

    const [newRoomNumber, setNewRoomNumber] = useState('');
    const [newHotel, setNewHotel] = useState('');

    const handleAddRoom = () => {
        if (newRoomNumber && newHotel) {
            createRoomMutation.mutate({
                room_number: newRoomNumber,
                hotel: newHotel,
                room_type: '2 Beds', // Defaulting to 2 Beds
                cost_per_night: 0,
                nights: 0,
                occupants: []
            });
            setNewRoomNumber('');
            setNewHotel('');
        }
    };

    const handleAssignCoach = (roomId, coachId) => {
        const currentRoomOfCoach = localRooms.find(r => (r.occupants || []).includes(coachId));
        let roomsToUpdateInBackend = [];
        let newLocalRoomsState = [...localRooms];

        // If coach is already in a room, unassign them first
        if (currentRoomOfCoach && currentRoomOfCoach.id !== roomId) {
            const updatedOccupants = (currentRoomOfCoach.occupants || []).filter(id => id !== coachId);
            roomsToUpdateInBackend.push({ roomId: currentRoomOfCoach.id, occupants: updatedOccupants });
            newLocalRoomsState = newLocalRoomsState.map(r => r.id === currentRoomOfCoach.id ? { ...r, occupants: updatedOccupants } : r);
        }

        // Assign coach to the new room
        const targetRoomIndex = newLocalRoomsState.findIndex(r => r.id === roomId);
        if (targetRoomIndex !== -1) {
            const currentTargetRoom = newLocalRoomsState[targetRoomIndex];
            const updatedOccupants = [...(currentTargetRoom.occupants || []), coachId];
            roomsToUpdateInBackend.push({ roomId: currentTargetRoom.id, occupants: updatedOccupants });
            newLocalRoomsState[targetRoomIndex] = { ...currentTargetRoom, occupants: updatedOccupants };
        } else {
            console.error("Target room not found in local state for assignment.");
            return;
        }

        setLocalRooms(newLocalRoomsState);
        setSelectedCoaches(prev => prev.filter(id => id !== coachId)); // Remove from selected if assigned individually

        // Trigger mutations for all affected rooms
        roomsToUpdateInBackend.forEach(update => {
            updateRoomMutation.mutate(update);
        });
    };

    const handleUnassignCoach = (roomId, coachId) => {
        const room = localRooms.find(r => r.id === roomId);
        if (!room) return;

        const updatedOccupants = (room.occupants || []).filter(id => id !== coachId);
        const updatedRooms = localRooms.map(r =>
            r.id === roomId ? { ...r, occupants: updatedOccupants } : r
        );

        setLocalRooms(updatedRooms);
        updateRoomMutation.mutate({ roomId, occupants: updatedOccupants });
    };

    const handleRoomSelectedCoachesTogether = async () => {
        if (selectedCoaches.length < 2) return;

        const roomNumberSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const defaultHotel = tournament.housing_partner || 'Tournament Hotel';
        const newRoomNumber = `Auto-Room-${roomNumberSuffix}`;

        try {
            // First, unassign all selected coaches from any rooms they might currently be in
            const updatePromises = [];
            const coachesToUnassignSet = new Set(selectedCoaches);

            localRooms.forEach(room => {
                const occupantsBeforeFilter = (room.occupants || []);
                const occupantsAfterFilter = occupantsBeforeFilter.filter(coachId => !coachesToUnassignSet.has(coachId));
                if (occupantsBeforeFilter.length !== occupantsAfterFilter.length) {
                    updatePromises.push(base44.entities.Room.update(room.id, { occupants: occupantsAfterFilter }));
                }
            });

            await Promise.all(updatePromises); // Wait for all unassignments to complete

            // Then, create the new room with the selected coaches
            createRoomMutation.mutate({
                room_number: newRoomNumber,
                hotel: defaultHotel,
                room_type: '2 Beds',
                cost_per_night: 0,
                nights: 0,
                occupants: selectedCoaches
            });
            // The onSuccess of createRoomMutation will invalidate queries and clear selectedCoaches
        } catch (error) {
            console.error('Error creating room for selected coaches:', error);
            queryClient.invalidateQueries({ queryKey: ['rooms'] }); // Ensure state is fresh even on error
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
            setSelectedCoaches([]); // Clear selection to avoid stale state
        }
    };

    const handleToggleCoachSelection = (coachId) => {
        setSelectedCoaches(prev => {
            if (prev.includes(coachId)) {
                return prev.filter(id => id !== coachId);
            } else {
                return [...prev, coachId];
            }
        });
    };

    const assignedCoachesSet = useMemo(() => {
        const assigned = new Set();
        localRooms.forEach(room => {
            (room.occupants || []).forEach(coachId => assigned.add(coachId));
        });
        return assigned;
    }, [localRooms]);

    const coachesForGroupSelection = useMemo(() => {
        return coaches.filter(c => !assignedCoachesSet.has(c.id));
    }, [coaches, assignedCoachesSet]);

    const coachesForIndividualAssignment = useMemo(() => {
        // Filter out coaches already selected for group assignment too
        return coachesForGroupSelection.filter(c => !selectedCoaches.includes(c.id));
    }, [coachesForGroupSelection, selectedCoaches]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Room Assignments - {tournament.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {coachesForGroupSelection.length > 0 && (
                        <Card className="bg-blue-50 border-blue-200">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-sm">
                                        Unassigned Coaches ({coachesForGroupSelection.length})
                                        {selectedCoaches.length > 0 && ` - ${selectedCoaches.length} selected`}
                                    </CardTitle>
                                    {selectedCoaches.length >= 2 && (
                                        <Button
                                            size="sm"
                                            onClick={handleRoomSelectedCoachesTogether}
                                            className="bg-blush-800 hover:bg-blush-800/90 text-black"
                                            disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
                                        >
                                            <Users className="w-4 h-4 mr-2" />
                                            Room Together
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <p className="text-xs text-gray-600 mb-3">Select 2 or more coaches to room together, then click "Room Together"</p>
                                <div className="space-y-2">
                                    {coachesForGroupSelection.map(coach => (
                                        <div
                                            key={coach.id}
                                            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                                                selectedCoaches.includes(coach.id)
                                                    ? 'bg-blush-100 border-2 border-blush-800'
                                                    : 'bg-white hover:bg-gray-50'
                                            }`}
                                            onClick={() => handleToggleCoachSelection(coach.id)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedCoaches.includes(coach.id)}
                                                onChange={() => {}} // onChange is required for controlled components, but click handler on div handles logic
                                                className="w-4 h-4 cursor-pointer"
                                            />
                                            <div className="flex-1">
                                                <span className="font-medium">{coach.coach_name}</span>
                                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    coach.gender === 'Male' ? 'bg-blue-100 text-blue-800' :
                                                    coach.gender === 'Female' ? 'bg-pink-100 text-pink-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {coach.gender || 'Not Set'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex gap-2">
                        <Input
                            placeholder="Room Number"
                            value={newRoomNumber}
                            onChange={e => setNewRoomNumber(e.target.value)}
                            className="w-32"
                        />
                        <Input
                            placeholder="Hotel Name"
                            value={newHotel}
                            onChange={e => setNewHotel(e.target.value)}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleAddRoom}
                            disabled={createRoomMutation.isPending || updateRoomMutation.isPending || !newRoomNumber || !newHotel}
                            variant="outline"
                        >
                            <Hotel className="w-4 h-4 mr-2" />
                            Add Empty Room
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {localRooms.map(room => {
                            const roomCoaches = coaches.filter(c => (room.occupants || []).includes(c.id));
                            return (
                                <Card key={room.id}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-base">
                                                Room {room.room_number} - {room.hotel}
                                            </CardTitle>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteRoomMutation.mutate(room.id)}
                                                disabled={deleteRoomMutation.isPending}
                                            >
                                                Remove Room
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2 pt-2">
                                        {roomCoaches.length === 0 && <p className="text-sm text-gray-500">No coaches assigned to this room yet.</p>}
                                        {roomCoaches.map(coach => (
                                            <div key={coach.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                <div>
                                                    <span className="font-medium">{coach.coach_name}</span>
                                                    <span className="text-sm text-gray-500 ml-2">({coach.gender || 'Not Set'})</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleUnassignCoach(room.id, coach.id)}
                                                    disabled={updateRoomMutation.isPending}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        ))}

                                        {coachesForIndividualAssignment.length > 0 && (
                                            <Select onValueChange={(coachId) => handleAssignCoach(room.id, coachId)}>
                                                <SelectTrigger disabled={createRoomMutation.isPending || updateRoomMutation.isPending}>
                                                    <SelectValue placeholder="+ Assign coach to this room" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {coachesForIndividualAssignment.map(coach => (
                                                        <SelectItem key={coach.id} value={coach.id}>
                                                            {coach.coach_name} ({coach.gender || 'Not Set'})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {coachesForIndividualAssignment.length === 0 && coachesForGroupSelection.length === 0 && roomCoaches.length === coaches.length && (
                                            <p className="text-sm text-gray-500">All available coaches are already assigned.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {localRooms.length === 0 && coachesForGroupSelection.length === 0 && (
                            <p className="text-center text-gray-500 py-8">All coaches are assigned to rooms. Or, no coaches need travel for this tournament.</p>
                        )}
                        {localRooms.length === 0 && coachesForGroupSelection.length > 0 && (
                            <p className="text-center text-gray-500 py-8">No rooms yet. Select coaches above to room them together, or add an empty room manually.</p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={onClose}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}