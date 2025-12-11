import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hotel, Edit, ExternalLink, Clock, AlertCircle, CheckCircle, Mail, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function StayAndPlay() {
    const queryClient = useQueryClient();
    const [editingTournament, setEditingTournament] = useState(null);
    const [housingOpensDate, setHousingOpensDate] = useState('');
    const [housingNotes, setHousingNotes] = useState('');

    const { data: tournaments, isLoading } = useQuery({
        queryKey: ['tournaments'],
        queryFn: () => base44.entities.Tournament.list('-start_date'),
    });

    const updateTournamentMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Tournament.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tournaments'] });
            setEditingTournament(null);
            setHousingOpensDate('');
            setHousingNotes('');
        }
    });

    const tournamentsWithStayPlay = tournaments?.filter(t => t.stay_play_required === true) || [];

    const needsEmailAlert = useMemo(() => {
        const now = new Date();
        return tournamentsWithStayPlay.filter(t => {
            if (!t.housing_opens_date || t.housing_email_sent) return false;
            const opensDate = parseISO(t.housing_opens_date);
            const daysUntil = differenceInDays(opensDate, now);
            return daysUntil <= 3 && daysUntil >= 0;
        });
    }, [tournamentsWithStayPlay]);

    const handleOpenEditModal = (tournament) => {
        setEditingTournament(tournament);
        if (tournament.housing_opens_date) {
            const dateStr = tournament.housing_opens_date.substring(0, 16);
            setHousingOpensDate(dateStr);
        } else {
            setHousingOpensDate('');
        }
        setHousingNotes(tournament.housing_notes || '');
    };

    const handleSaveHousingInfo = () => {
        if (editingTournament) {
            const updateData = { housing_notes: housingNotes };
            if (housingOpensDate) {
                const isoDate = housingOpensDate.length === 16 ? housingOpensDate + ':00' : housingOpensDate;
                updateData.housing_opens_date = isoDate;
            }
            updateTournamentMutation.mutate({
                id: editingTournament.id,
                data: updateData
            });
        }
    };

    const handleMarkEmailSent = (tournamentId) => {
        updateTournamentMutation.mutate({
            id: tournamentId,
            data: { housing_email_sent: true }
        });
    };

    const getHousingStatus = (tournament) => {
        if (!tournament.housing_opens_date) return null;
        const opensDate = parseISO(tournament.housing_opens_date);
        const now = new Date();
        const daysUntil = differenceInDays(opensDate, now);

        if (isPast(opensDate)) {
            return { text: 'Housing Open', color: 'bg-green-100 text-green-800' };
        }
        if (daysUntil <= 3 && !tournament.housing_email_sent) {
            return { text: `Opens in ${daysUntil} days - Send Email!`, color: 'bg-red-100 text-red-800' };
        }
        return { text: 'Housing Opens Soon', color: 'bg-yellow-100 text-yellow-800' };
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Stay & Play Requirements</h1>
                <p className="text-gray-500 mt-1">Manage hotel stay & play requirements for tournaments</p>
            </div>

            {needsEmailAlert.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertTitle className="text-red-800 font-bold">Action Required: Send Housing Emails</AlertTitle>
                    <AlertDescription className="text-red-700">
                        {needsEmailAlert.length} tournament{needsEmailAlert.length !== 1 ? 's have' : ' has'} housing opening within 3 days. Send housing emails to families!
                        <div className="mt-3 space-y-2">
                            {needsEmailAlert.map(t => (
                                <div key={t.id} className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                                    <div>
                                        <p className="font-semibold text-gray-900">{t.name}</p>
                                        <p className="text-sm text-gray-600">
                                            Housing opens: {format(parseISO(t.housing_opens_date), 'MMM d, yyyy h:mm a')}
                                        </p>
                                        {t.housing_notes && (
                                            <p className="text-xs text-gray-500 mt-1 italic">Note: {t.housing_notes}</p>
                                        )}
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleMarkEmailSent(t.id)}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <Mail className="w-4 h-4 mr-2" />
                                        Mark Email Sent
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {isLoading ? (
                <p>Loading tournaments...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tournamentsWithStayPlay.map(tournament => {
                        const housingStatus = getHousingStatus(tournament);
                        
                        return (
                            <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Hotel className="w-5 h-5 text-sage-800" />
                                        {tournament.name}
                                    </CardTitle>
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        {tournament.start_date && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-800">
                                                {format(parseISO(tournament.start_date), 'MMM d, yyyy')}
                                            </Badge>
                                        )}
                                        {tournament.housing_required && (
                                            <Badge variant="outline" className="bg-sage-100 text-sage-800">Housing Required</Badge>
                                        )}
                                        {tournament.housing_partner && (
                                            <Badge variant="outline">{tournament.housing_partner}</Badge>
                                        )}
                                        {housingStatus && (
                                            <Badge className={housingStatus.color}>
                                                {housingStatus.text}
                                            </Badge>
                                        )}
                                        {tournament.housing_email_sent && (
                                            <Badge className="bg-green-100 text-green-800">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Email Sent
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {tournament.location && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Location:</p>
                                            <p className="text-sm text-gray-600">{tournament.location}</p>
                                        </div>
                                    )}
                                    {tournament.housing_opens_date && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                Housing Opens:
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {format(parseISO(tournament.housing_opens_date), 'MMM d, yyyy h:mm a')}
                                            </p>
                                        </div>
                                    )}
                                    {tournament.housing_notes && (
                                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                            <p className="text-sm font-medium text-blue-900 flex items-center gap-1 mb-1">
                                                <FileText className="w-4 h-4" />
                                                Housing Notes:
                                            </p>
                                            <p className="text-sm text-blue-800 whitespace-pre-wrap">{tournament.housing_notes}</p>
                                        </div>
                                    )}
                                    {tournament.stay_play_requirements && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 mb-2">Requirements:</p>
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{tournament.stay_play_requirements}</p>
                                        </div>
                                    )}
                                    {tournament.contact_info && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Contact:</p>
                                            <p className="text-sm text-gray-600">{tournament.contact_info}</p>
                                        </div>
                                    )}
                                    <div className="flex gap-2 pt-2 flex-wrap">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 min-w-[140px]"
                                            onClick={() => handleOpenEditModal(tournament)}
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit Housing Info
                                        </Button>
                                        {tournament.housing_opens_date && !tournament.housing_email_sent && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 min-w-[140px] border-green-500 text-green-700 hover:bg-green-50"
                                                onClick={() => handleMarkEmailSent(tournament.id)}
                                            >
                                                <Mail className="w-4 h-4 mr-2" />
                                                Mark Email Sent
                                            </Button>
                                        )}
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 min-w-[140px]"
                                        >
                                            <Link to={`${createPageUrl('TournamentCommandPage')}?id=${tournament.id}`}>
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                View Tournament
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    {tournamentsWithStayPlay.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            <Hotel className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No Stay & Play Tournaments</p>
                            <p className="text-sm mt-2">Toggle "S&P" checkbox on tournaments to see them here</p>
                        </div>
                    )}
                </div>
            )}

            <Dialog open={!!editingTournament} onOpenChange={(open) => !open && setEditingTournament(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Housing Information</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="housing-opens">Housing Opens Date & Time</Label>
                            <Input
                                id="housing-opens"
                                type="datetime-local"
                                value={housingOpensDate}
                                onChange={(e) => setHousingOpensDate(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                You'll get an alert 3 days before to send emails to families
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="housing-notes">Housing Notes</Label>
                            <Textarea
                                id="housing-notes"
                                value={housingNotes}
                                onChange={(e) => setHousingNotes(e.target.value)}
                                placeholder="e.g., Working with housing partner to secure team block, waiting for confirmation, special arrangements..."
                                rows={4}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Track special circumstances, coordination status, or reminders
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTournament(null)}>Cancel</Button>
                        <Button 
                            onClick={handleSaveHousingInfo}
                            disabled={updateTournamentMutation.isPending}
                        >
                            {updateTournamentMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}