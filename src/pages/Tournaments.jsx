import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, Calendar, MapPin, Upload, Trash2, Award, Clock, Zap, ArrowUpDown, Hotel } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, isPast, isFuture, isToday } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Tournaments() {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedTournaments, setSelectedTournaments] = useState(new Set());
    const [sortBy, setSortBy] = useState('date-asc');
    const [showNoHousing, setShowNoHousing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAllUpcoming, setShowAllUpcoming] = useState(false);
    const [showAllThisMonth, setShowAllThisMonth] = useState(false);
    const [showAllPast, setShowAllPast] = useState(false);
    const [newTournament, setNewTournament] = useState({
        name: '',
        league_id: '',
        age_division_focus: '',
        gender_focus: 'Boys',
        housing_required: true,
        location: '',
        start_date: '',
        end_date: '',
        housing_partner: '',
        contact_info: '',
        stay_play_requirements: '',
        club_location: '',
        stay_play_required: false
    });

    const { data: tournaments, isLoading } = useQuery({
        queryKey: ['tournaments'],
        queryFn: async () => {
            const allTournaments = await base44.entities.Tournament.list();
            return allTournaments;
        },
    });

    const { data: leagues } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Tournament.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tournaments'] });
            setCreateModalOpen(false);
            setNewTournament({
                name: '',
                league_id: '',
                age_division_focus: '',
                gender_focus: 'Boys',
                housing_required: true,
                location: '',
                start_date: '',
                end_date: '',
                housing_partner: '',
                contact_info: '',
                stay_play_requirements: '',
                club_location: '',
                stay_play_required: false
            });
        }
    });

    const updateTournamentMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Tournament.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tournaments'] });
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
            queryClient.invalidateQueries({ queryKey: ['tournaments'] });
            queryClient.invalidateQueries({ queryKey: ['tournamentTeams'] });
            queryClient.invalidateQueries({ queryKey: ['coaches'] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            queryClient.invalidateQueries({ queryKey: ['financeTransactions'] });
        }
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (tournamentIds) => {
            for (const tournamentId of tournamentIds) {
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

                await base44.entities.Tournament.delete(tournamentId);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tournaments'] });
            queryClient.invalidateQueries({ queryKey: ['tournamentTeams'] });
            queryClient.invalidateQueries({ queryKey: ['coaches'] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            queryClient.invalidateQueries({ queryKey: ['financeTransactions'] });
            setSelectedTournaments(new Set());
        }
    });

    const handleBulkDelete = () => {
        if (selectedTournaments.size === 0) return;
        
        if (confirm(`Are you sure you want to delete ${selectedTournaments.size} tournament(s)? This will also delete all associated teams, coaches, rooms, reminders, and transactions.`)) {
            bulkDeleteMutation.mutate(Array.from(selectedTournaments));
        }
    };

    const toggleTournamentSelection = (tournamentId) => {
        const newSelected = new Set(selectedTournaments);
        if (newSelected.has(tournamentId)) {
            newSelected.delete(tournamentId);
        } else {
            newSelected.add(tournamentId);
        }
        setSelectedTournaments(newSelected);
    };

    const toggleAllInCategory = (categoryTournaments) => {
        const categoryIds = categoryTournaments.map(t => t.id);
        const allSelected = categoryIds.every(id => selectedTournaments.has(id));
        
        const newSelected = new Set(selectedTournaments);
        if (allSelected) {
            categoryIds.forEach(id => newSelected.delete(id));
        } else {
            categoryIds.forEach(id => newSelected.add(id));
        }
        setSelectedTournaments(newSelected);
    };

    const selectAllTournaments = () => {
        const allNonLeagueTournaments = sortedTournaments.filter(t => !t.league_id);
        const newSelected = new Set(allNonLeagueTournaments.map(t => t.id));
        setSelectedTournaments(newSelected);
    };

    const deselectAllTournaments = () => {
        setSelectedTournaments(new Set());
    };

    const toggleStayAndPlay = (tournament) => {
        updateTournamentMutation.mutate({
            id: tournament.id,
            data: { stay_play_required: !tournament.stay_play_required }
        });
    };

    const toggleHousingRequired = (tournament) => {
        updateTournamentMutation.mutate({
            id: tournament.id,
            data: { housing_required: !tournament.housing_required }
        });
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setNewTournament(prev => ({ ...prev, [id]: value }));
    };

    const handleCreate = () => {
        if (newTournament.name) {
            const tournamentData = { ...newTournament };
            if (!tournamentData.league_id || tournamentData.league_id === 'none') {
                delete tournamentData.league_id;
            }
            if (!tournamentData.age_division_focus || tournamentData.age_division_focus === 'none') {
                delete tournamentData.age_division_focus;
            }
            if (!tournamentData.club_location || tournamentData.club_location === 'none') {
                delete tournamentData.club_location;
            }
            createMutation.mutate(tournamentData);
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
                                    league_id: { type: "string" },
                                    age_division_focus: { type: "string" },
                                    gender_focus: { type: "string" },
                                    housing_required: { type: "boolean" },
                                    location: { type: "string" },
                                    start_date: { type: "string" },
                                    end_date: { type: "string" },
                                    housing_partner: { type: "string" },
                                    contact_info: { type: "string" },
                                    stay_play_requirements: { type: "string" },
                                    club_location: { type: "string" },
                                    stay_play_required: { type: "boolean" }
                                },
                                required: ["tournament_name"]
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

                for (const entry of entries) {
                    const tournamentExists = existingTournaments.some(t => 
                        t.name.toLowerCase().trim() === entry.tournament_name.toLowerCase().trim()
                    );

                    if (!tournamentExists) {
                        await base44.entities.Tournament.create({
                            name: entry.tournament_name,
                            league_id: entry.league_id || '',
                            age_division_focus: entry.age_division_focus || '',
                            gender_focus: entry.gender_focus || 'Boys',
                            housing_required: entry.housing_required !== undefined ? entry.housing_required : true,
                            location: entry.location || '',
                            start_date: entry.start_date || '',
                            end_date: entry.end_date || '',
                            housing_partner: entry.housing_partner || '',
                            contact_info: entry.contact_info || '',
                            stay_play_requirements: entry.stay_play_requirements || '',
                            club_location: entry.club_location || '',
                            stay_play_required: entry.stay_play_required !== undefined ? entry.stay_play_required : false,
                            status: 'Not Started'
                        });
                        created++;
                    } else {
                        skipped++;
                    }
                }

                queryClient.invalidateQueries({ queryKey: ['tournaments'] });
                
                setUploadStatus({ 
                    type: 'success', 
                    message: `Successfully processed! Created ${created} new tournament(s), skipped ${skipped} duplicate(s).` 
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
            setUploadStatus({ type: 'error', message: 'Error uploading file. Please try again.' });
        } finally {
            setIsUploading(false);
        }
    };

    const getLeagueName = (leagueId) => {
        return leagues?.find(l => l.id === leagueId)?.name || null;
    };

    const selectedLeague = leagues?.find(l => l.id === newTournament.league_id);

    const sortedTournaments = useMemo(() => {
        if (!tournaments) return [];
        
        let filtered = tournaments;
        if (!showNoHousing) {
            filtered = tournaments.filter(t => t.housing_required !== false);
        }
        
        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                t.name.toLowerCase().includes(query) ||
                (t.location && t.location.toLowerCase().includes(query)) ||
                (t.age_division_focus && t.age_division_focus.toLowerCase().includes(query)) ||
                (t.housing_partner && t.housing_partner.toLowerCase().includes(query))
            );
        }
        
        const sorted = [...filtered];
        
        switch (sortBy) {
            case 'date-asc':
                return sorted.sort((a, b) => {
                    const dateA = a.start_date ? parseISO(a.start_date) : null;
                    const dateB = b.start_date ? parseISO(b.start_date) : null;

                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return dateA.getTime() - dateB.getTime();
                });
            case 'date-desc':
                return sorted.sort((a, b) => {
                    const dateA = a.start_date ? parseISO(a.start_date) : null;
                    const dateB = b.start_date ? parseISO(b.start_date) : null;

                    if (!dateA && !dateB) return 0;
                    if (!dateA) return -1;
                    if (!dateB) return 1;
                    return dateB.getTime() - dateA.getTime();
                });
            case 'name-asc':
                return sorted.sort((a, b) => a.name.localeCompare(b.name));
            case 'name-desc':
                return sorted.sort((a, b) => b.name.localeCompare(a.name));
            case 'status':
                return sorted.sort((a, b) => {
                    const statusOrder = { 'Not Started': 1, 'In Progress': 2, 'Complete': 3 };
                    return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
                });
            default:
                return sorted;
        }
    }, [tournaments, sortBy, showNoHousing, searchQuery]);

    const { upcomingTournaments, thisMonthTournaments, pastTournaments, boysByAge, girlsByAge } = useMemo(() => {
        if (!sortedTournaments) return { upcomingTournaments: [], thisMonthTournaments: [], pastTournaments: [], boysByAge: {}, girlsByAge: {} };

        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const upcoming = [];
        const thisMonth = [];
        const past = [];
        const boysGrouped = {};
        const girlsGrouped = {};

        sortedTournaments.forEach(t => {
            if (!t.league_id) {
                if (t.start_date) {
                    const startDate = parseISO(t.start_date);
                    
                    if (t.status === 'Complete') {
                        past.push(t);
                    } else if (isWithinInterval(startDate, { start: monthStart, end: monthEnd })) {
                        thisMonth.push(t);
                    } else if (isFuture(startDate) || isToday(startDate)) {
                        upcoming.push(t);
                    } else {
                        past.push(t);
                    }
                } else {
                    if (t.status !== 'Complete') {
                        upcoming.push(t);
                    } else {
                        past.push(t);
                    }
                }
            }

            if (!t.league_id) {
                const age = t.age_division_focus || 'No Age Division';
                if (t.gender_focus === 'Boys') {
                    if (!boysGrouped[age]) boysGrouped[age] = [];
                    boysGrouped[age].push(t);
                } else if (t.gender_focus === 'Girls') {
                    if (!girlsGrouped[age]) girlsGrouped[age] = [];
                    girlsGrouped[age].push(t);
                }
            }
        });
        
        return { 
            upcomingTournaments: upcoming,
            thisMonthTournaments: thisMonth,
            pastTournaments: past,
            boysByAge: boysGrouped, 
            girlsByAge: girlsGrouped
        };
    }, [sortedTournaments]);

    const TournamentCard = ({ tournament, showCheckbox = false }) => {
        const isNoHousing = tournament.housing_required === false;
        
        return (
            <Card className={`hover:shadow-lg transition-shadow relative ${isNoHousing ? 'border-2 border-dashed border-gray-300 bg-gray-50' : ''}`}>
                {showCheckbox && (
                    <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                            checked={selectedTournaments.has(tournament.id)}
                            onCheckedChange={() => toggleTournamentSelection(tournament.id)}
                            className="h-5 w-5"
                        />
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-12 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                        if (confirm(`Are you sure you want to delete "${tournament.name}"? This will also delete all associated teams, coaches, rooms, reminders, and transactions.`)) {
                            deleteTournamentMutation.mutate(tournament.id);
                        }
                    }}
                    disabled={deleteTournamentMutation.isPending}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
                <CardHeader className={showCheckbox ? "pl-10 pr-24" : "pr-24"}>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className={isNoHousing ? "text-gray-400" : "text-blush-800"} />
                        {tournament.name}
                        {isNoHousing && (
                            <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-600">
                                No Housing
                            </Badge>
                        )}
                    </CardTitle>
                    {tournament.age_division_focus && (
                        <CardDescription className="flex items-center gap-2 pt-1">
                            <Award className="h-4 w-4" />
                            {tournament.age_division_focus}
                        </CardDescription>
                    )}
                    <CardDescription className="flex items-center gap-2 pt-2">
                        <MapPin className="h-4 w-4" /> {tournament.location || 'No location set'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                            {tournament.start_date ? format(parseISO(tournament.start_date), 'MMM d, yyyy') : 'TBA'} - {tournament.end_date ? format(parseISO(tournament.end_date), 'MMM d, yyyy') : 'TBA'}
                        </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <div className="flex gap-2 flex-wrap flex-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                tournament.status === 'Complete' ? 'bg-green-100 text-green-800' : 
                                tournament.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                                {tournament.status}
                            </span>
                            {tournament.club_location && (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    tournament.club_location === 'North' ? 'bg-amber-200 text-amber-800' :
                                    tournament.club_location === 'West' ? 'bg-emerald-200 text-emerald-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {tournament.club_location}
                                </span>
                            )}
                            {tournament.stay_play_required && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                    Stay & Play
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 ml-2">
                            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg border-2 border-gray-200">
                                <Hotel className="w-4 h-4 text-gray-600" />
                                <Label htmlFor={`no-housing-${tournament.id}`} className="text-xs whitespace-nowrap cursor-pointer font-medium text-gray-700">
                                    No Housing
                                </Label>
                                <Checkbox
                                    id={`no-housing-${tournament.id}`}
                                    checked={tournament.housing_required === false}
                                    onCheckedChange={() => toggleHousingRequired(tournament)}
                                    disabled={updateTournamentMutation.isPending}
                                    className="h-5 w-5 data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600"
                                />
                            </div>
                            {tournament.housing_required !== false && (
                                <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded">
                                    <Checkbox
                                        id={`stay-play-${tournament.id}`}
                                        checked={tournament.stay_play_required === true}
                                        onCheckedChange={() => toggleStayAndPlay(tournament)}
                                        disabled={updateTournamentMutation.isPending}
                                        className="h-5 w-5 data-[state=checked]:bg-black data-[state=checked]:border-black"
                                    />
                                    <Label htmlFor={`stay-play-${tournament.id}`} className="text-xs whitespace-nowrap cursor-pointer font-medium">
                                        S&P
                                    </Label>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                        <Link to={createPageUrl(`TournamentCommandPage?id=${tournament.id}`)}>
                            Open Command Page
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Tournaments</h1>
                <div className="flex gap-2 flex-wrap">
                    {selectedTournaments.size > 0 ? (
                        <>
                            <Button 
                                onClick={deselectAllTournaments}
                                variant="outline"
                            >
                                Deselect All
                            </Button>
                            <Button 
                                onClick={handleBulkDelete} 
                                variant="destructive"
                                disabled={bulkDeleteMutation.isPending}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> 
                                {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete Selected (${selectedTournaments.size})`}
                            </Button>
                        </>
                    ) : (
                        <>
                            {sortedTournaments?.filter(t => !t.league_id).length > 0 && (
                                <Button 
                                    onClick={selectAllTournaments}
                                    variant="outline"
                                >
                                    Select All
                                </Button>
                            )}
                            <Button onClick={() => setUploadModalOpen(true)} className="bg-blush-800 hover:bg-blush-800/90 text-black">
                                <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                            </Button>
                            <Button onClick={() => setCreateModalOpen(true)} className="bg-blush-800 hover:bg-blush-800/90 text-black">
                                <Plus className="mr-2 h-4 w-4" /> New Tournament
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-[250px]">
                            <Input
                                placeholder="Search tournaments by name, location, age division, or housing partner..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <ArrowUpDown className="w-5 h-5 text-gray-600" />
                            <Label htmlFor="sort-by" className="text-sm font-medium">Sort by:</Label>
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger id="sort-by" className="w-[200px]">
                                    <SelectValue placeholder="Select a sort order..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="date-asc">Date (Upcoming First)</SelectItem>
                                    <SelectItem value="date-desc">Date (Latest First)</SelectItem>
                                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 ml-auto">
                            <Checkbox
                                id="show-no-housing"
                                checked={showNoHousing}
                                onCheckedChange={setShowNoHousing}
                            />
                            <Label htmlFor="show-no-housing" className="text-sm font-medium cursor-pointer">
                                Show No-Housing Tournaments
                            </Label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <p>Loading tournaments...</p>
            ) : (
                <div className="space-y-6">
                    <Accordion type="multiple" defaultValue={[]} className="space-y-4">
                        <AccordionItem value="boys" className="border rounded-lg">
                            <AccordionTrigger className="px-4 hover:no-underline">
                                <div className="flex items-center gap-2 flex-1">
                                    <Trophy className="w-5 h-5 text-blush-800" />
                                    <span className="text-lg font-bold">Academy Boys</span>
                                    <span className="text-sm text-gray-500">
                                        ({Object.values(boysByAge).flat().length} tournaments)
                                    </span>
                                    {Object.values(boysByAge).flat().length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleAllInCategory(Object.values(boysByAge).flat());
                                            }}
                                            className="ml-auto mr-2"
                                        >
                                            {Object.values(boysByAge).flat().every(t => selectedTournaments.has(t.id)) ? 'Deselect All' : 'Select All'}
                                        </Button>
                                    )}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pt-4">
                                {Object.keys(boysByAge).length > 0 ? (
                                    <Accordion type="multiple" className="space-y-2">
                                        {Object.entries(boysByAge).map(([age, tournamentsList]) => (
                                            <AccordionItem key={age} value={age} className="border rounded">
                                                <AccordionTrigger className="px-3 hover:no-underline text-sm">
                                                    <span className="font-semibold">{age} ({tournamentsList.length})</span>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-3 pt-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {tournamentsList.map(tournament => (
                                                            <TournamentCard key={tournament.id} tournament={tournament} showCheckbox={true} />
                                                        ))}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">No boys tournaments yet</p>
                                        <p className="text-xs mt-1">Create your first Academy Boys tournament</p>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="girls" className="border rounded-lg">
                            <AccordionTrigger className="px-4 hover:no-underline">
                                <div className="flex items-center gap-2 flex-1">
                                    <Trophy className="w-5 h-5 text-blush-800" />
                                    <span className="text-lg font-bold">Academy Girls</span>
                                    <span className="text-sm text-gray-500">
                                        ({Object.values(girlsByAge).flat().length} tournaments)
                                    </span>
                                    {Object.values(girlsByAge).flat().length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleAllInCategory(Object.values(girlsByAge).flat());
                                            }}
                                            className="ml-auto mr-2"
                                        >
                                            {Object.values(girlsByAge).flat().every(t => selectedTournaments.has(t.id)) ? 'Deselect All' : 'Select All'}
                                        </Button>
                                    )}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pt-4">
                                {Object.keys(girlsByAge).length > 0 ? (
                                    <Accordion type="multiple" className="space-y-2">
                                        {Object.entries(girlsByAge).map(([age, tournamentsList]) => (
                                            <AccordionItem key={age} value={age} className="border rounded">
                                                <AccordionTrigger className="px-3 hover:no-underline text-sm">
                                                    <span className="font-semibold">{age} ({tournamentsList.length})</span>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-3 pt-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {tournamentsList.map(tournament => (
                                                            <TournamentCard key={tournament.id} tournament={tournament} showCheckbox={true} />
                                                        ))}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">No girls tournaments yet</p>
                                        <p className="text-xs mt-1">Create your first Academy Girls tournament</p>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    {upcomingTournaments.length > 0 && (
                        <Card className="border-2 border-blue-200 bg-blue-50">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-blue-800">
                                        <Calendar className="w-5 h-5" />
                                        Upcoming Tournaments ({upcomingTournaments.length})
                                    </CardTitle>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleAllInCategory(upcomingTournaments)}
                                    >
                                        {upcomingTournaments.every(t => selectedTournaments.has(t.id)) ? 'Deselect All' : 'Select All'}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {(showAllUpcoming ? upcomingTournaments : upcomingTournaments.slice(0, 3)).map(tournament => (
                                        <TournamentCard key={tournament.id} tournament={tournament} showCheckbox={true} />
                                    ))}
                                </div>
                                {upcomingTournaments.length > 3 && (
                                    <div className="mt-4 text-center">
                                        <p className="text-sm text-gray-600 mb-2">
                                            Showing {showAllUpcoming ? upcomingTournaments.length : 3} of {upcomingTournaments.length} upcoming tournaments
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                                            className="border-dashed"
                                        >
                                            {showAllUpcoming ? '▲ Show Less' : `▼ Show All (${upcomingTournaments.length} total)`}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {thisMonthTournaments.length > 0 && (
                        <Card className="border-2 border-lavender-200 bg-lavender-100">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-lavender-800">
                                        <Zap className="w-5 h-5" />
                                        This Month ({thisMonthTournaments.length})
                                    </CardTitle>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleAllInCategory(thisMonthTournaments)}
                                    >
                                        {thisMonthTournaments.every(t => selectedTournaments.has(t.id)) ? 'Deselect All' : 'Select All'}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {(showAllThisMonth ? thisMonthTournaments : thisMonthTournaments.slice(0, 3)).map(tournament => (
                                        <TournamentCard key={tournament.id} tournament={tournament} showCheckbox={true} />
                                    ))}
                                </div>
                                {thisMonthTournaments.length > 3 && (
                                    <div className="mt-4 text-center">
                                        <p className="text-sm text-gray-600 mb-2">
                                            Showing {showAllThisMonth ? thisMonthTournaments.length : 3} of {thisMonthTournaments.length} tournaments this month
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setShowAllThisMonth(!showAllThisMonth)}
                                            className="border-dashed"
                                        >
                                            {showAllThisMonth ? '▲ Show Less' : `▼ Show All (${thisMonthTournaments.length} total)`}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {pastTournaments.length > 0 && (
                        <Card className="border-2 border-gray-200 bg-gray-50">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-gray-700">
                                        <Trophy className="w-5 h-5" />
                                        Completed Tournaments ({pastTournaments.length})
                                    </CardTitle>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleAllInCategory(pastTournaments)}
                                    >
                                        {pastTournaments.every(t => selectedTournaments.has(t.id)) ? 'Deselect All' : 'Select All'}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {(showAllPast ? pastTournaments : pastTournaments.slice(0, 3)).map(tournament => (
                                        <TournamentCard key={tournament.id} tournament={tournament} showCheckbox={true} />
                                    ))}
                                </div>
                                {pastTournaments.length > 3 && (
                                    <div className="mt-4 text-center">
                                        <p className="text-sm text-gray-600 mb-2">
                                            Showing {showAllPast ? pastTournaments.length : 3} of {pastTournaments.length} completed tournaments
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setShowAllPast(!showAllPast)}
                                            className="border-dashed"
                                        >
                                            {showAllPast ? '▲ Show Less' : `▼ Show All (${pastTournaments.length} total)`}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            <Dialog open={isCreateModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Tournament</DialogTitle>
                        <DialogDescription>Enter the details for your new tournament. You can optionally associate it with a league.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name*</Label>
                            <Input id="name" value={newTournament.name} onChange={handleInputChange} className="col-span-3" placeholder="e.g., League 1 - Sept 27" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="league_id" className="text-right">League (Optional)</Label>
                            <Select 
                                value={newTournament.league_id === '' ? 'none' : newTournament.league_id} 
                                onValueChange={(val) => setNewTournament(prev => ({ 
                                    ...prev, 
                                    league_id: val === 'none' ? '' : val, 
                                    age_division_focus: '' 
                                }))}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a league..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No League</SelectItem>
                                    {leagues?.map(l => (
                                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedLeague && selectedLeague.age_divisions && selectedLeague.age_divisions.length > 0 && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="age_division_focus" className="text-right">Age Division</Label>
                                <Select 
                                    value={newTournament.age_division_focus === '' ? 'none' : newTournament.age_division_focus} 
                                    onValueChange={(val) => setNewTournament(prev => ({ 
                                        ...prev, 
                                        age_division_focus: val === 'none' ? '' : val
                                    }))}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select age division..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">All Divisions</SelectItem>
                                        {selectedLeague.age_divisions.map(div => (
                                            <SelectItem key={div} value={div}>{div}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="gender_focus" className="text-right">Gender*</Label>
                            <Select 
                                value={newTournament.gender_focus} 
                                onValueChange={(val) => setNewTournament(prev => ({ ...prev, gender_focus: val }))}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Boys">Boys</SelectItem>
                                    <SelectItem value="Girls">Girls</SelectItem>
                                    <SelectItem value="Mixed">Mixed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="club_location" className="text-right">Club Location</Label>
                            <Select
                                value={newTournament.club_location}
                                onValueChange={(val) => setNewTournament(prev => ({ ...prev, club_location: val }))}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select club location..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>None</SelectItem>
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
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="housing_required" className="text-right">Housing Required</Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <Checkbox
                                    id="housing_required"
                                    checked={newTournament.housing_required}
                                    onCheckedChange={(checked) => setNewTournament(prev => ({ ...prev, housing_required: checked }))}
                                />
                                <Label htmlFor="housing_required" className="cursor-pointer text-sm text-gray-600">
                                    This tournament requires housing arrangements
                                </Label>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stay_play_required" className="text-right">Stay & Play Required</Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <Switch
                                    id="stay_play_required"
                                    checked={newTournament.stay_play_required}
                                    onCheckedChange={(checked) => setNewTournament(prev => ({ ...prev, stay_play_required: checked }))}
                                />
                                <Label htmlFor="stay_play_required" className="cursor-pointer text-sm text-gray-600">
                                    Does this tournament enforce Stay & Play?
                                </Label>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="location" className="text-right">Location</Label>
                            <Input id="location" value={newTournament.location} onChange={handleInputChange} className="col-span-3" placeholder="e.g., UC Davis Bay Area Sites" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="start_date" className="text-right">Start Date</Label>
                             <Input id="start_date" type="date" value={newTournament.start_date} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="end_date" className="text-right">End Date</Label>
                             <Input id="end_date" type="date" value={newTournament.end_date} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="housing_partner" className="text-right">Housing Partner</Label>
                            <Input id="housing_partner" value={newTournament.housing_partner} onChange={handleInputChange} className="col-span-3" placeholder="e.g., THS, EM2, KC Sports Housing" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="contact_info" className="text-right">Contact Info</Label>
                            <Input id="contact_info" value={newTournament.contact_info} onChange={handleInputChange} className="col-span-3" placeholder="e.g., housing@tournament.com or 555-1234" />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="stay_play_requirements" className="text-right pt-2">Stay & Play Requirements</Label>
                            <Textarea
                                id="stay_play_requirements"
                                value={newTournament.stay_play_requirements}
                                onChange={handleInputChange}
                                className="col-span-3"
                                placeholder="e.g., All teams must book through housing partner. Minimum 10 rooms per team for 3 nights."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={createMutation.isPending || !newTournament.name} className="bg-blush-800 hover:bg-blush-800/90 text-black">
                            {createMutation.isPending ? 'Creating...' : 'Create Tournament'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isUploadModalOpen} onOpenChange={setUploadModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bulk Upload Tournaments</DialogTitle>
                        <DialogDescription>
                            Upload a CSV or Excel file with columns: "tournament_name" (required), "league_id", "age_division_focus", "gender_focus" (Boys/Girls/Mixed), "housing_required" (true/false), "location", "start_date", "end_date", "housing_partner", "contact_info", "stay_play_requirements", "club_location" (North/West), "stay_play_required" (true/false) (all optional).
                            The system will skip duplicate tournaments based on name.
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
                                Example: tournament_name, gender_focus, housing_required, stay_play_required, location, start_date, end_date, club_location...
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
                        <Button variant="outline" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
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