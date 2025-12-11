
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, UserCircle, Trash2, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function CoachesManagement() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [isCreateTeamModalOpen, setCreateTeamModalOpen] = useState(false);
    const [editingCoach, setEditingCoach] = useState(null);
    const [selectedTournament, setSelectedTournament] = useState('none');
    const [selectedTeam, setSelectedTeam] = useState('none');
    const [newTeam, setNewTeam] = useState({ name: '', notes: '' });
    const [newCoach, setNewCoach] = useState({
        coach_name: '',
        preferred_airport: '', // Added new field
        flight_confirmation: '',
        hotel_confirmation: '',
        notes: '',
        gender: ''
    });
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const { data: tournaments } = useQuery({
        queryKey: ['tournaments'],
        queryFn: () => base44.entities.Tournament.list('-created_date'),
    });

    const { data: teams } = useQuery({
        queryKey: ['teams'],
        queryFn: () => base44.entities.Team.list('-created_date'),
    });

    const { data: coaches, isLoading, error } = useQuery({
        queryKey: ['allCoaches'],
        queryFn: async () => {
            const allCoaches = await base44.entities.CoachTravel.list('-created_date');
            return allCoaches.sort((a, b) => a.coach_name.localeCompare(b.coach_name));
        },
        initialData: [],
    });

    const groupedCoaches = useMemo(() => {
        if (!coaches || !teams || !tournaments) return [];

        const coachMap = new Map();

        coaches.forEach(coach => {
            const name = coach.coach_name;
            if (!coachMap.has(name)) {
                coachMap.set(name, {
                    name: name,
                    teams: [],
                    tournaments: [],
                    records: [],
                    notes: coach.notes || '',
                    gender: coach.gender || '',
                    preferred_airport: coach.preferred_airport || '' // Added
                });
            }

            const group = coachMap.get(name);
            group.records.push(coach);

            // Update preferred_airport if any record has it and the group doesn't have it yet
            if (coach.preferred_airport && !group.preferred_airport) {
                group.preferred_airport = coach.preferred_airport;
            }

            if (coach.team_id) {
                const team = teams.find(t => t.id === coach.team_id);
                if (team && !group.teams.find(t => t.id === team.id)) {
                    group.teams.push(team);
                }
            }

            if (coach.tournament_id) {
                const tournament = tournaments.find(t => t.id === coach.tournament_id);
                if (tournament && !group.tournaments.find(t => t.id === tournament.id)) {
                    group.tournaments.push(tournament);
                }
            }
        });

        return Array.from(coachMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [coaches, teams, tournaments]);

    const createCoachMutation = useMutation({
        mutationFn: (data) => {
            if (editingCoach) {
                return base44.entities.CoachTravel.update(editingCoach.id, data);
            }
            return base44.entities.CoachTravel.create({
                ...data,
                flight_cost: 0,
                hotel_cost: 0,
                flight_booked: false,
                hotel_booked: false
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
            queryClient.invalidateQueries({ queryKey: ['coaches'] });
            setAddModalOpen(false);
            setEditingCoach(null);
            setNewCoach({
                coach_name: '',
                preferred_airport: '', // Added for reset
                flight_confirmation: '',
                hotel_confirmation: '',
                notes: '',
                gender: ''
            });
            setSelectedTournament('none');
            setSelectedTeam('none');
        }
    });

    const deleteCoachMutation = useMutation({
        mutationFn: (coachId) => base44.entities.CoachTravel.delete(coachId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
            queryClient.invalidateQueries({ queryKey: ['coaches'] });
        }
    });

    const createTeamMutation = useMutation({
        mutationFn: (data) => base44.entities.Team.create({
            ...data,
            tournament_id: selectedTournament !== 'none' ? selectedTournament : null
        }),
        onSuccess: (newTeamData) => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            setCreateTeamModalOpen(false);
            setSelectedTeam(newTeamData.id);
            setNewTeam({ name: '', notes: '' });
        }
    });

    const handleOpenEditModal = (coachGroup) => {
        const firstRecord = coachGroup.records[0];
        setEditingCoach(firstRecord);
        setNewCoach({
            coach_name: firstRecord.coach_name,
            preferred_airport: firstRecord.preferred_airport || '', // Added
            flight_confirmation: firstRecord.flight_confirmation || '',
            hotel_confirmation: firstRecord.hotel_confirmation || '',
            notes: firstRecord.notes || '',
            gender: firstRecord.gender || ''
        });
        setSelectedTournament(firstRecord.tournament_id || 'none');
        setSelectedTeam(firstRecord.team_id || 'none');
        setAddModalOpen(true);
    };

    const handleAddCoach = () => {
        if (newCoach.coach_name) {
            const coachData = { ...newCoach };
            if (selectedTournament && selectedTournament !== 'none') coachData.tournament_id = selectedTournament;
            if (selectedTeam && selectedTeam !== 'none') coachData.team_id = selectedTeam;
            createCoachMutation.mutate(coachData);
        }
    };

    const handleCreateTeam = () => {
        if (newTeam.name) {
            createTeamMutation.mutate(newTeam);
        }
    };

    const handleDeleteCoach = async (coachGroup) => {
        if (confirm(`Are you sure you want to delete ALL records for coach "${coachGroup.name}"? This will remove them from all associated teams and tournaments.`)) {
            try {
                await Promise.all(coachGroup.records.map(record =>
                    base44.entities.CoachTravel.delete(record.id)
                ));
                queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
                queryClient.invalidateQueries({ queryKey: ['coaches'] });
            } catch (error) {
                console.error("Error deleting coach records:", error);
                alert("Failed to delete all coach records. Please try again.");
            }
        }
    };

    const handleFileUpload = async () => {
        if (!uploadFile) return;

        setIsUploading(true);
        setUploadStatus(null);

        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });

            const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url,
                json_schema: {
                    type: "object",
                    properties: {
                        entries: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    tournament_name: { type: "string" },
                                    tournament_location: { type: "string" },
                                    tournament_date: { type: "string" },
                                    team_name: { type: "string" },
                                    coach_name: { type: "string" },
                                    gender: { type: "string" },
                                    preferred_airport: { type: "string" }, // Added to schema
                                    flight_confirmation: { type: "string" },
                                    hotel_confirmation: { type: "string" },
                                    notes: { type: "string" }
                                },
                                required: ["tournament_name", "team_name", "coach_name"]
                            }
                        }
                    }
                }
            });

            if (result.status === 'success' && result.output?.entries) {
                const entries = result.output.entries;
                let created = 0;
                let skipped = 0;

                const existingTournaments = await base44.entities.Tournament.list();
                const existingTeams = await base44.entities.Team.list();
                const existingCoaches = await base44.entities.CoachTravel.list();

                for (const entry of entries) {
                    let tournament = existingTournaments.find(t =>
                        t.name.toLowerCase().trim() === entry.tournament_name.toLowerCase().trim()
                    );

                    if (!tournament) {
                        tournament = await base44.entities.Tournament.create({
                            name: entry.tournament_name,
                            location: entry.tournament_location || '',
                            start_date: entry.tournament_date || '',
                            end_date: entry.tournament_date || '',
                            status: 'Not Started'
                        });
                        existingTournaments.push(tournament);
                    } else if (entry.tournament_location || entry.tournament_date) {
                        const updateData = {};
                        if (entry.tournament_location) updateData.location = entry.tournament_location;
                        if (entry.tournament_date) {
                            updateData.start_date = entry.tournament_date;
                            updateData.end_date = entry.tournament_date;
                        }
                        if (Object.keys(updateData).length > 0) {
                            await base44.entities.Tournament.update(tournament.id, updateData);
                            const index = existingTournaments.findIndex(t => t.id === tournament.id);
                            if (index !== -1) {
                                existingTournaments[index] = { ...existingTournaments[index], ...updateData };
                                tournament = existingTournaments[index];
                            }
                        }
                    }

                    let team = existingTeams.find(t =>
                        t.name.toLowerCase().trim() === entry.team_name.toLowerCase().trim()
                    );

                    if (!team) {
                        team = await base44.entities.Team.create({
                            name: entry.team_name,
                            notes: ''
                        });
                        existingTeams.push(team);
                    }

                    const coachExists = existingCoaches.some(c =>
                        c.team_id === team.id &&
                        c.tournament_id === tournament.id &&
                        c.coach_name.toLowerCase().trim() === entry.coach_name.toLowerCase().trim()
                    );

                    if (!coachExists) {
                        const newCoachRecord = await base44.entities.CoachTravel.create({
                            tournament_id: tournament.id,
                            team_id: team.id,
                            coach_name: entry.coach_name,
                            gender: entry.gender || '',
                            preferred_airport: entry.preferred_airport || '', // Added when creating record
                            flight_confirmation: entry.flight_confirmation || '',
                            hotel_confirmation: entry.hotel_confirmation || '',
                            notes: entry.notes || '',
                            flight_booked: false,
                            hotel_booked: false,
                            flight_cost: 0,
                            hotel_cost: 0
                        });
                        existingCoaches.push(newCoachRecord);
                        created++;
                    } else {
                        skipped++;
                    }
                }

                queryClient.invalidateQueries({ queryKey: ['allCoaches'] });
                queryClient.invalidateQueries({ queryKey: ['coaches'] });
                queryClient.invalidateQueries({ queryKey: ['teams'] });
                queryClient.invalidateQueries({ queryKey: ['tournaments'] });

                setUploadStatus({
                    type: 'success',
                    message: `Successfully processed! Created ${created} new coach record(s), skipped ${skipped} duplicate(s).`
                });
                setUploadFile(null);

                setTimeout(() => {
                    setUploadModalOpen(false);
                    setUploadStatus(null);
                }, 3000);
            } else {
                setUploadStatus({ type: 'error', message: result.details || 'Failed to extract data from file' });
            }
        } catch (error) {
            console.error('Upload error:', error);
            setUploadStatus({
                type: 'error',
                message: `Error: ${error.message || 'Unknown error occurred. Please check your file format and try again.'}`
            });
        } finally {
            setIsUploading(false);
        }
    };

    const getTournamentName = (tournamentId) => {
        return tournaments?.find(t => t.id === tournamentId)?.name || 'Unknown Tournament';
    };

    const getTeamName = (teamId) => {
        return teams?.find(t => t.id === teamId)?.name || 'Unknown Team';
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Coaches Management</h1>
                    <p className="text-gray-500 mt-1">Manage all coaches across tournaments and teams</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setUploadModalOpen(true)} variant="outline" className="text-black">
                        <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                    </Button>
                    <Button onClick={() => setAddModalOpen(true)} className="bg-blush-800 hover:bg-blush-800/90 text-black">
                        <Plus className="mr-2 h-4 w-4" /> Add Coach
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCircle className="w-5 h-5" />
                        All Coaches ({groupedCoaches.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Coach Name</TableHead>
                                <TableHead>Gender</TableHead>
                                <TableHead>Preferred Airport</TableHead> {/* Added Table Head */}
                                <TableHead>Teams</TableHead>
                                <TableHead>Tournaments</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan="7" className="text-center">Loading coaches...</TableCell> {/* Colspan adjusted */}
                                </TableRow>
                            )}
                            {groupedCoaches.map(coachGroup => (
                                <TableRow key={coachGroup.name}>
                                    <TableCell className="font-medium">{coachGroup.name}</TableCell>
                                    <TableCell>
                                        {coachGroup.gender ? (
                                            <Badge variant="outline" className={
                                                coachGroup.gender.toLowerCase() === 'male' ? 'bg-blue-50 text-blue-700' :
                                                coachGroup.gender.toLowerCase() === 'female' ? 'bg-pink-50 text-pink-700' :
                                                'bg-gray-50 text-gray-700'
                                            }>
                                                {coachGroup.gender}
                                            </Badge>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell> {/* Added Table Cell */}
                                        {coachGroup.preferred_airport ? (
                                            <span className="text-blue-600 font-medium">{coachGroup.preferred_airport}</span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {coachGroup.teams.length > 0 ? (
                                            <div className="space-y-1">
                                                {coachGroup.teams.map(team => (
                                                    <div key={team.id} className="text-sm">
                                                        {team.name}
                                                        {team.organization && (
                                                            <span className="text-xs text-gray-500 ml-1">
                                                                ({team.organization})
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm">No teams</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {coachGroup.tournaments.length > 0 ? (
                                            <div className="space-y-1">
                                                {coachGroup.tournaments.map(tournament => (
                                                    <div key={tournament.id} className="text-sm">
                                                        {tournament.name}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm">No tournaments</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">{coachGroup.notes || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEditModal(coachGroup)}
                                                className="text-black"
                                            >
                                                <Edit className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteCoach(coachGroup)}
                                                className="text-black"
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && groupedCoaches.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan="7" className="text-center text-gray-500 py-8"> {/* Colspan adjusted */}
                                        No coaches added yet. Add coaches manually or use bulk upload.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isAddModalOpen} onOpenChange={(open) => {
                setAddModalOpen(open);
                if (!open) {
                    setEditingCoach(null);
                    setNewCoach({
                        coach_name: '',
                        preferred_airport: '', // Added for reset
                        flight_confirmation: '',
                        hotel_confirmation: '',
                        notes: '',
                        gender: ''
                    });
                    setSelectedTournament('none');
                    setSelectedTeam('none');
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCoach ? 'Edit Coach Record' : 'Add New Coach Record'}</DialogTitle>
                        <DialogDescription>
                            {editingCoach ? 'Update specific coach travel information.' : 'Add a coach record and assign to a tournament and team. A coach can have multiple records.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="coachName">Coach Name*</Label>
                            <Input
                                id="coachName"
                                value={newCoach.coach_name}
                                onChange={e => setNewCoach({ ...newCoach, coach_name: e.target.value })}
                                placeholder="e.g., John Smith"
                            />
                        </div>
                        <div>
                            <Label htmlFor="coachGender">Gender (Optional)</Label>
                            <Select value={newCoach.gender} onValueChange={(val) => setNewCoach({ ...newCoach, gender: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select gender..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>None</SelectItem>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="preferredAirport">Preferred Airport</Label> {/* Added Input */}
                            <Input
                                id="preferredAirport"
                                value={newCoach.preferred_airport}
                                onChange={e => setNewCoach({ ...newCoach, preferred_airport: e.target.value })}
                                placeholder="e.g., SFO, OAK, SJC"
                            />
                        </div>
                        <div>
                            <Label htmlFor="tournament">Tournament (Optional)</Label>
                            <Select value={selectedTournament} onValueChange={(val) => {
                                setSelectedTournament(val);
                                if (val !== 'none' && selectedTeam !== 'none' && !teams?.some(t => t.id === selectedTeam && t.tournament_id === val)) {
                                    setSelectedTeam('none');
                                }
                                if (val === 'none') {
                                    setSelectedTeam('none');
                                }
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select tournament..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {tournaments?.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="team">Team (Optional)</Label>
                            <div className="flex gap-2">
                                <Select value={selectedTeam} onValueChange={setSelectedTeam} disabled={!tournaments || tournaments.length === 0}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select team..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {selectedTournament === 'none' ? (
                                            teams?.map(t => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.name} {t.tournament_id ? `(${getTournamentName(t.tournament_id)})` : '(No Tournament)'}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            teams?.filter(t => t.tournament_id === selectedTournament).map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setCreateTeamModalOpen(true)}
                                    className="text-black"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="flightConf">Flight Confirmation # (Optional)</Label>
                            <Input
                                id="flightConf"
                                value={newCoach.flight_confirmation}
                                onChange={e => setNewCoach({ ...newCoach, flight_confirmation: e.target.value })}
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <Label htmlFor="hotelConf">Hotel Confirmation # (Optional)</Label>
                            <Input
                                id="hotelConf"
                                value={newCoach.hotel_confirmation}
                                onChange={e => setNewCoach({ ...newCoach, hotel_confirmation: e.target.value })}
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <Label htmlFor="coachNotes">Notes</Label>
                            <Textarea
                                id="coachNotes"
                                value={newCoach.notes}
                                onChange={e => setNewCoach({ ...newCoach, notes: e.target.value })}
                                placeholder="Optional notes about this coach record"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddModalOpen(false)} className="text-black">Cancel</Button>
                        <Button
                            onClick={handleAddCoach}
                            disabled={createCoachMutation.isPending || !newCoach.coach_name}
                            className="bg-blush-800 hover:bg-blush-800/90 text-black"
                        >
                            {createCoachMutation.isPending ? (editingCoach ? 'Updating...' : 'Adding...') : (editingCoach ? 'Update Record' : 'Add Record')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateTeamModalOpen} onOpenChange={setCreateTeamModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Team</DialogTitle>
                        <DialogDescription>
                            Add a new team. It will be associated with {selectedTournament !== 'none' ? tournaments?.find(t => t.id === selectedTournament)?.name : 'no specific tournament (yet)'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="newTeamName">Team Name*</Label>
                            <Input
                                id="newTeamName"
                                value={newTeam.name}
                                onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                                placeholder="e.g., Vipers 18U"
                            />
                        </div>
                        <div>
                            <Label htmlFor="newTeamNotes">Notes</Label>
                            <Textarea
                                id="newTeamNotes"
                                value={newTeam.notes}
                                onChange={e => setNewTeam({ ...newTeam, notes: e.target.value })}
                                placeholder="Optional notes about this team"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateTeamModalOpen(false)} className="text-black">Cancel</Button>
                        <Button
                            onClick={handleCreateTeam}
                            disabled={createTeamMutation.isPending || !newTeam.name}
                            className="bg-blush-800 hover:bg-blush-800/90 text-black"
                        >
                            {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isUploadModalOpen} onOpenChange={setUploadModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bulk Upload Coaches</DialogTitle>
                        <DialogDescription>
                            Upload a CSV or Excel file with columns: "tournament_name" (required), "tournament_location" (optional), "tournament_date" (optional, YYYY-MM-DD), "team_name" (required), "coach_name" (required), "gender" (optional, Male/Female/Other), "preferred_airport" (optional), "flight_confirmation" (optional), "hotel_confirmation" (optional), "notes" (optional).
                            The system will automatically create tournaments and teams if they don't exist (teams are identified by name, globally), and skip duplicate coach *records* (same coach name for the same team and tournament).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="file">Upload File (CSV or Excel)</Label>
                            <Input
                                id="file"
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={e => setUploadFile(e.target.files[0])}
                                className="cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Example format: tournament_name, tournament_location, tournament_date, team_name, coach_name, gender, preferred_airport, flight_confirmation, hotel_confirmation, notes
                            </p>
                        </div>
                        {uploadStatus && (
                            <Alert className={uploadStatus.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                                <AlertDescription className={uploadStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                                    {uploadStatus.message}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUploadModalOpen(false)} className="text-black">Cancel</Button>
                        <Button
                            onClick={handleFileUpload}
                            disabled={isUploading || !uploadFile}
                            className="bg-blush-800 hover:bg-blush-800/90 text-black"
                        >
                            {isUploading ? 'Uploading...' : 'Upload & Process'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
