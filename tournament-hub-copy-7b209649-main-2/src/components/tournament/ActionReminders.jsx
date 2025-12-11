import { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Bell, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';

export default function ActionReminders({ tournamentId }) {
    const queryClient = useQueryClient();
    const [isModalOpen, setModalOpen] = useState(false);
    const [newReminder, setNewReminder] = useState({ description: '', due_date: '', notes: '', status: 'To Do' });

    const { data: reminders, isLoading } = useQuery({
        queryKey: ['reminders', tournamentId],
        queryFn: () => base44.entities.ActionReminder.filter({ tournament_id: tournamentId }, '-due_date'),
        enabled: !!tournamentId,
    });
    
    const mutation = useMutation({
        mutationFn: (data) => base44.entities.ActionReminder.create({ ...data, tournament_id: tournamentId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders', tournamentId] });
            setModalOpen(false);
            setNewReminder({ description: '', due_date: '', notes: '', status: 'To Do' });
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => base44.entities.ActionReminder.update(id, { status }),
        onSuccess: () => queryClient.invalidateQueries(['reminders', tournamentId]),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ActionReminder.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['reminders', tournamentId]),
    });

    const statusColors = {
        'To Do': 'border-mist-blue-800 bg-mist-blue-100/50',
        'In Progress': 'border-blush-800 bg-blush-100/50',
        'Done': 'border-sage-800 bg-sage-100/50',
    };

    return (
        <Card className="sticky top-6">
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="flex items-center gap-2"><Bell /> Action Reminders</CardTitle>
                <Button size="icon" variant="ghost" onClick={() => setModalOpen(true)}><Plus /></Button>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
                {isLoading && <p>Loading reminders...</p>}
                {reminders?.map(reminder => (
                    <div key={reminder.id} className={`p-3 border-l-4 rounded ${statusColors[reminder.status]}`}>
                        <div className="flex justify-between items-start">
                           <p className="font-semibold">{reminder.description}</p>
                           <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMutation.mutate(reminder.id)}><Trash2 className="h-4 w-4 text-red-400 hover:text-red-600"/></Button>
                        </div>
                        <p className="text-sm text-gray-500">Due: {reminder.due_date ? format(new Date(reminder.due_date), 'MMM d, yyyy') : 'N/A'}</p>
                        {reminder.notes && <p className="text-xs italic mt-1">{reminder.notes}</p>}
                        <Select value={reminder.status} onValueChange={(status) => updateStatusMutation.mutate({ id: reminder.id, status })}>
                            <SelectTrigger className="w-full mt-2 h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="To Do">To Do</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Done">Done</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                ))}
            </CardContent>

             <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>New Reminder</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input placeholder="Description (e.g., Book flights for Team X)" value={newReminder.description} onChange={e => setNewReminder({...newReminder, description: e.target.value})} />
                        <Input type="date" value={newReminder.due_date} onChange={e => setNewReminder({...newReminder, due_date: e.target.value})} />
                        <Textarea placeholder="Optional notes" value={newReminder.notes} onChange={e => setNewReminder({...newReminder, notes: e.target.value})} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => mutation.mutate(newReminder)} disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Reminder"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}