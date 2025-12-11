
import { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, BedDouble, Users, Trash2, Info } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RoomList({ tournamentId }) {
    const queryClient = useQueryClient();
    const [isModalOpen, setModalOpen] = useState(false);
    const [newRoom, setNewRoom] = useState({ room_number: '', hotel: '', room_type: '', cost_per_night: 0, nights: 0 });

    const { data: rooms, isLoading } = useQuery({
        queryKey: ['rooms', tournamentId],
        queryFn: () => base44.entities.Room.filter({ tournament_id: tournamentId }),
        enabled: !!tournamentId,
    });

    const { data: coaches } = useQuery({
        queryKey: ['coaches', tournamentId],
        queryFn: () => base44.entities.CoachTravel.filter({ tournament_id: tournamentId }),
        enabled: !!tournamentId,
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Room.create({ ...data, tournament_id: tournamentId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms', tournamentId] });
            setModalOpen(false);
            setNewRoom({ room_number: '', hotel: '', room_type: '', cost_per_night: 0, nights: 0 });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (roomId) => base44.entities.Room.delete(roomId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms', tournamentId] });
        }
    });

    const totalCost = useMemo(() => rooms?.reduce((acc, room) => acc + (room.cost_per_night * room.nights), 0) || 0, [rooms]);

    // Get coaches with rooming notes who aren't assigned to rooms yet
    const unassignedCoachesWithNotes = useMemo(() => {
        if (!coaches || !rooms) return [];
        const assignedCoachIds = new Set();
        rooms.forEach(room => {
            (room.occupants || []).forEach(coachId => assignedCoachIds.add(coachId));
        });
        return coaches.filter(c => c.rooming_notes && !assignedCoachIds.has(c.id));
    }, [coaches, rooms]);

    const getCoachName = (coachId) => {
        return coaches?.find(c => c.id === coachId)?.coach_name || 'Unknown';
    };

    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="flex items-center gap-2"><BedDouble /> Room List & Pairing</CardTitle>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                        // Navigate to Travel page for room assignment
                        window.location.href = '/Travel';
                    }}><Users className="w-4 h-4 mr-2" /> Assign Roommates</Button>
                    <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Room</Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Alert for coaches with rooming notes */}
                {unassignedCoachesWithNotes.length > 0 && (
                    <Alert className="mb-4 bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            <strong>{unassignedCoachesWithNotes.length} coach{unassignedCoachesWithNotes.length !== 1 ? 'es' : ''} with rooming preferences not yet assigned:</strong>
                            <ul className="mt-2 ml-4 list-disc">
                                {unassignedCoachesWithNotes.map(coach => (
                                    <li key={coach.id} className="text-sm">
                                        {coach.coach_name}: <span className="italic text-gray-600">{coach.rooming_notes}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="mt-2"
                                onClick={() => window.location.href = '/Travel'}
                            >
                                Go to Travel Page to Assign
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Room #</TableHead>
                            <TableHead>Hotel</TableHead>
                            <TableHead>Room Type</TableHead>
                            <TableHead>Occupants</TableHead>
                            <TableHead>Cost/Night</TableHead>
                            <TableHead>Nights</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan="8">Loading...</TableCell></TableRow>}
                        {rooms?.map(room => (
                            <TableRow key={room.id}>
                                <TableCell>{room.room_number}</TableCell>
                                <TableCell>{room.hotel}</TableCell>
                                <TableCell>{room.room_type}</TableCell>
                                <TableCell>
                                    {room.occupants && room.occupants.length > 0 ? (
                                        <div className="text-sm">
                                            {room.occupants.map(coachId => (
                                                <div key={coachId}>{getCoachName(coachId)}</div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-sm">Empty</span>
                                    )}
                                </TableCell>
                                <TableCell>${room.cost_per_night?.toFixed(2)}</TableCell>
                                <TableCell>{room.nights}</TableCell>
                                <TableCell>${(room.cost_per_night * room.nights).toFixed(2)}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(room.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {rooms?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan="8" className="text-center text-gray-500 py-8">
                                    No rooms added yet. Click "Add Room" to start.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <div className="text-right font-bold mt-4">Total Hotel Cost: ${totalCost.toFixed(2)}</div>
            </CardContent>

             <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add New Room</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input placeholder="Room #" value={newRoom.room_number} onChange={e => setNewRoom({...newRoom, room_number: e.target.value})} />
                        <Input placeholder="Hotel" value={newRoom.hotel} onChange={e => setNewRoom({...newRoom, hotel: e.target.value})} />
                        <Input placeholder="Room Type (e.g., 2 Queen)" value={newRoom.room_type} onChange={e => setNewRoom({...newRoom, room_type: e.target.value})} />
                        <Input type="number" placeholder="Cost per Night" value={newRoom.cost_per_night} onChange={e => setNewRoom({...newRoom, cost_per_night: parseFloat(e.target.value)})} />
                        <Input type="number" placeholder="Number of Nights" value={newRoom.nights} onChange={e => setNewRoom({...newRoom, nights: parseInt(e.target.value)})} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => createMutation.mutate(newRoom)} disabled={createMutation.isPending}>{createMutation.isPending ? "Adding..." : "Add Room"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
