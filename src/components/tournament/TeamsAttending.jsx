
import { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Users, Plane, Hotel, CheckCircle2, Edit, Trash2, UserPlus, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeamsAttending({ tournamentId, tournament }) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isTeamModalOpen, setTeamModalOpen] = useState(false);
    const [isCoachModalOpen, setCoachModalOpen] = useState(false);
    const [editingTournamentTeam, setEditingTournamentTeam] = useState(null);
    const [selectedTournamentTeam, setSelectedTournamentTeam] = useState(null);
    const [selectedTeamIds, setSelectedTeamIds] = useState([]);
    const [newTournamentTeam, setNewTournamentTeam] = useState({ 
        team_id: '', 
        age_division_playing: '', 
        team_location: '',
        roster_url: '', 
        registration_status: 'Registered',
        notes: '' 
    });
    const [newCoach, setNewCoach] = useState({ 
        coach_name: '', 
        gender: 'Male', 
        preferred_airport: '', // Added preferred_airport
        flight_confirmation: '', 
        hotel_confirmation: '', 
        rooming_notes: '', 
        notes: '' 
    });

    const { data: tournamentTeams, isLoading: isLoadingTournamentTeams } = useQuery({
        queryKey: ['tournamentTeams', tournamentId],
        queryFn: () => base44.entities.TournamentTeam.filter({ tournament_id: tournamentId }),
        enabled: !!tournamentId,
    });

    const { data: allTeams } = useQuery({
        queryKey: ['allTeams'],
        queryFn: () => base44.entities.Team.list(),
    });

    const { data: allCoaches, isLoading: isLoadingCoaches } = useQuery({
        queryKey: ['allCoaches', tournamentId],
        queryFn: async () => {
            // Only get coaches for THIS specific tournament
            const coachesForTournament = await base44.entities.CoachTravel.filter({ tournament_id: tournamentId });
            return coachesForTournament.sort((a, b) => a.coach_name.localeCompare(b.coach_name));
        },
        enabled: !!tournamentId,
    });

    // Separate query for ALL coaches (including team-level ones with no tournament) for duplication
    const { data: allCoachesGlobal } = useQuery({
        queryKey: ['allCoachesGlobal'],
        queryFn: () => base44.entities.CoachTravel.list(),
    });

    const { data: league } = useQuery({
        queryKey: ['league', tournament?.league_id],
        queryFn: () => base44.entities.League.get(tournament.league_id),
        enabled: !!tournament?.league_id,
    });

    const getCoachesForTeam = (teamId) => {
        // Get coaches for this specific team (allCoaches is already filtered by tournament)
        return allCoaches?.filter(c => c.team_id === teamId) || [];
    };

    const getTeamInfo = (teamId) => {
        return allTeams?.find(t => t.id === teamId);
    };

    const handleOpenTeamModal = (tournamentTeam = null) => {
        if (tournamentTeam) {
            setEditingTournamentTeam(tournamentTeam);
            setSelectedTeamIds([tournamentTeam.team_id]);
            setNewTournamentTeam({
                team_id: tournamentTeam.team_id,
                age_division_playing: tournamentTeam.age_division_playing || '',
                team_location: tournamentTeam.team_location || '',
                roster_url: tournamentTeam.roster_url || '',
                registration_status: tournamentTeam.registration_status || 'Registered',
                notes: tournamentTeam.notes || ''
            });
        } else {
            setEditingTournamentTeam(null);
            setSelectedTeamIds([]);
            setNewTournamentTeam({
                team_id: '',
                age_division_playing: tournament?.age_division_focus || '',
                team_location: tournament?.location || '',
                roster_url: '',
                registration_status: 'Registered',
                notes: ''
            });
        }
        setTeamModalOpen(true);
    };

    const handleCloseTeamModal = () => {
        setTeamModalOpen(false);
        setEditingTournamentTeam(null);
        setSelectedTeamIds([]);
        setNewTournamentTeam({
            team_id: '',
            age_division_playing: '',
            team_location: '',
            roster_url: '',
            registration_status: 'Registered',
            notes: ''
        });
    };

    const handleOpenCoachModal = (tournamentTeam) => {
        setSelectedTournamentTeam(tournamentTeam);
        setNewCoach({ 
            coach_name: '', 
            gender: 'Male', 
            preferred_airport: '', // Added preferred_airport
            flight_confirmation: '', 
            hotel_confirmation: '', 
            rooming_notes: '', 
            notes: '' 
        });
        setCoachModalOpen(true);
    };

    const handleCloseCoachModal = () => {
        setCoachModalOpen(false);
        setSelectedTournamentTeam(null);
        setNewCoach({ 
            coach_name: '', 
            gender: 'Male', 
            preferred_airport: '', // Added preferred_airport
            flight_confirmation: '', 
            hotel_confirmation: '', 
            rooming_notes: '', 
            notes: '' 
        });
    };

    const tournamentTeamMutation = useMutation({
        mutationFn: async (data) => {
            if (editingTournamentTeam) {
                // Update single team
                const tournamentTeamData = {
                    ...data,
                    tournament_id: tournamentId
                };
                return base44.entities.TournamentTeam.update(editingTournamentTeam.id, tournamentTeamData);
            } else {
                // Create multiple teams
                const teamsToCreate = selectedTeamIds.map(teamId => ({
                    tournament_id: tournamentId,
                    team_id: teamId,
                    age_division_playing: data.age_division_playing,
                    team_location: data.team_location,
                    roster_url: data.roster_url,
                    registration_status: data.registration_status,
                    notes: data.notes
                }));
                
                // Create the tournament teams
                const createdTeams = await base44.entities.TournamentTeam.bulkCreate(teamsToCreate);
                
                // For each new team, check if there are existing coach records from team management
                // and create fresh CoachTravel records for THIS tournament
                for (const teamId of selectedTeamIds) {
                    // Find coach records for this team from team management (tournament_id is null) or other tournaments
                    const existingCoachRecords = allCoachesGlobal?.filter(c => c.team_id === teamId) || [];
                    
                    // Get unique coach names
                    const uniqueCoachNames = [...new Set(existingCoachRecords.map(c => c.coach_name))];
                    
                    // Create fresh coach records for this tournament with reset costs
                    for (const coachName of uniqueCoachNames) {
                        const existingRecord = existingCoachRecords.find(c => c.coach_name === coachName);
                        
                        await base44.entities.CoachTravel.create({
                            tournament_id: tournamentId,
                            team_id: teamId,
                            coach_name: coachName,
                            gender: existingRecord?.gender || '',
                            preferred_airport: existingRecord?.preferred_airport || '', // Preserve preferred_airport
                            flight_booked: false,
                            hotel_booked: false,
                            travel_complete: false,
                            attendance_confirmed: false, // Default to false for new tournament coaches
                            flight_confirmation: '',
                            hotel_confirmation: '',
                            flight_cost: 0,  // Always reset to 0 for new tournament
                            hotel_cost: 0,   // Always reset to 0 for new tournament
                            rooming_notes: '',
                            notes: ''
                        });
                    }
                }
                
                return createdTeams;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tournamentTeams', tournamentId] });
            queryClient.invalidateQueries({ queryKey: ['allCoaches', tournamentId] });
            queryClient.invalidateQueries({ queryKey: ['allCoachesGlobal'] });
            handleCloseTeamModal();
        }
    });

    const coachMutation = useMutation({
        mutationFn: (coachData) => {
            const teamInfo = tournamentTeams?.find(tt => tt.id === selectedTournamentTeam.id);
            return base44.entities.CoachTravel.create({
                ...coachData,
                tournament_id: tournamentId,
                team_id: teamInfo.team_id,
                flight_cost: 0,  // Reset costs for new tournament
                hotel_cost: 0,   // Reset costs for new tournament
                flight_booked: false,
                hotel_booked: false,
                travel_complete: false, // Default to false for newly added coaches
                attendance_confirmed: false, // Default to false for newly added coaches
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allCoaches', tournamentId] }); // Invalidate allCoaches for this tournament
            handleCloseCoachModal();
        }
    });

    const deleteTournamentTeamMutation = useMutation({
        mutationFn: (tournamentTeamId) => base44.entities.TournamentTeam.delete(tournamentTeamId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tournamentTeams', tournamentId] });
        }
    });

    const deleteCoachMutation = useMutation({
        mutationFn: (coachId) => base44.entities.CoachTravel.delete(coachId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allCoaches', tournamentId] }); // Invalidate allCoaches for this tournament
        }
    });

    const toggleCoachBookingMutation = useMutation({
        mutationFn: ({ coachId, field, value }) => {
            // Ensure tournament_id is set when toggling
            return base44.entities.CoachTravel.update(coachId, { 
                [field]: value,
                tournament_id: tournamentId // Always ensure tournament_id is set
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allCoaches', tournamentId] }); // Invalidate allCoaches for this tournament
        }
    });

    const handleSaveTournamentTeam = () => {
        if (editingTournamentTeam) {
            // Editing existing team
            if (newTournamentTeam.team_id) {
                tournamentTeamMutation.mutate(newTournamentTeam);
            }
        } else {
            // Adding new teams
            if (selectedTeamIds.length > 0) {
                tournamentTeamMutation.mutate(newTournamentTeam);
            }
        }
    };

    const handleSaveCoach = () => {
        if (newCoach.coach_name) {
            coachMutation.mutate(newCoach);
        }
    };

    const toggleTeamSelection = (teamId) => {
        setSelectedTeamIds(prev => {
            if (prev.includes(teamId)) {
                return prev.filter(id => id !== teamId);
            } else {
                return [...prev, teamId];
            }
        });
    };

    const getLocationBadgeColor = (location) => {
        if (location === 'North') return 'bg-yellow-400 text-yellow-900'; // Gold
        if (location === 'West') return 'bg-emerald-700 text-white'; // Dark Green
        return 'bg-gray-200 text-gray-700'; // Default gray
    };

    if (isLoadingTournamentTeams || isLoadingCoaches) {
        return <Skeleton className="h-60 w-full" />;
    }

    const availableTeams = allTeams?.filter(team => {
        const alreadyAdded = tournamentTeams?.some(tt => tt.team_id === team.id);
        return !alreadyAdded || (editingTournamentTeam && editingTournamentTeam.team_id === team.id);
    });

    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="flex items-center gap-2"><Users /> Teams Attending</CardTitle>
                <Button 
                    size="sm" 
                    onClick={() => handleOpenTeamModal()} 
                    className="bg-blush-800 hover:bg-blush-800/90"
                    style={{ color: 'black' }}
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Team
                </Button>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {tournamentTeams?.map(tournamentTeam => {
                        const teamInfo = getTeamInfo(tournamentTeam.team_id);
                        const coaches = getCoachesForTeam(tournamentTeam.team_id);
                        const allBooked = coaches.length > 0 && coaches.every(c => c.travel_complete);
                        
                        if (!teamInfo) return null;

                        return (
                            <AccordionItem value={tournamentTeam.id} key={tournamentTeam.id}>
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{teamInfo.name}</span>
                                            {teamInfo.organization && (
                                                <span className="text-sm text-gray-500">({teamInfo.organization})</span>
                                            )}
                                            {teamInfo.club_location && (
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getLocationBadgeColor(teamInfo.club_location)}`}>
                                                    {teamInfo.club_location}
                                                </span>
                                            )}
                                            {tournamentTeam.age_division_playing && (
                                                <span className="text-sm text-gray-500">- {tournamentTeam.age_division_playing}</span>
                                            )}
                                        </div>
                                        {allBooked && <CheckCircle2 className="w-5 h-5 text-sage-800" />}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="font-medium">Registration:</span> {tournamentTeam.registration_status}
                                        </div>
                                        <div>
                                            <span className="font-medium">Age Division:</span> {tournamentTeam.age_division_playing || 'Not Set'}
                                        </div>
                                        <div className="col-span-2">
                                            <span className="font-medium">Team Location:</span> {tournamentTeam.team_location || tournament?.location || 'Not Set'}
                                        </div>
                                        {tournamentTeam.roster_url && (
                                            <div className="col-span-2">
                                                <span className="font-medium">Roster:</span>{' '}
                                                <a href={tournamentTeam.roster_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                    View
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center mb-3 pt-2 border-t">
                                        <h4 className="font-semibold text-sm">Coaches ({coaches.length})</h4>
                                        <Button size="sm" variant="outline" onClick={() => handleOpenCoachModal(tournamentTeam)}>
                                            <UserPlus className="w-3 h-3 mr-1" /> Add Coach
                                        </Button>
                                    </div>
                                    
                                    {coaches.length === 0 && (
                                        <p className="text-sm text-gray-500 italic">No coaches assigned to this team yet. Add coaches in Teams or Coaches Management.</p>
                                    )}
                                    
                                    {coaches.map(coach => (
                                        <div key={coach.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium">{coach.coach_name}</p>
                                                        {coach.attendance_confirmed && (
                                                            <UserCheck className="w-4 h-4 text-green-600" title="Attendance Confirmed" />
                                                        )}
                                                    </div>
                                                    {coach.gender && (
                                                        <p className="text-xs text-gray-500">{coach.gender}</p>
                                                    )}
                                                    {coach.preferred_airport && (
                                                        <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                                                            <Plane className="w-3 h-3" />
                                                            Airport: {coach.preferred_airport}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6" 
                                                    onClick={() => deleteCoachMutation.mutate(coach.id)}
                                                >
                                                    <Trash2 className="h-3 w-3 text-red-400 hover:text-red-600"/>
                                                </Button>
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-4">
                                                <div className="flex items-center space-x-2">
                                                    <UserCheck className="w-4 h-4 text-blue-600" />
                                                    <Label htmlFor={`confirmed-${coach.id}`} className="text-sm">Confirmed</Label>
                                                    <Switch 
                                                        id={`confirmed-${coach.id}`} 
                                                        checked={coach.attendance_confirmed} 
                                                        onCheckedChange={(checked) => toggleCoachBookingMutation.mutate({ 
                                                            coachId: coach.id, 
                                                            field: 'attendance_confirmed', 
                                                            value: checked 
                                                        })} 
                                                    />
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Plane className="w-4 h-4 text-blush-800" />
                                                    <Label htmlFor={`flight-${coach.id}`} className="text-sm">Flight</Label>
                                                    <Switch 
                                                        id={`flight-${coach.id}`} 
                                                        checked={coach.flight_booked} 
                                                        onCheckedChange={(checked) => toggleCoachBookingMutation.mutate({ 
                                                            coachId: coach.id, 
                                                            field: 'flight_booked', 
                                                            value: checked 
                                                        })} 
                                                    />
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Hotel className="w-4 h-4 text-sage-800" />
                                                    <Label htmlFor={`hotel-${coach.id}`} className="text-sm">Hotel</Label>
                                                    <Switch 
                                                        id={`hotel-${coach.id}`} 
                                                        checked={coach.hotel_booked} 
                                                        onCheckedChange={(checked) => toggleCoachBookingMutation.mutate({ 
                                                            coachId: coach.id, 
                                                            field: 'hotel_booked', 
                                                            value: checked 
                                                        })} 
                                                    />
                                                </div>
                                            </div>
                                            
                                            {coach.flight_confirmation && (
                                                <p className="text-xs text-gray-600">Flight Confirmation: {coach.flight_confirmation}</p>
                                            )}
                                            {coach.hotel_confirmation && (
                                                <p className="text-xs text-gray-600">Hotel Confirmation: {coach.hotel_confirmation}</p>
                                            )}
                                            {coach.rooming_notes && (
                                                <p className="text-xs italic text-blue-600">Rooming: {coach.rooming_notes}</p>
                                            )}
                                            {coach.notes && (
                                                <p className="text-xs italic text-gray-500">{coach.notes}</p>
                                            )}
                                        </div>
                                    ))}

                                    {tournamentTeam.notes && (
                                        <div className="mt-3 p-2 bg-blue-50 rounded">
                                            <p className="text-sm"><strong>Team Notes:</strong> {tournamentTeam.notes}</p>
                                        </div>
                                    )}
                                    
                                    <div className="flex gap-2 justify-end pt-2">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenTeamModal(tournamentTeam)}>
                                            <Edit className="w-3 h-3 mr-1"/> Edit Registration
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => deleteTournamentTeamMutation.mutate(tournamentTeam.id)}>
                                            <Trash2 className="w-3 h-3 mr-1"/> Remove Team
                                        </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                    {tournamentTeams?.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>No teams registered yet. Add teams from your roster.</p>
                        </div>
                    )}
                </Accordion>
            </CardContent>

            {/* Team Registration Modal */}
            <Dialog open={isTeamModalOpen} onOpenChange={handleCloseTeamModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className='text-black'>
                            {editingTournamentTeam ? 'Edit Team Registration' : 'Register Teams for Tournament'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTournamentTeam 
                                ? 'Update team registration details' 
                                : 'Select one or more teams from your roster to register for this tournament. Coaches assigned to the teams will automatically appear.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {editingTournamentTeam ? (
                            <div>
                                <Label htmlFor="team_id">Team*</Label>
                                <Select 
                                    value={newTournamentTeam.team_id} 
                                    onValueChange={val => setNewTournamentTeam({...newTournamentTeam, team_id: val})}
                                    disabled={true}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a team..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTeams?.map(team => (
                                            <SelectItem key={team.id} value={team.id}>
                                                {team.name} {team.organization && `(${team.organization})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div>
                                <Label>Select Teams* ({selectedTeamIds.length} selected)</Label>
                                <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                                    {availableTeams?.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">All teams have been added to this tournament</p>
                                    ) : (
                                        availableTeams?.map(team => (
                                            <div key={team.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                                <Checkbox
                                                    id={`team-${team.id}`}
                                                    checked={selectedTeamIds.includes(team.id)}
                                                    onCheckedChange={() => toggleTeamSelection(team.id)}
                                                />
                                                <Label 
                                                    htmlFor={`team-${team.id}`} 
                                                    className="flex-1 cursor-pointer font-normal"
                                                >
                                                    {team.name} {team.organization && <span className="text-gray-500">({team.organization})</span>}
                                                    {team.club_location && (
                                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${getLocationBadgeColor(team.club_location)}`}>
                                                            {team.club_location}
                                                        </span>
                                                    )}
                                                </Label>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                        {league?.age_divisions && league.age_divisions.length > 0 && (
                            <div>
                                <Label htmlFor="age_division_playing">Age Division Playing</Label>
                                <Select 
                                    value={newTournamentTeam.age_division_playing} 
                                    onValueChange={val => setNewTournamentTeam({...newTournamentTeam, age_division_playing: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select age division..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {league.age_divisions.map(div => (
                                            <SelectItem key={div} value={div}>{div}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="team_location">Team Playing Location*</Label>
                            <Input 
                                id="team_location" 
                                value={newTournamentTeam.team_location} 
                                onChange={e => setNewTournamentTeam({...newTournamentTeam, team_location: e.target.value})}
                                placeholder={tournament?.location || "e.g., OMNI, RR Shadelands - Field 3"}
                            />
                            <p className="text-xs text-gray-500 mt-1">Specific venue/field where this team will play at this tournament</p>
                        </div>
                        <div>
                            <Label htmlFor="registration_status">Registration Status</Label>
                            <Select 
                                value={newTournamentTeam.registration_status} 
                                onValueChange={val => setNewTournamentTeam({...newTournamentTeam, registration_status: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Registered">Registered</SelectItem>
                                    <SelectItem value="Waitlisted">Waitlisted</SelectItem>
                                    <SelectItem value="Paid">Paid</SelectItem>
                                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="roster_url">Roster URL (Optional)</Label>
                            <Input 
                                id="roster_url" 
                                value={newTournamentTeam.roster_url} 
                                onChange={e => setNewTournamentTeam({...newTournamentTeam, roster_url: e.target.value})}
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <Label htmlFor="team_notes">Notes (Optional)</Label>
                            <Textarea 
                                id="team_notes" 
                                value={newTournamentTeam.notes} 
                                onChange={e => setNewTournamentTeam({...newTournamentTeam, notes: e.target.value})} 
                                placeholder="Notes about these teams' participation in this tournament"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseTeamModal}>Cancel</Button>
                        <Button 
                            onClick={handleSaveTournamentTeam} 
                            disabled={tournamentTeamMutation.isPending || (!editingTournamentTeam && selectedTeamIds.length === 0) || (editingTournamentTeam && !newTournamentTeam.team_id)}
                        >
                            {tournamentTeamMutation.isPending ? 'Saving...' : (editingTournamentTeam ? 'Update Registration' : `Register ${selectedTeamIds.length} Team${selectedTeamIds.length !== 1 ? 's' : ''}`)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Coach Modal */}
            <Dialog open={isCoachModalOpen} onOpenChange={handleCloseCoachModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Coach</DialogTitle>
                        <DialogDescription>
                            Add an additional coach for this tournament. To permanently add coaches to a team, use Teams Management or Coaches Management.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="coachName">Coach Name*</Label>
                            <Input 
                                id="coachName" 
                                value={newCoach.coach_name} 
                                onChange={e => setNewCoach({...newCoach, coach_name: e.target.value})} 
                                placeholder="e.g., Sarah Johnson"
                            />
                        </div>
                        <div>
                            <Label htmlFor="gender">Gender*</Label>
                            <Select 
                                value={newCoach.gender} 
                                onValueChange={val => setNewCoach({...newCoach, gender: val})}
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
                            <Label htmlFor="preferredAirport">Preferred Airport</Label>
                            <Input 
                                id="preferredAirport" 
                                value={newCoach.preferred_airport} 
                                onChange={e => setNewCoach({...newCoach, preferred_airport: e.target.value})} 
                                placeholder="e.g., SFO, OAK, SJC"
                            />
                        </div>
                        <div>
                            <Label htmlFor="flightConf">Flight Confirmation #</Label>
                            <Input 
                                id="flightConf" 
                                value={newCoach.flight_confirmation} 
                                onChange={e => setNewCoach({...newCoach, flight_confirmation: e.target.value})} 
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <Label htmlFor="hotelConf">Hotel Confirmation #</Label>
                            <Input 
                                id="hotelConf" 
                                value={newCoach.hotel_confirmation} 
                                onChange={e => setNewCoach({...newCoach, hotel_confirmation: e.target.value})} 
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <Label htmlFor="roomingNotes">Rooming Notes</Label>
                            <Textarea 
                                id="roomingNotes" 
                                value={newCoach.rooming_notes} 
                                onChange={e => setNewCoach({...newCoach, rooming_notes: e.target.value})} 
                                placeholder="e.g., Single room preferred, or prefers to room with Jane Doe"
                            />
                        </div>
                        <div>
                            <Label htmlFor="coachNotes">General Notes</Label>
                            <Textarea 
                                id="coachNotes" 
                                value={newCoach.notes} 
                                onChange={e => setNewCoach({...newCoach, notes: e.target.value})} 
                                placeholder="Optional notes about this coach's travel"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseCoachModal}>Cancel</Button>
                        <Button onClick={handleSaveCoach} disabled={coachMutation.isPending || !newCoach.coach_name}>
                            {coachMutation.isPending ? 'Adding...' : 'Add Coach'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
