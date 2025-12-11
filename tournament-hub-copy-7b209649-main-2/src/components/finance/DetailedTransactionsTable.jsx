import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export default function DetailedTransactionsTable({ transactions, tournaments, teams, isLoading, onDelete }) {
  const tournamentMap = new Map(tournaments.map(t => [t.id, t.name]));
  const teamMap = new Map(teams.map(t => [t.id, t.name]));

  const categoryColors = {
    'Hotel': 'bg-sage-100 text-sage-800',
    'Flight': 'bg-blush-100 text-blush-800',
    'Meals': 'bg-lavender-100 text-lavender-800',
    'Misc': 'bg-gray-100 text-gray-800'
  };

  return (
    <Card>
      <CardHeader><CardTitle>Detailed Transactions</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tournament</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array(5).fill(0).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan="7"><Skeleton className="h-5 w-full" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && transactions.map(t => (
              <TableRow key={t.id}>
                <TableCell>
                  <Link to={createPageUrl(`TournamentCommandPage?id=${t.tournament_id}`)} className="hover:underline text-blush-800 font-medium">
                    {tournamentMap.get(t.tournament_id) || 'N/A'}
                  </Link>
                </TableCell>
                <TableCell>{teamMap.get(t.team_id) || 'N/A'}</TableCell>
                <TableCell>
                  <Badge className={categoryColors[t.category]}>{t.category}</Badge>
                </TableCell>
                <TableCell>{t.description}</TableCell>
                <TableCell>{format(new Date(t.date), 'MMM d, yyyy')}</TableCell>
                <TableCell className="text-right font-medium">${t.amount.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  {onDelete && (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(t.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && transactions.length === 0 && (
                <TableRow>
                    <TableCell colSpan="7" className="text-center text-gray-500 py-8">No transactions found for the selected filters.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}