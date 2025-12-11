
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trophy, Calendar, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom"; // Added for navigation to detail page

export default function Leagues() {
    const queryClient = useQueryClient();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingLeague, setEditingLeague] = useState(null);
    const [newLeague, setNewLeague] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        age_divisions: '',
        contact_info: ''
    });

    const { data: leagues, isLoading } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list('-created_date'),
    });

    const { data: allTournaments } = useQuery({
        queryKey: ['allTournaments'],
        queryFn: () => base44.entities.Tournament.list(),
    });

    const createMutation = useMutation({
        mutationFn: (data) => {
            const leagueData = {
                ...data,
                age_divisions: data.age_divisions.split(',').map(d => d.trim()).filter(d => d)
            };
            if (editingLeague) {
                return base44.entities.League.update(editingLeague.id, leagueData);
            }
            return base44.entities.League.create(leagueData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagues'] });
            setModalOpen(false);
            setEditingLeague(null);
            setNewLeague({
                name: '',
                description: '',
                start_date: '',
                end_date: '',
                age_divisions: '',
                contact_info: ''
            });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (leagueId) => base44.entities.League.delete(leagueId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagues'] });
        }
    });

    const getUpcomingTournamentsForLeague = (leagueId) => {
        if (!allTournaments) return [];
        
        const now = new Date();
        const leagueTournaments = allTournaments
            .filter(t => t.league_id === leagueId && t.start_date)
            .filter(t => {
                const startDate = new Date(t.start_date);
                // Consider tournaments "upcoming" if their start date is today or in the future,
                // or if their status is explicitly "In Progress"
                return startDate >= now || t.status === 'In Progress';
            })
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
            .slice(0, 3); // Limit to 3 upcoming tournaments
        
        return leagueTournaments;
    };

    const handleOpenModal = (league = null) => {
        if (league) {
            setEditingLeague(league);
            setNewLeague({
                name: league.name,
                description: league.description || '',
                start_date: league.start_date || '',
                end_date: league.end_date || '',
                age_divisions: league.age_divisions?.join(', ') || '',
                contact_info: league.contact_info || ''
            });
        } else {
            setEditingLeague(null);
            setNewLeague({
                name: '',
                description: '',
                start_date: '',
                end_date: '',
                age_divisions: '',
                contact_info: ''
            });
        }
        setModalOpen(true);
    };

    const handleSave = () => {
        if (newLeague.name) {
            createMutation.mutate(newLeague);
        }
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setNewLeague(prev => ({ ...prev, [id]: value }));
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Leagues</h1>
                    <p className="text-gray-500 mt-1">Manage leagues with age divisions and tournament schedules</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="bg-blush-800 hover:bg-blush-800/90 text-black">
                    <Plus className="mr-2 h-4 w-4" /> New League
                </Button>
            </div>

            {isLoading ? (
                <p>Loading leagues...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {leagues?.map((league) => (
                        <Card key={league.id} className="hover:shadow-lg transition-shadow relative">
                            <div className="absolute top-2 right-2 flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenModal(league)}
                                    className="h-8 w-8"
                                >
                                    <Edit className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                        if (confirm(`Are you sure you want to delete "${league.name}"?`)) {
                                            deleteMutation.mutate(league.id);
                                        }
                                    }}
                                    disabled={deleteMutation.isPending}
                                >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 pr-16">
                                    <Trophy className="text-blush-800" />
                                    {league.name}
                                </CardTitle>
                                {league.description && (
                                    <CardDescription className="pt-2">{league.description}</CardDescription>
                                )}
                            </CardHeader>
                            <CardContent>
                                {(league.start_date || league.end_date) && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {league.start_date ? format(new Date(league.start_date), 'MMM d, yyyy') : 'TBA'} - {league.end_date ? format(new Date(league.end_date), 'MMM d, yyyy') : 'TBA'}
                                        </span>
                                    </div>
                                )}
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
                                {getUpcomingTournamentsForLeague(league.id).length > 0 && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-xs font-medium text-gray-700 mb-2">Upcoming Tournaments:</p>
                                        <div className="space-y-2">
                                            {getUpcomingTournamentsForLeague(league.id).map(tournament => (
                                                <div key={tournament.id} className="text-xs bg-blue-50 p-2 rounded">
                                                    <p className="font-medium text-gray-900">{tournament.name}</p>
                                                    {tournament.start_date && (
                                                        <p className="text-gray-600 flex items-center gap-1 mt-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(new Date(tournament.start_date), 'MMM d, yyyy')}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="outline" className="w-full">
                                    <Link to={{ pathname: '/LeagueDetail', search: `?id=${league.id}` }}>
                                        View Details & Register Teams
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                    {!isLoading && leagues?.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No leagues yet</p>
                            <p className="text-sm mt-2">Get started by creating your first league</p>
                        </div>
                    )}
                </div>
            )}

            <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingLeague ? 'Edit League' : 'Create New League'}</DialogTitle>
                        <DialogDescription>
                            {editingLeague ? 'Update league details' : 'Enter the details for your new league'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name*</Label>
                            <Input id="name" value={newLeague.name} onChange={handleInputChange} className="col-span-3" placeholder="e.g., National Youth Baseball League" />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="description" className="text-right pt-2">Description</Label>
                            <Textarea id="description" value={newLeague.description} onChange={handleInputChange} className="col-span-3" placeholder="Details about the league" rows={3} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="start_date" className="text-right">Start Date</Label>
                            <Input id="start_date" type="date" value={newLeague.start_date} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="end_date" className="text-right">End Date</Label>
                            <Input id="end_date" type="date" value={newLeague.end_date} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="age_divisions" className="text-right">Age Divisions*</Label>
                            <Input id="age_divisions" value={newLeague.age_divisions} onChange={handleInputChange} className="col-span-3" placeholder="e.g., 10U, 12U, 14U, High School" />
                            <div className="col-start-2 col-span-3">
                                <p className="text-xs text-gray-500">Enter divisions separated by commas</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="contact_info" className="text-right">Contact Info</Label>
                            <Input id="contact_info" value={newLeague.contact_info} onChange={handleInputChange} className="col-span-3" placeholder="e.g., commissioner@league.com" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={createMutation.isPending || !newLeague.name || !newLeague.age_divisions} className="bg-blush-800 hover:bg-blush-800/90 text-black">
                            {createMutation.isPending ? (editingLeague ? 'Updating...' : 'Creating...') : (editingLeague ? 'Update League' : 'Create League')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
