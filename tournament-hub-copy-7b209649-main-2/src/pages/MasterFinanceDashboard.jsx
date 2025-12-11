
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FinanceSummaryCards from '../components/finance/FinanceSummaryCards';
import FinanceFilters from '../components/finance/FinanceFilters';
import DetailedTransactionsTable from '../components/finance/DetailedTransactionsTable';
import { Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';

export default function MasterFinanceDashboard() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    tournamentId: 'all',
    teamId: 'all',
    coachName: 'all',
    dateRange: { from: null, to: null },
  });
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    tournament_id: '',
    team_id: '',
    category: 'Misc',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const { data: tournaments, isLoading: isLoadingTournaments } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => base44.entities.Tournament.list(),
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['financeTransactions'],
    queryFn: () => base44.entities.FinanceTransaction.list(),
  });

  const { data: teams, isLoading: isLoadingTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: coaches, isLoading: isLoadingCoaches } = useQuery({
    queryKey: ['allCoaches'],
    queryFn: () => base44.entities.CoachTravel.list(),
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.FinanceTransaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeTransactions'] });
      // Reset form but keep modal open
      setNewTransaction({
        tournament_id: '',
        team_id: '',
        category: 'Misc',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id) => base44.entities.FinanceTransaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeTransactions'] });
    }
  });
  
  const filteredTransactions = transactions?.filter(t => {
      const tournamentMatch = filters.tournamentId === 'all' || t.tournament_id === filters.tournamentId;
      const teamMatch = filters.teamId === 'all' || t.team_id === filters.teamId;
      const coachMatch = filters.coachName === 'all' || (t.description && t.description.toLowerCase().includes(filters.coachName.toLowerCase()));
      const date = new Date(t.date);
      const fromMatch = !filters.dateRange.from || date >= filters.dateRange.from;
      const toMatch = !filters.dateRange.to || date <= filters.dateRange.to;

      return tournamentMatch && teamMatch && coachMatch && fromMatch && toMatch;
  }) || [];

  const handleAddTransaction = () => {
    if (newTransaction.tournament_id && newTransaction.description && newTransaction.amount) {
      createTransactionMutation.mutate(newTransaction);
    }
  };

  const handleResetForm = () => {
    setNewTransaction({
      tournament_id: '',
      team_id: '',
      category: 'Misc',
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const exportToCSV = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) return;
  
    const headers = ['Tournament', 'Team', 'Category', 'Description', 'Amount', 'Date'];
    const tournamentMap = new Map(tournaments.map(t => [t.id, t.name]));
    const teamMap = new Map(teams.map(t => [t.id, t.name]));

    const csvRows = [
      headers.join(','),
      ...filteredTransactions.map(row => {
        const rowData = [
          tournamentMap.get(row.tournament_id) || 'N/A',
          teamMap.get(row.team_id) || 'N/A',
          row.category,
          `"${row.description || ''}"`,
          row.amount,
          row.date,
        ];
        return rowData.join(',');
      })
    ];
  
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'finance_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Master Finance Dashboard</h1>
            <p className="text-gray-500">A unified view of all tournament-related expenses.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setAddModalOpen(true)} className="bg-blush-800 hover:bg-blush-800/90 text-black">
              <Plus className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
            <Button onClick={exportToCSV} disabled={!filteredTransactions || filteredTransactions.length === 0} variant="outline">
               <Download className="mr-2 h-4 w-4" /> Export Report
            </Button>
          </div>
        </div>
      
      <FinanceSummaryCards transactions={filteredTransactions} />
      
      <FinanceFilters
        filters={filters}
        setFilters={setFilters}
        tournaments={tournaments || []}
        teams={teams || []}
        coaches={coaches || []}
        isLoading={isLoadingTournaments || isLoadingTeams || isLoadingCoaches}
      />
      
      <DetailedTransactionsTable
        transactions={filteredTransactions}
        tournaments={tournaments || []}
        teams={teams || []}
        isLoading={isLoadingTransactions}
        onDelete={(id) => deleteTransactionMutation.mutate(id)}
      />

      <Dialog open={isAddModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="tournament">Tournament*</Label>
              <Select value={newTransaction.tournament_id} onValueChange={val => setNewTransaction({...newTransaction, tournament_id: val, team_id: ''})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tournament..." />
                </SelectTrigger>
                <SelectContent>
                  {tournaments?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="team">Team</Label>
              <Select value={newTransaction.team_id} onValueChange={val => setNewTransaction({...newTransaction, team_id: val})} disabled={!newTransaction.tournament_id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {teams?.filter(t => t.tournament_id === newTransaction.tournament_id).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category*</Label>
              <Select value={newTransaction.category} onValueChange={val => setNewTransaction({...newTransaction, category: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hotel">Hotel</SelectItem>
                  <SelectItem value="Flight">Flight</SelectItem>
                  <SelectItem value="Meals">Meals</SelectItem>
                  <SelectItem value="Misc">Misc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description*</Label>
              <Input
                id="description"
                value={newTransaction.description}
                onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}
                placeholder="e.g., Hotel booking for Team X"
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount*</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newTransaction.amount}
                onChange={e => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value)})}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="date">Date*</Label>
              <Input
                id="date"
                type="date"
                value={newTransaction.date}
                onChange={e => setNewTransaction({...newTransaction, date: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newTransaction.notes}
                onChange={e => setNewTransaction({...newTransaction, notes: e.target.value})}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Close</Button>
            <Button variant="outline" onClick={handleResetForm}>
              Reset Form
            </Button>
            <Button
              onClick={handleAddTransaction}
              disabled={createTransactionMutation.isPending || !newTransaction.tournament_id || !newTransaction.description || !newTransaction.amount}
              className="bg-blush-800 hover:bg-blush-800/90"
            >
              {createTransactionMutation.isPending ? 'Adding...' : 'Submit & Add Another'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
