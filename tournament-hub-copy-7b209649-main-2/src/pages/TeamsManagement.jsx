
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Users, Trash2, Edit, X, Filter } from "lucide-react";

export default function TeamsManagement() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [newTeam, setNewTeam] = useState({ name: '', organization: 'Academy Boys', club_location: '', home_city: '', notes: '' });
    const [teamCoaches, setTeamCoaches] = useState([]);
    const [newCoachName, setNewCoachName] = useState('');
    
    // Filter states
    const [locationFilter, setLocationFilter] = useState('all');
    const [ageFilter, setAgeFilter] = useState('all');

    const { data: teams, isLoading } = useQuery({
        queryKey: ['allTeams'],
        queryFn: async () => {
            const allTeams = await base44.entities.Team.list('-created_date');
            
            // Sort teams by age (youngest to oldest)
            return allTeams.sort((a, b) => {
                const extractAge = (name) => {
                    // Look for patterns like "12U", "14-1", "18U", "U13", etc.
                    const match = name.match(/\b(\d{1,2})[U\-\s]/i) || name.match(/U(\d{1,2})\b/i);
                    return match ? parseInt(match[1]) : 999; // 999 for teams without age, puts them at the end
                };
                
                const ageA = extractAge(a.name);
                const ageB = extractAge(b.name);
                
                return ageA - ageB; // Ascending order (youngest first)
            });
        },
    });

    const { data: allCoaches } = useQuery({
        queryKey: ['allCoaches'],
        queryFn: () => base44.entities.CoachTravel.list(),
    });

    // Extract unique age divisions from team names
    const availableAges = useMemo(() => {
        if (!teams) return [];
        const ages = new Set();
        teams.forEach(team => {
            const match = team.name.match(/\b(\d{1,2})[U\-\s]/i) || team.name.match(/U(\d{1,2})\b/i);
            if (match) {
                ages.add(`${match[1]}U`);
            }
        });
        return Array.from(ages).sort((a, b) => parseInt(a) - parseInt(b));
    }, [teams]);

    // Apply filters to teams
    const filteredTeams = useMemo(() => {
        if (!teams) return [];
        
        return teams.filter(team => {
            // Location filter
            const locationMatch = locationFilter === 'all' || team.club_location === locationFilter;
            
            // Age filter
            let ageMatch = true;
            if (ageFilter !== 'all') {
                const teamAgeMatch = team.name.match(/\b(\d{1,2})[U\-\s]/i) || team.name.match(/U(\d{1,2})\b/i);
                const teamAge = teamAgeMatch ? `${teamAgeMatch[1]}U` : null;
                ageMatch = teamAge === ageFilter;
            }
            
            return locationMatch && ageMatch;
        });
    }, [teams, locationFilter, ageFilter]);

    // Group filtered teams by organization
    const teamsByOrganization = useMemo(() => {
        if (!filteredTeams) return {};
        
        const grouped = {
            'Academy Boys': [],
            'Academy Girls': [],
            'Academy Girls Elite': [],
            'Other': [] // Catch-all for organizations not explicitly listed
        };

        filteredTeams.forEach(team => {
            const org = team.organization || 'Other';
            if (grouped[org]) {
                grouped[org].push(team);
            } else {
                // If a new organization is found, add it, but for simplicity
                // and consistency with the dropdown, we'll put new/unrecognized
                // ones into 'Other'.
                grouped['Other'].push(team);
            }
        });

        // Ensure order for display and remove empty groups
        const orderedKeys = ['Academy Boys', 'Academy Girls', 'Academy Girls Elite', 'Other'];
        const finalGrouped = {};
        orderedKeys.forEach(key => {
            if (grouped[key] && grouped[key].length > 0) {
                finalGrouped[key] = grouped[key];
            }
        });

        return finalGrouped;
    }, [filteredTeams]);

    const createTeamMutation = useMutation({
        mutationFn: async (teamData) => {
            let targetTeamId;

            if (editingTeam) {
                // If we're editing, always update the current editingTeam
                await base44.entities.Team.update(editingTeam.id, teamData);
                targetTeamId = editingTeam.id;
            } else {
                // If adding a new team, check for duplicates by name
                const existingTeam = teams?.find(t => 
                    t.name.toLowerCase().trim() === teamData.name.toLowerCase().trim()
                );
                
                if (existingTeam) {
                    // Update the existing team instead of creating a new one
                    await base44.entities.Team.update(existingTeam.id, teamData);
                    targetTeamId = existingTeam.id;
                } else {
                    // Create new team if no match found
                    const newTeam = await base44.entities.Team.create(teamData);
                    targetTeamId = newTeam.id;
                }
            }
            return targetTeamId;
        },
        onSuccess: async (teamId) => {
            // Handle coaches
            // Get current team-level coaches from the database for the *effective* teamId
            const currentDbTeamCoaches = allCoaches?.filter(c => c.team_id === teamId && c.tournament_id === null) || [];
            const currentDbCoachNames = new Set(currentDbTeamCoaches.map(c => c.coach_name));

            // Determine which coaches to DELETE from the database
            // These are coaches currently in the DB for this team, but NOT in the new `teamCoaches` state
            const coachesToDelete = currentDbTeamCoaches.filter(
                (dbCoach) => !teamCoaches.includes(dbCoach.coach_name)
            );
            await Promise.all(coachesToDelete.map(c => base44.entities.CoachTravel.delete(c.id)));

            // Determine which coaches to ADD to the database
            // These are coaches in the new `teamCoaches` state, but NOT currently in the DB
            const coachesToAdd = teamCoaches.filter(
                (stateCoachName) => !currentDbCoachNames.has(stateCoachName)
            );

            if (coachesToAdd.length > 0) {
                await Promise.all(
                    coachesToAdd.map(coachName => 
                        base44.entities.CoachTravel.create({
                            team_id: teamId,
                            tournament_id: null,
                            coach_name: coachName,
                            gender: '',
                            flight_booked: false,
                            hotel_booked: false,
                            flight_cost: 0,
                            hotel_cost: 0,
                            flight_confirmation: '',
                            hotel_confirmation: '',
                            notes: ''
                        })
                    )
                );
            }

            queryClient.invalidateQueries({ queryKey: ['allTeams'] });
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
            setAddModalOpen(false);
            setEditingTeam(null);
            setNewTeam({ name: '', organization: 'Academy Boys', club_location: '', home_city: '', notes: '' });
            setTeamCoaches([]);
        }
    });

    const deleteTeamMutation = useMutation({
        mutationFn: async (teamId) => {
            // Delete associated coaches first
            const coaches = allCoaches?.filter(c => c.team_id === teamId) || [];
            await Promise.all(coaches.map(c => base44.entities.CoachTravel.delete(c.id)));
            // Also delete associated TournamentTeam entries
            const tournamentTeams = await base44.entities.TournamentTeam.filter({ team_id: teamId });
            await Promise.all(tournamentTeams.map(tt => base44.entities.TournamentTeam.delete(tt.id)));
            return base44.entities.Team.delete(teamId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allTeams'] });
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
            queryClient.invalidateQueries({ queryKey: ['tournamentTeams'] }); // Invalidate if a team is deleted
        }
    });

    const mergeDuplicatesMutation = useMutation({
        mutationFn: async () => {
            if (!teams) return { merged: 0, deleted: 0 };
            
            // Group teams by lowercase trimmed name
            const teamGroups = new Map();
            teams.forEach(team => {
                const key = team.name.toLowerCase().trim();
                if (!teamGroups.has(key)) {
                    teamGroups.set(key, []);
                }
                teamGroups.get(key).push(team);
            });

            let mergedGroupsCount = 0;
            let deletedTeamsCount = 0;

            // Process each group of duplicate teams
            for (const [name, duplicates] of teamGroups) {
                if (duplicates.length > 1) {
                    // Sort to keep the team with most data (coaches, notes, etc.)
                    // Prioritize: 1. Coaches, 2. Notes, 3. Most recent created_date
                    duplicates.sort((a, b) => {
                        const aCoaches = allCoaches?.filter(c => c.team_id === a.id && c.tournament_id === null).length || 0;
                        const bCoaches = allCoaches?.filter(c => c.team_id === b.id && c.tournament_id === null).length || 0;
                        
                        if (aCoaches !== bCoaches) return bCoaches - aCoaches; // More coaches preferred

                        if (a.notes && !b.notes) return -1; // 'a' has notes, 'b' doesn't, prefer 'a'
                        if (b.notes && !a.notes) return 1;  // 'b' has notes, 'a' doesn't, prefer 'b'
                        
                        return new Date(b.created_date).getTime() - new Date(a.created_date).getTime(); // Most recent preferred
                    });

                    const keepTeam = duplicates[0];
                    const teamsToMerge = duplicates.slice(1);

                    // Merge each duplicate team into the kept team
                    for (const dupTeam of teamsToMerge) {
                        // Move all coach records to the kept team
                        const dupCoaches = allCoaches?.filter(c => c.team_id === dupTeam.id) || [];
                        for (const coach of dupCoaches) {
                            // Check if this coach already exists for the kept team with the same tournament_id
                            const exists = allCoaches?.some(c => 
                                c.team_id === keepTeam.id && 
                                c.tournament_id === coach.tournament_id &&
                                c.coach_name.toLowerCase().trim() === coach.coach_name.toLowerCase().trim()
                            );
                            
                            if (!exists) {
                                await base44.entities.CoachTravel.update(coach.id, { team_id: keepTeam.id });
                            } else {
                                // Delete duplicate coach record if one already exists for the kept team
                                await base44.entities.CoachTravel.delete(coach.id);
                            }
                        }

                        // Move all tournament team records to the kept team
                        const tournamentTeams = await base44.entities.TournamentTeam.filter({ team_id: dupTeam.id });
                        for (const tt of tournamentTeams) {
                            // Check if this tournament already has the kept team associated
                            const existingTT = await base44.entities.TournamentTeam.filter({
                                tournament_id: tt.tournament_id,
                                team_id: keepTeam.id
                            });
                            
                            if (existingTT.length === 0) {
                                await base44.entities.TournamentTeam.update(tt.id, { team_id: keepTeam.id });
                            } else {
                                // Delete duplicate tournament team record if one already exists
                                await base44.entities.TournamentTeam.delete(tt.id);
                            }
                        }

                        // Delete the duplicate team
                        await base44.entities.Team.delete(dupTeam.id);
                        deletedTeamsCount++;
                    }
                    mergedGroupsCount++;
                }
            }

            return { mergedGroupsCount, deletedTeamsCount };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['allTeams'] });
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
            queryClient.invalidateQueries({ queryKey: ['tournamentTeams'] }); // Invalidate tournament teams as they might have been moved
            alert(`Successfully merged ${result.mergedGroupsCount} duplicate team group(s), removing ${result.deletedTeamsCount} duplicate team(s).`);
        },
        onError: (error) => {
            alert(`Error merging duplicates: ${error.message}`);
        }
    });

    const handleOpenEditModal = (team) => {
        setEditingTeam(team);
        setNewTeam({
            name: team.name,
            organization: team.organization || 'Academy Boys',
            club_location: team.club_location || '',
            home_city: team.home_city || '',
            notes: team.notes || ''
        });
        
        // Load existing coaches for this team (only team-level coaches)
        const existingCoaches = allCoaches?.filter(c => c.team_id === team.id && c.tournament_id === null).map(c => c.coach_name) || [];
        setTeamCoaches(existingCoaches);
        setAddModalOpen(true);
    };

    const handleAddTeam = () => {
        if (newTeam.name) {
            createTeamMutation.mutate(newTeam);
        }
    };

    const handleAddCoach = () => {
        if (newCoachName.trim() && teamCoaches.length < 5 && !teamCoaches.includes(newCoachName.trim())) {
            setTeamCoaches([...teamCoaches, newCoachName.trim()]);
            setNewCoachName('');
        }
    };

    const handleRemoveCoach = (index) => {
        setTeamCoaches(teamCoaches.filter((_, i) => i !== index));
    };

    const getCoachesForTeam = (teamId) => {
        // Filter coaches that are associated with this team and have no tournament_id
        // This ensures we only show coaches linked at the team level in this view.
        return allCoaches?.filter(c => c.team_id === teamId && c.tournament_id === null) || [];
    };

    const getLocationBadgeColor = (location) => {
        if (location === 'North') return 'bg-yellow-400 text-yellow-900';
        if (location === 'West') return 'bg-emerald-700 text-white';
        return 'bg-gray-200 text-gray-700';
    };

    // New sub-component for rendering a team row
    const TeamRow = ({ team }) => {
        const coaches = getCoachesForTeam(team.id);
        return (
            <TableRow key={team.id}>
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell>
                    {team.club_location ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getLocationBadgeColor(team.club_location)}`}>
                            {team.club_location}
                        </span>
                    ) : '-'}
                </TableCell>
                <TableCell>
                    {coaches.length > 0 ? (
                        <div className="space-y-1">
                            {coaches.map(coach => (
                                <div key={coach.id} className="text-sm">{coach.coach_name}</div>
                            ))}
                        </div>
                    ) : (
                        <span className="text-gray-400 text-sm">No coaches</span>
                    )}
                </TableCell>
                <TableCell>{team.home_city || '-'}</TableCell>
                <TableCell className="max-w-xs truncate">{team.notes || '-'}</TableCell>
                <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditModal(team)}
                        >
                            <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`)) {
                                    deleteTeamMutation.mutate(team.id);
                                }
                            }}
                            disabled={deleteTeamMutation.isPending}
                        >
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Teams Management</h1>
                    <p className="text-gray-500 mt-1">Manage your global team roster</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={() => {
                            if (confirm('This will find and merge all teams with duplicate names. The team with the most coaches and additional data will be kept, and all associated records (coaches, tournament entries) will be moved to the kept team. This action cannot be undone. Continue?')) {
                                mergeDuplicatesMutation.mutate();
                            }
                        }}
                        variant="outline"
                        disabled={mergeDuplicatesMutation.isPending}
                        className="text-black"
                    >
                        {mergeDuplicatesMutation.isPending ? 'Merging...' : 'Merge Duplicates'}
                    </Button>
                    <Button 
                        onClick={() => {
                            setEditingTeam(null);
                            setNewTeam({ name: '', organization: 'Academy Boys', club_location: '', home_city: '', notes: '' });
                            setTeamCoaches([]);
                            setNewCoachName('');
                            setAddModalOpen(true);
                        }} 
                        className="bg-blush-800 hover:bg-blush-800/90 text-black"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Team
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Filters:</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Label htmlFor="location-filter" className="text-sm">Location:</Label>
                            <Select value={locationFilter} onValueChange={setLocationFilter}>
                                <SelectTrigger id="location-filter" className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Locations</SelectItem>
                                    <SelectItem value="North">North</SelectItem>
                                    <SelectItem value="West">West</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Label htmlFor="age-filter" className="text-sm">Age:</Label>
                            <Select value={ageFilter} onValueChange={setAgeFilter}>
                                <SelectTrigger id="age-filter" className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Ages</SelectItem>
                                    {availableAges.map(age => (
                                        <SelectItem key={age} value={age}>{age}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {(locationFilter !== 'all' || ageFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setLocationFilter('all');
                                    setAgeFilter('all');
                                }}
                                className="text-sm"
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {isLoading && (
                <Card className="mb-4">
                    <CardContent className="py-8 text-center">Loading teams...</CardContent>
                </Card>
            )}

            {!isLoading && filteredTeams?.length === 0 && (
                <Card className="mb-4">
                    <CardContent className="py-8 text-center text-gray-500">
                        {teams?.length === 0 
                            ? 'No teams added yet. Add your first team to get started.'
                            : 'No teams match the selected filters.'}
                    </CardContent>
                </Card>
            )}

            {!isLoading && filteredTeams?.length > 0 && (
                <Accordion type="multiple" defaultValue={[]} className="space-y-4">
                    {Object.entries(teamsByOrganization).map(([organization, orgTeams]) => {
                        if (orgTeams.length === 0) return null; // Don't render empty organizations
                        
                        return (
                            <AccordionItem key={organization} value={organization} className="border rounded-lg bg-white shadow-sm">
                                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-blush-800" />
                                        <div className="text-left">
                                            <h3 className="text-lg font-bold">{organization}</h3>
                                            <p className="text-sm text-gray-500">{orgTeams.length} team{orgTeams.length !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Team Name</TableHead>
                                                <TableHead>Location</TableHead>
                                                <TableHead>Coaches</TableHead>
                                                <TableHead>Home City</TableHead>
                                                <TableHead>Notes</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {orgTeams.map(team => (
                                                <TeamRow key={team.id} team={team} />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            )}
            

            <Dialog open={isAddModalOpen} onOpenChange={(open) => {
                setAddModalOpen(open);
                if (!open) {
                    setEditingTeam(null);
                    setNewTeam({ name: '', organization: 'Academy Boys', club_location: '', home_city: '', notes: '' });
                    setTeamCoaches([]);
                    setNewCoachName('');
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
                        <DialogDescription>
                            {editingTeam ? 'Update team information' : 'Add a team to your global roster'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="teamName">Team Name*</Label>
                            <Input
                                id="teamName"
                                value={newTeam.name}
                                onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                                placeholder="e.g., Vipers 12U"
                            />
                        </div>
                        <div>
                            <Label htmlFor="organization">Organization*</Label>
                            <Select 
                                value={newTeam.organization || 'Academy Boys'} 
                                onValueChange={val => setNewTeam({ ...newTeam, organization: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an organization" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Academy Boys">Academy Boys</SelectItem>
                                    <SelectItem value="Academy Girls">Academy Girls</SelectItem>
                                    <SelectItem value="Academy Girls Elite">Academy Girls Elite</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="club_location">Club Location</Label>
                            <Select 
                                value={newTeam.club_location || 'none'} 
                                onValueChange={val => setNewTeam({ ...newTeam, club_location: val === 'none' ? '' : val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select location..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Not Set</SelectItem>
                                    <SelectItem value="North">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                                            North (Gold)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="West">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-emerald-700"></span>
                                            West (Green)
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="homeCity">Home City</Label>
                            <Input
                                id="homeCity"
                                value={newTeam.home_city}
                                onChange={e => setNewTeam({ ...newTeam, home_city: e.target.value })}
                                placeholder="e.g., San Diego, CA"
                            />
                        </div>
                        <div>
                            <Label>Coaches (up to 5)</Label>
                            <div className="space-y-2">
                                {teamCoaches.map((coach, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                        <span className="flex-1">{coach}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveCoach(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {teamCoaches.length < 5 && (
                                    <div className="flex gap-2">
                                        <Input
                                            value={newCoachName}
                                            onChange={e => setNewCoachName(e.target.value)}
                                            placeholder="Coach name"
                                            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddCoach())}
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleAddCoach}
                                            disabled={!newCoachName.trim()}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="teamNotes">Notes</Label>
                            <Textarea
                                id="teamNotes"
                                value={newTeam.notes}
                                onChange={e => setNewTeam({ ...newTeam, notes: e.target.value })}
                                placeholder="Optional notes about this team"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleAddTeam}
                            disabled={createTeamMutation.isPending || !newTeam.name || !newTeam.organization}
                            className="bg-blush-800 hover:bg-blush-800/90 text-black"
                        >
                            {createTeamMutation.isPending ? (editingTeam ? 'Updating...' : 'Adding... ') : (editingTeam ? 'Update Team' : 'Add Team')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
