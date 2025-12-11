
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export default function FinanceFilters({ filters, setFilters, tournaments, teams, coaches, isLoading }) {
  const handleClearDates = () => {
    setFilters(f => ({ ...f, dateRange: { from: null, to: null } }));
  };

  // Get unique coach names from coaches
  const uniqueCoachNames = useMemo(() => {
    if (!coaches) return [];
    const names = [...new Set(coaches.map(c => c.coach_name))].filter(Boolean);
    return names.sort();
  }, [coaches]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Filter className="w-5 h-5" /> Filters</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <Select value={filters.tournamentId} onValueChange={val => setFilters(f => ({...f, tournamentId: val, teamId: 'all'}))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Tournament..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tournaments</SelectItem>
            {tournaments.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.teamId} onValueChange={val => setFilters(f => ({...f, teamId: val}))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Team..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {filters.tournamentId === 'all'
              ? teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
              : teams.filter(t => t.tournament_id === filters.tournamentId).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
            }
          </SelectContent>
        </Select>

        <Select value={filters.coachName} onValueChange={val => setFilters(f => ({...f, coachName: val}))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Coach..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Coaches</SelectItem>
            {uniqueCoachNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-[160px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange?.from ? format(filters.dateRange.from, "LLL dd, y") : <span>Start date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={filters.dateRange.from}
                        onSelect={(date) => setFilters(f => ({ ...f, dateRange: { ...f.dateRange, from: date } }))}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            <span className="text-gray-500">-</span>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-[160px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange?.to ? format(filters.dateRange.to, "LLL dd, y") : <span>End date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={filters.dateRange.to}
                        onSelect={(date) => setFilters(f => ({ ...f, dateRange: { ...f.dateRange, to: date } }))}
                        disabled={(date) => filters.dateRange.from && date < filters.dateRange.from}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            {(filters.dateRange?.from || filters.dateRange?.to) && (
                <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleClearDates}
                    className="h-10 w-10"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
