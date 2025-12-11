
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Building, Phone, Info, Edit, Plane } from 'lucide-react'; // Added Plane icon
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Badge } from '@/components/ui/badge'; // Badge import removed as it's not used
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function TournamentHeader({ tournament, onUpdate }) {
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        location: '',
        preferred_airport: '', // Added new field
        start_date: '',
        end_date: '',
        status: 'Not Started', // Added status default
        housing_partner: '',
        contact_info: '',
        stay_play_requirements: '',
        gender_focus: '',
        housing_required: true // Added housing_required default
    });

    const statusColors = {
        "Not Started": "bg-gray-200 text-gray-800",
        "In Progress": "bg-yellow-100 text-yellow-800",
        "Complete": "bg-green-100 text-green-800",
    };

    const formatDateDisplay = (dateString) => {
        if (!dateString) return 'TBA';
        // Parse the date string and format it, avoiding timezone issues
        const date = parseISO(dateString);
        return format(date, 'MMM d, yyyy');
    };

    const handleOpenEdit = () => {
        setEditData({
            name: tournament.name || '',
            location: tournament.location || '',
            preferred_airport: tournament.preferred_airport || '', // Populate preferred_airport
            start_date: tournament.start_date || '',
            end_date: tournament.end_date || '',
            status: tournament.status || 'Not Started', // Populate status
            housing_partner: tournament.housing_partner || '',
            contact_info: tournament.contact_info || '',
            stay_play_requirements: tournament.stay_play_requirements || '',
            gender_focus: tournament.gender_focus || 'Boys', // Default to Boys if not set
            housing_required: tournament.housing_required !== undefined ? tournament.housing_required : true // Handle housing_required
        });
        setEditModalOpen(true);
    };

    const handleSave = () => {
        onUpdate(editData);
        setEditModalOpen(false);
    };

    return (
        <>
            <Card className="mb-6"> {/* Updated Card styling */}
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl">{tournament.name}</CardTitle> {/* Updated CardTitle styling */}
                        {tournament.location && (
                            <p className="text-gray-600 mt-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {tournament.location}
                            </p>
                        )}
                        {tournament.preferred_airport && (
                            <p className="text-gray-600 mt-1 flex items-center gap-2">
                                <Plane className="w-4 h-4" />
                                Preferred Airport: <span className="font-semibold">{tournament.preferred_airport}</span>
                            </p>
                        )}
                    </div>
                    {/* Updated Edit Button */}
                    <Button variant="outline" size="sm" onClick={handleOpenEdit}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Details
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-700">
                        {/* Status Select remains here for quick update */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Status:</span>
                            <Select
                                value={tournament.status}
                                onValueChange={(value) => onUpdate({ status: value })}
                            >
                                <SelectTrigger className={`w-[180px] rounded-full font-semibold ${statusColors[tournament.status]}`}>
                                    <SelectValue placeholder="Set status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Not Started">Not Started</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Complete">Complete</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blush-800" />
                            <span>
                                {formatDateDisplay(tournament.start_date)} - {formatDateDisplay(tournament.end_date)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-blush-800" />
                            <span>Housing Partner: {tournament.housing_partner || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-blush-800" />
                            <span>Contact: {tournament.contact_info || 'N/A'}</span>
                        </div>
                        {/* New fields display */}
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-blush-800" />
                            <span>Gender Focus: {tournament.gender_focus || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-blush-800" />
                            <span>Housing Required: {tournament.housing_required ? 'Yes' : 'No'}</span>
                        </div>
                        {/* End new fields display */}
                        <div className="flex items-start col-span-1 md:col-span-2 gap-2">
                            <Info className="w-4 h-4 text-blush-800 mt-1 flex-shrink-0" />
                            <span>Stay & Play: {tournament.stay_play_requirements || 'N/A'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isEditModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"> {/* Updated DialogContent className */}
                    <DialogHeader>
                        <DialogTitle>Edit Tournament Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4"> {/* Updated form layout */}
                        <div>
                            <Label htmlFor="name">Tournament Name</Label>
                            <Input
                                id="name"
                                value={editData.name || ''}
                                onChange={e => setEditData({...editData, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={editData.location || ''}
                                onChange={e => setEditData({...editData, location: e.target.value})}
                                placeholder="e.g., UC Davis Bay Area Sites"
                            />
                        </div>
                        <div>
                            <Label htmlFor="preferred_airport">Preferred Airport</Label>
                            <Input
                                id="preferred_airport"
                                value={editData.preferred_airport || ''}
                                onChange={e => setEditData({...editData, preferred_airport: e.target.value})}
                                placeholder="e.g., SFO, OAK, SJC"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="start_date">Start Date</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={editData.start_date || ''}
                                    onChange={e => setEditData({...editData, start_date: e.target.value})}
                                />
                            </div>
                            <div>
                                <Label htmlFor="end_date">End Date</Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={editData.end_date || ''}
                                    onChange={e => setEditData({...editData, end_date: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Gender Focus Select */}
                        <div>
                            <Label htmlFor="gender-focus">Gender Focus</Label>
                            <Select
                                value={editData.gender_focus || 'Boys'}
                                onValueChange={(val) => setEditData({...editData, gender_focus: val})}
                            >
                                <SelectTrigger id="gender-focus">
                                    <SelectValue placeholder="Select gender focus" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Boys">Boys</SelectItem>
                                    <SelectItem value="Girls">Girls</SelectItem>
                                    <SelectItem value="Mixed">Mixed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Housing Required Checkbox */}
                        <div className="flex items-center space-x-2 mt-4">
                            <input
                                type="checkbox"
                                id="housing-required"
                                checked={editData.housing_required !== false} // Controlled component, ensure boolean
                                onChange={(e) => setEditData({...editData, housing_required: e.target.checked})}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="housing-required" className="cursor-pointer text-sm text-gray-600">
                                This tournament requires housing arrangements
                            </Label>
                        </div>

                        <div>
                            <Label htmlFor="housing_partner">Housing Partner</Label>
                            <Input
                                id="housing_partner"
                                value={editData.housing_partner || ''}
                                onChange={e => setEditData({...editData, housing_partner: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label htmlFor="contact_info">Contact Info</Label>
                            <Input
                                id="contact_info"
                                value={editData.contact_info || ''}
                                onChange={e => setEditData({...editData, contact_info: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label htmlFor="stay_play_requirements">Stay & Play Requirements</Label>
                            <Textarea
                                id="stay_play_requirements"
                                value={editData.stay_play_requirements || ''}
                                onChange={e => setEditData({...editData, stay_play_requirements: e.target.value})}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Changes</Button> {/* Removed inline styling */}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
