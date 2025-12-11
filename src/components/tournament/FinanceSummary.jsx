import { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Plus, DollarSign, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';

export default function FinanceSummary({ tournamentId }) {
    const queryClient = useQueryClient();
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
    const [newTransaction, setNewTransaction] = useState({ category: 'Misc', description: '', amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });

    const { data: transactions, isLoading } = useQuery({
        queryKey: ['financeTransactions', tournamentId],
        queryFn: () => base44.entities.FinanceTransaction.filter({ tournament_id: tournamentId }),
        enabled: !!tournamentId,
    });

    const { data: tournamentTeams } = useQuery({
        queryKey: ['tournamentTeams', tournamentId],
        queryFn: () => base44.entities.TournamentTeam.filter({ tournament_id: tournamentId }),
        enabled: !!tournamentId,
    });

    const { data: allTeams } = useQuery({
        queryKey: ['teams'],
        queryFn: () => base44.entities.Team.list(),
    });
    
    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.FinanceTransaction.create({ ...data, tournament_id: tournamentId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financeTransactions', tournamentId] });
            queryClient.invalidateQueries({ queryKey: ['financeTransactions'] }); // Invalidate master dashboard
            setModalOpen(false);
            setNewTransaction({ category: 'Misc', description: '', amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.FinanceTransaction.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financeTransactions', tournamentId] });
            queryClient.invalidateQueries({ queryKey: ['financeTransactions'] });
        }
    });

    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];
        if (selectedTeamFilter === 'all') return transactions;
        return transactions.filter(t => t.team_id === selectedTeamFilter);
    }, [transactions, selectedTeamFilter]);

    const total = useMemo(() => filteredTransactions?.reduce((acc, t) => acc + t.amount, 0) || 0, [filteredTransactions]);

    const getTeamName = (teamId) => {
        return allTeams?.find(t => t.id === teamId)?.name || 'N/A';
    };

    const teamsInTournament = useMemo(() => {
        if (!tournamentTeams || !allTeams) return [];
        return tournamentTeams.map(tt => {
            const team = allTeams.find(t => t.id === tt.team_id);
            return team ? { id: team.id, name: team.name } : null;
        }).filter(Boolean);
    }, [tournamentTeams, allTeams]);

    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="flex items-center gap-2"><DollarSign /> Finance Summary</CardTitle>
                <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Entry</Button>
            </CardHeader>
            <CardContent>
                {/* Team Filter */}
                {teamsInTournament.length > 0 && (
                    <div className="mb-4">
                        <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Filter by team..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Teams</SelectItem>
                                {teamsInTournament.map(team => (
                                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            {teamsInTournament.length > 0 && <TableHead>Team</TableHead>}
                            <TableHead>Amount</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={teamsInTournament.length > 0 ? "5" : "4"}>Loading...</TableCell></TableRow>}
                        {filteredTransactions?.map(t => (
                            <TableRow key={t.id}>
                                <TableCell>{t.category}</TableCell>
                                <TableCell>{t.description}</TableCell>
                                {teamsInTournament.length > 0 && <TableCell className="text-sm text-gray-600">{t.team_id ? getTeamName(t.team_id) : '-'}</TableCell>}
                                <TableCell>${t.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="text-right font-bold mt-4">
                    {selectedTeamFilter !== 'all' && teamsInTournament.length > 0 && (
                        <span className="text-sm text-gray-600 mr-2">
                            ({teamsInTournament.find(t => t.id === selectedTeamFilter)?.name})
                        </span>
                    )}
                    Total: ${total.toFixed(2)}
                </div>
            </CardContent>

             <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>New Finance Entry</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        {teamsInTournament.length > 0 && (
                            <div>
                                <label className="text-sm font-medium">Team (Optional)</label>
                                <Select value={newTransaction.team_id || ''} onValueChange={val => setNewTransaction({...newTransaction, team_id: val || null})}>
                                    <SelectTrigger><SelectValue placeholder="Select team (optional)..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>None</SelectItem>
                                        {teamsInTournament.map(team => (
                                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <Select value={newTransaction.category} onValueChange={val => setNewTransaction({...newTransaction, category: val})}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Hotel">Hotel</SelectItem>
                                <SelectItem value="Flight">Flight</SelectItem>
                                <SelectItem value="Meals">Meals</SelectItem>
                                <SelectItem value="Misc">Misc</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input placeholder="Description" value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} />
                        <Input type="number" placeholder="Amount" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value)})} />
                        <Input type="date" value={newTransaction.date} onChange={e => setNewTransaction({...newTransaction, date: e.target.value})} />
                         <Textarea placeholder="Notes" value={newTransaction.notes} onChange={e => setNewTransaction({...newTransaction, notes: e.target.value})} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => createMutation.mutate(newTransaction)} disabled={createMutation.isPending}>{createMutation.isPending ? "Saving..." : "Save Entry"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}