import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Check, X, Sparkles, RotateCcw, Mail, Bell } from "lucide-react";
import { format, startOfWeek, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const ChecklistContent = ({ items, isLoading, onAdd, onToggle, onDelete, onEdit, onClearCompleted, newTask, setNewTask, newTaskRecurring, setNewTaskRecurring, dayName }) => {
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");
    const completedCount = items?.filter(item => item.completed).length || 0;
    const totalCount = items?.length || 0;

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditText(item.text);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditText("");
    };

    const saveEdit = (itemId) => {
        if (editText.trim()) {
            onEdit(itemId, editText.trim());
            setEditingId(null);
            setEditText("");
        }
    };

    const getRecurringBadge = (recurring) => {
        if (recurring === 'daily') return <Badge className="bg-blue-100 text-blue-800 text-xs">Daily</Badge>;
        if (recurring === 'weekly') return <Badge className="bg-purple-100 text-purple-800 text-xs">Weekly</Badge>;
        return null;
    };

    return (
        <div>
            <div className="space-y-2 mb-6">
                <Input
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onAdd()}
                    placeholder={`Add a task for ${dayName}... 🎯`}
                    className="flex-1 border-2 border-green-200 focus:border-green-400"
                />
                <div className="flex gap-2">
                    <Select value={newTaskRecurring} onValueChange={setNewTaskRecurring}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Repeats..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No Repeat</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button 
                        onClick={onAdd}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Task
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                {isLoading ? (
                    <p className="text-center text-gray-500 py-8">Loading your checklist...</p>
                ) : items && items.length > 0 ? (
                    items.map((item) => (
                        <div
                            key={item.id}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                                item.completed
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-white border-gray-200 hover:border-green-300'
                            }`}
                        >
                            <Checkbox
                                checked={item.completed}
                                onCheckedChange={() => onToggle(item.id)}
                                className="h-5 w-5"
                                disabled={editingId === item.id}
                            />
                            
                            {editingId === item.id ? (
                                <>
                                    <Input
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') saveEdit(item.id);
                                            if (e.key === 'Escape') cancelEdit();
                                        }}
                                        className="flex-1"
                                        autoFocus
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => saveEdit(item.id)}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={cancelEdit}
                                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1 flex items-center gap-2">
                                        <span
                                            className={`${
                                                item.completed
                                                    ? 'line-through text-gray-500'
                                                    : 'text-gray-800 font-medium'
                                            }`}
                                        >
                                            {item.text}
                                        </span>
                                        {getRecurringBadge(item.recurring)}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => startEdit(item)}
                                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete(item.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">No tasks for {dayName} yet!</p>
                        <p className="text-sm mt-2">Add your first task to get started 🎉</p>
                    </div>
                )}
            </div>

            {totalCount > 0 && (
                <div className="mt-6 space-y-2">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>{completedCount} of {totalCount} completed</span>
                        {completedCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClearCompleted}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                                Clear Completed
                            </Button>
                        )}
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{ width: `${(completedCount / totalCount) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default function Home() {
    const queryClient = useQueryClient();
    const today = format(new Date(), 'EEEE, MMMM d, yyyy');
    const currentDayOfWeek = format(new Date(), 'EEEE').toLowerCase();
    
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const getDayDate = (dayIndex) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + dayIndex);
        return date;
    };
    
    const affirmations = [
        "Today is full of possibilities and opportunities! ✨",
        "You are capable of achieving amazing things! 🌟",
        "Every challenge you face makes you stronger! 💪",
        "Your positive attitude creates positive results! 🌈",
        "You are exactly where you need to be right now! 🎯",
        "Today, you will make a difference! 💫",
        "You have the power to create change! ⭐",
        "Your dedication and hard work will pay off! 🏆",
        "You bring joy and light to those around you! ✨",
        "Success is within your reach today! 🎉"
    ];

    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const todayAffirmation = affirmations[dayOfYear % affirmations.length];

    const daysOfWeek = [
        { key: 'monday', label: 'Monday', emoji: '📅', index: 0 },
        { key: 'tuesday', label: 'Tuesday', emoji: '📝', index: 1 },
        { key: 'wednesday', label: 'Wednesday', emoji: '📋', index: 2 },
        { key: 'thursday', label: 'Thursday', emoji: '📌', index: 3 },
        { key: 'friday', label: 'Friday', emoji: '🎉', index: 4 },
        { key: 'saturday', label: 'Saturday', emoji: '☀️', index: 5 },
        { key: 'sunday', label: 'Sunday', emoji: '🌙', index: 6 }
    ];

    const [activeTab, setActiveTab] = useState(currentDayOfWeek);
    const [newTasks, setNewTasks] = useState({
        monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: ''
    });
    const [newTasksRecurring, setNewTasksRecurring] = useState({
        monday: 'none', tuesday: 'none', wednesday: 'none', thursday: 'none', friday: 'none', saturday: 'none', sunday: 'none'
    });
    const [isUpcomingOpen, setIsUpcomingOpen] = useState(false);
    const [showAllUpcoming, setShowAllUpcoming] = useState(false);
    const [isLeagueOpen, setIsLeagueOpen] = useState(false);
    const [isCustomAlertsOpen, setIsCustomAlertsOpen] = useState(false);
    const [showWeeklyResetDialog, setShowWeeklyResetDialog] = useState(false);
    const [unfinishedTasks, setUnfinishedTasks] = useState({});
    const [selectedTasksToKeep, setSelectedTasksToKeep] = useState(new Set());

    const [upcomingStayPlayTournaments, setUpcomingStayPlayTournaments] = useState([]);
    const [allStayPlayTournaments, setAllStayPlayTournaments] = useState([]);
    const [upcomingLeagues, setUpcomingLeagues] = useState([]);

    const [isAddingAlert, setIsAddingAlert] = useState(false);
    const [editingAlertId, setEditingAlertId] = useState(null);
    const [newAlertTitle, setNewAlertTitle] = useState('');
    const [newAlertDescription, setNewAlertDescription] = useState('');
    const [newAlertType, setNewAlertType] = useState('info');
    const [newAlertReminderDate, setNewAlertReminderDate] = useState('');
    const [newAlertDaysBefore, setNewAlertDaysBefore] = useState('');


    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
        initialData: null,
        staleTime: 0,
    });

    const createTaskQuery = (day) => ({
        queryKey: [`${day}Tasks`],
        queryFn: async () => {
            const userData = await base44.auth.me();
            return userData?.[`${day}_tasks`] || [];
        },
    });

    const { data: tournaments } = useQuery({
        queryKey: ['tournaments'],
        queryFn: () => base44.entities.Tournament.list(),
        initialData: [],
    });

    const { data: leagues } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list(),
        initialData: [],
    });

    const { data: mondayTasks, isLoading: isLoadingMonday } = useQuery(createTaskQuery('monday'));
    const { data: tuesdayTasks, isLoading: isLoadingTuesday } = useQuery(createTaskQuery('tuesday'));
    const { data: wednesdayTasks, isLoading: isLoadingWednesday } = useQuery(createTaskQuery('wednesday'));
    const { data: thursdayTasks, isLoading: isLoadingThursday } = useQuery(createTaskQuery('thursday'));
    const { data: fridayTasks, isLoading: isLoadingFriday } = useQuery(createTaskQuery('friday'));
    const { data: saturdayTasks, isLoading: isLoadingSaturday } = useQuery(createTaskQuery('saturday'));
    const { data: sundayTasks, isLoading: isLoadingSunday } = useQuery(createTaskQuery('sunday'));

    const mondayMutation = useMutation({
        mutationFn: (tasks) => base44.auth.updateMe({ monday_tasks: tasks }),
        onMutate: async (tasks) => {
            await queryClient.cancelQueries({ queryKey: ['mondayTasks'] });
            queryClient.setQueryData(['mondayTasks'], tasks);
        },
    });
    const tuesdayMutation = useMutation({
        mutationFn: (tasks) => base44.auth.updateMe({ tuesday_tasks: tasks }),
        onMutate: async (tasks) => {
            await queryClient.cancelQueries({ queryKey: ['tuesdayTasks'] });
            queryClient.setQueryData(['tuesdayTasks'], tasks);
        },
    });
    const wednesdayMutation = useMutation({
        mutationFn: (tasks) => base44.auth.updateMe({ wednesday_tasks: tasks }),
        onMutate: async (tasks) => {
            await queryClient.cancelQueries({ queryKey: ['wednesdayTasks'] });
            queryClient.setQueryData(['wednesdayTasks'], tasks);
        },
    });
    const thursdayMutation = useMutation({
        mutationFn: (tasks) => base44.auth.updateMe({ thursday_tasks: tasks }),
        onMutate: async (tasks) => {
            await queryClient.cancelQueries({ queryKey: ['thursdayTasks'] });
            queryClient.setQueryData(['thursdayTasks'], tasks);
        },
    });
    const fridayMutation = useMutation({
        mutationFn: (tasks) => base44.auth.updateMe({ friday_tasks: tasks }),
        onMutate: async (tasks) => {
            await queryClient.cancelQueries({ queryKey: ['fridayTasks'] });
            queryClient.setQueryData(['fridayTasks'], tasks);
        },
    });
    const saturdayMutation = useMutation({
        mutationFn: (tasks) => base44.auth.updateMe({ saturday_tasks: tasks }),
        onMutate: async (tasks) => {
            await queryClient.cancelQueries({ queryKey: ['saturdayTasks'] });
            queryClient.setQueryData(['saturdayTasks'], tasks);
        },
    });
    const sundayMutation = useMutation({
        mutationFn: (tasks) => base44.auth.updateMe({ sunday_tasks: tasks }),
        onMutate: async (tasks) => {
            await queryClient.cancelQueries({ queryKey: ['sundayTasks'] });
            queryClient.setQueryData(['sundayTasks'], tasks);
        },
    });

    const updateTournamentMutation = useMutation({
        mutationFn: ({ id, updates }) => base44.entities.Tournament.update(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tournaments'] });
            queryClient.refetchQueries({ queryKey: ['tournaments'] });
        },
    });

    const updateCustomAlertsMutation = useMutation({
        mutationFn: (alerts) => base44.auth.updateMe({ custom_alerts: alerts }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
    });

    const handleMarkEmailSent = (tournamentId) => {
        updateTournamentMutation.mutate({ id: tournamentId, updates: { housing_email_sent: true } });
    };

    const handleMarkLeagueComplete = (tournamentId) => {
        updateTournamentMutation.mutate({ id: tournamentId, updates: { league_home_alert_complete: true } });
    };

    const tasksData = {
        monday: mondayTasks,
        tuesday: tuesdayTasks,
        wednesday: wednesdayTasks,
        thursday: thursdayTasks,
        friday: fridayTasks,
        saturday: saturdayTasks,
        sunday: sundayTasks,
    };

    const loadingStates = {
        monday: isLoadingMonday,
        tuesday: isLoadingTuesday,
        wednesday: isLoadingWednesday,
        thursday: isLoadingThursday,
        friday: isLoadingFriday,
        saturday: isLoadingSaturday,
        sunday: isLoadingSunday,
    };

    const mutations = {
        monday: mondayMutation,
        tuesday: tuesdayMutation,
        wednesday: wednesdayMutation,
        thursday: thursdayMutation,
        friday: fridayMutation,
        saturday: saturdayMutation,
        sunday: sundayMutation,
    };

    const customAlerts = user?.custom_alerts || [];

    const visibleAlerts = useMemo(() => {
        const now = new Date();
        return customAlerts.filter(alert => {
            if (!alert.reminder_date) return true;
            
            const reminderDate = parseISO(alert.reminder_date);
            const daysBefore = parseInt(alert.days_before_reminder) || 0;
            const notificationDate = new Date(reminderDate);
            notificationDate.setDate(notificationDate.getDate() - daysBefore);
            
            return now >= notificationDate;
        });
    }, [customAlerts]);

    const handleAddCustomAlert = () => {
        if (!newAlertTitle.trim()) return;
        const newAlert = {
            id: Date.now(),
            title: newAlertTitle,
            description: newAlertDescription,
            type: newAlertType,
            reminder_date: newAlertReminderDate || null,
            days_before_reminder: newAlertDaysBefore ? parseInt(newAlertDaysBefore) : 0
        };
        updateCustomAlertsMutation.mutate([...customAlerts, newAlert]);
        setNewAlertTitle('');
        setNewAlertDescription('');
        setNewAlertType('info');
        setNewAlertReminderDate('');
        setNewAlertDaysBefore('');
        setIsAddingAlert(false);
    };

    const handleEditAlert = (alert) => {
        setEditingAlertId(alert.id);
        setNewAlertTitle(alert.title);
        setNewAlertDescription(alert.description);
        setNewAlertType(alert.type);
        setNewAlertReminderDate(alert.reminder_date || '');
        setNewAlertDaysBefore(alert.days_before_reminder?.toString() || '');
    };

    const handleSaveEditAlert = () => {
        const updatedAlerts = customAlerts.map(alert =>
            alert.id === editingAlertId
                ? { 
                    ...alert, 
                    title: newAlertTitle, 
                    description: newAlertDescription, 
                    type: newAlertType,
                    reminder_date: newAlertReminderDate || null,
                    days_before_reminder: newAlertDaysBefore ? parseInt(newAlertDaysBefore) : 0
                }
                : alert
        );
        updateCustomAlertsMutation.mutate(updatedAlerts);
        setEditingAlertId(null);
        setNewAlertTitle('');
        setNewAlertDescription('');
        setNewAlertType('info');
        setNewAlertReminderDate('');
        setNewAlertDaysBefore('');
    };

    const handleDeleteAlert = (alertId) => {
        const updatedAlerts = customAlerts.filter(alert => alert.id !== alertId);
        updateCustomAlertsMutation.mutate(updatedAlerts);
    };

    const getAlertColor = (type) => {
        switch(type) {
            case 'urgent': return 'bg-red-50 border-red-200 text-red-800';
            case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            default: return 'bg-blue-50 border-blue-200 text-blue-800';
        }
    };

    const getAlertIcon = (type) => {
        switch(type) {
            case 'urgent': return '🚨';
            case 'warning': return '⚠️';
            default: return '📌';
        }
    };

    useEffect(() => {
        if (user && tasksData.monday !== undefined && !isLoadingMonday) {
            const today = new Date();
            const todayStr = format(today, 'yyyy-MM-dd');
            const lastDailyReset = user.last_daily_reset ? user.last_daily_reset : null;
            
            if (lastDailyReset !== todayStr) {
                const updates = {};
                let needsUpdate = false;
                
                daysOfWeek.forEach(day => {
                    const dayTasks = tasksData[day.key] || [];
                    const updatedTasks = dayTasks.map(task => {
                        if (task.recurring === 'daily' && task.completed) {
                            needsUpdate = true;
                            return { ...task, completed: false };
                        }
                        return task;
                    });
                    updates[`${day.key}_tasks`] = updatedTasks;
                });
                
                if (needsUpdate) {
                    base44.auth.updateMe({
                        ...updates,
                        last_daily_reset: todayStr
                    })
                    .then(() => {
                        daysOfWeek.forEach(day => {
                            queryClient.invalidateQueries({ queryKey: [`${day.key}Tasks`] });
                        });
                    })
                    .catch(error => console.error("Failed to reset daily tasks:", error));
                } else if (lastDailyReset !== todayStr) {
                    base44.auth.updateMe({ last_daily_reset: todayStr })
                        .catch(error => console.error("Failed to update last_daily_reset:", error));
                }
            }
        }
    }, [user, tasksData.monday, isLoadingMonday, queryClient]);

    useEffect(() => {
        if (user && tasksData.monday !== undefined && !isLoadingMonday) {
            const today = new Date();
            const weekStart = startOfWeek(today, { weekStartsOn: 1 });
            const weekStartStr = format(weekStart, 'yyyy-MM-dd');
            const lastReset = user.last_week_reset || null;

            if (lastReset !== weekStartStr) {
                const tasksForReview = {};
                let hasTasksToReview = false;

                daysOfWeek.forEach(day => {
                    const dayTasks = tasksData[day.key] || [];
                    const nonWeeklyTasks = dayTasks.filter(t => t.recurring !== 'weekly');
                    if (nonWeeklyTasks.length > 0) {
                        tasksForReview[day.key] = nonWeeklyTasks;
                        hasTasksToReview = true;
                    }
                });

                if (hasTasksToReview) {
                    setUnfinishedTasks(tasksForReview);
                    setShowWeeklyResetDialog(true);
                } else {
                    base44.auth.updateMe({ last_week_reset: weekStartStr })
                        .then(() => queryClient.invalidateQueries({ queryKey: ['currentUser'] }))
                        .catch(error => console.error("Failed to silently update last_week_reset:", error));
                }
            }
        }
    }, [user, tasksData.monday, isLoadingMonday, queryClient]);

    useEffect(() => {
        if (tournaments) {
            const now = new Date();
            
            // Upcoming tournaments (opening in next 7 days) - for alerts
            const upcoming = tournaments
                .filter(tournament => {
                    if (!tournament.stay_play_required || !tournament.housing_opens_date || tournament.housing_email_sent) return false;
                    const housingOpensDate = parseISO(tournament.housing_opens_date);
                    const daysUntil = Math.ceil((housingOpensDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntil >= 0 && daysUntil <= 7;
                })
                .map(tournament => {
                    const housingOpensDate = parseISO(tournament.housing_opens_date);
                    const daysUntil = Math.ceil((housingOpensDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return { ...tournament, daysUntil, startDate: parseISO(tournament.start_date) };
                })
                .sort((a, b) => a.daysUntil - b.daysUntil);

            // All stay & play tournaments - for "show all" view
            const all = tournaments
                .filter(tournament => tournament.stay_play_required && tournament.housing_opens_date)
                .map(tournament => {
                    const housingOpensDate = parseISO(tournament.housing_opens_date);
                    const daysUntil = Math.ceil((housingOpensDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return { ...tournament, daysUntil, startDate: parseISO(tournament.start_date) };
                })
                .sort((a, b) => a.startDate - b.startDate);

            setUpcomingStayPlayTournaments(upcoming);
            setAllStayPlayTournaments(all);
        }
    }, [tournaments]);

    useEffect(() => {
        if (tournaments && leagues) {
            const now = new Date();
            
            const leagueTournamentsWithDetails = tournaments
                .filter(tournament => {
                    if (!tournament.league_id || !tournament.start_date || tournament.league_home_alert_complete) return false;
                    const tournamentDate = parseISO(tournament.start_date);
                    const daysUntil = Math.ceil((tournamentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntil >= 0 && daysUntil <= 10;
                })
                .map(tournament => {
                    const tournamentDate = parseISO(tournament.start_date);
                    const daysUntil = Math.ceil((tournamentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const league = leagues.find(l => l.id === tournament.league_id);
                    return { 
                        ...tournament, 
                        daysUntil, 
                        startDate: tournamentDate,
                        leagueName: league?.name || 'Unknown League'
                    };
                })
                .sort((a, b) => a.daysUntil - b.daysUntil);

            setUpcomingLeagues(leagueTournamentsWithDetails);
        }
    }, [tournaments, leagues]);

    const handleWeeklyReset = async (keepTasks) => {
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const currentDay = format(today, 'EEEE').toLowerCase();

        const updates = {};

        const weeklyRecurringTasksMap = {};
        daysOfWeek.forEach(day => {
            const dayTasks = tasksData[day.key] || [];
            weeklyRecurringTasksMap[day.key] = dayTasks
                .filter(t => t.recurring === 'weekly')
                .map(t => ({ ...t, completed: false }));
        });

        if (keepTasks && selectedTasksToKeep.size > 0) {
            const selectedNonWeeklyTasksToKeep = [];
            Object.entries(unfinishedTasks).forEach(([, tasks]) => { 
                tasks.forEach(task => {
                    if (selectedTasksToKeep.has(task.id)) {
                        selectedNonWeeklyTasksToKeep.push({ ...task, completed: false });
                    }
                });
            });

            daysOfWeek.forEach(day => {
                let finalTasksForDay = [...weeklyRecurringTasksMap[day.key]];

                if (day.key === currentDay) {
                    finalTasksForDay = [...finalTasksForDay, ...selectedNonWeeklyTasksToKeep];
                }
                updates[`${day.key}_tasks`] = finalTasksForDay;
            });
        } else {
            daysOfWeek.forEach(day => {
                updates[`${day.key}_tasks`] = weeklyRecurringTasksMap[day.key];
            });
        }

        try {
            await base44.auth.updateMe({
                ...updates,
                last_week_reset: weekStartStr
            });

            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            daysOfWeek.forEach(day => {
                queryClient.invalidateQueries({ queryKey: [`${day.key}Tasks`] });
            });

            setShowWeeklyResetDialog(false);
            setUnfinishedTasks({});
            setSelectedTasksToKeep(new Set());
        } catch (error) {
            console.error("Failed to perform weekly task reset:", error);
        }
    };

    const toggleTaskSelection = (taskId) => {
        setSelectedTasksToKeep(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const selectAllUnfinished = () => {
        const allIds = new Set();
        Object.values(unfinishedTasks).forEach(tasks => {
            tasks.forEach(task => allIds.add(task.id));
        });
        setSelectedTasksToKeep(allIds);
    };

    const deselectAllUnfinished = () => {
        setSelectedTasksToKeep(new Set());
    };

    const handleAddTask = async (day) => {
        if (!newTasks[day].trim()) return;
        
        const recurringType = newTasksRecurring[day] || 'none';
        const taskText = newTasks[day];
        const baseTaskId = Date.now();
        
        if (recurringType === 'daily' || recurringType === 'weekly') {
            // Batch update all days at once
            const updates = {};
            daysOfWeek.forEach((dayInfo, index) => {
                const currentTasks = tasksData[dayInfo.key] || [];
                const newTask = {
                    id: baseTaskId + index,
                    text: taskText,
                    completed: false,
                    recurring: recurringType
                };
                updates[`${dayInfo.key}_tasks`] = [...currentTasks, newTask];
            });
            
            // Cancel all queries first to prevent race conditions
            await Promise.all(daysOfWeek.map(dayInfo => 
                queryClient.cancelQueries({ queryKey: [`${dayInfo.key}Tasks`] })
            ));
            
            // Update cache immediately for all days (optimistic update)
            daysOfWeek.forEach(dayInfo => {
                queryClient.setQueryData([`${dayInfo.key}Tasks`], updates[`${dayInfo.key}_tasks`]);
            });
            
            // Then save to backend
            try {
                await base44.auth.updateMe(updates);
            } catch (error) {
                console.error("Failed to add recurring task:", error);
                // Rollback on error
                daysOfWeek.forEach(dayInfo => {
                    queryClient.invalidateQueries({ queryKey: [`${dayInfo.key}Tasks`] });
                });
            }
        } else {
            const currentTasks = tasksData[day] || [];
            const newItems = [...currentTasks, { 
                id: baseTaskId, 
                text: taskText, 
                completed: false,
                recurring: 'none'
            }];
            mutations[day].mutate(newItems);
        }
        
        setNewTasks({ ...newTasks, [day]: '' });
        setNewTasksRecurring({ ...newTasksRecurring, [day]: 'none' });
    };

    const handleToggleTask = (day, taskId) => {
        const currentTasks = tasksData[day] || [];
        const updatedTasks = currentTasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        mutations[day].mutate(updatedTasks);
    };

    const handleEditTask = (day, taskId, newText) => {
        const currentTasks = tasksData[day] || [];
        const updatedTasks = currentTasks.map(task =>
            task.id === taskId ? { ...task, text: newText } : task
        );
        mutations[day].mutate(updatedTasks);
    };

    const handleDeleteTask = (day, taskId) => {
        const currentTasks = tasksData[day] || [];
        const updatedTasks = currentTasks.filter(task => task.id !== taskId);
        mutations[day].mutate(updatedTasks);
    };

    const handleClearCompleted = (day) => {
        const currentTasks = tasksData[day] || [];
        const updatedTasks = currentTasks.filter(task => !task.completed);
        mutations[day].mutate(updatedTasks);
    };

    const getTaskCount = (day) => {
        const tasks = tasksData[day] || [];
        return {
            completed: tasks.filter(t => t.completed).length,
            total: tasks.length
        };
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-green-50 to-white"></div>
            
            {[...Array(50)].map((_, i) => (
                <div
                    key={i}
                    className="snowflake absolute text-2xl"
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${5 + Math.random() * 10}s`,
                    }}
                >
                    ❄️
                </div>
            ))}

            <div className="max-w-7xl mx-auto p-6 relative z-10 flex gap-6">
                <div className="flex-1">
                    <Card className="mb-6 shadow-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-green-50">
                        <CardContent className="pt-6">
                            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-red-600 to-green-600 bg-clip-text text-transparent">
                                Welcome Back! 🎄
                            </h1>
                            <p className="text-xl text-gray-700 mb-2">{today}</p>
                            <p className="text-lg text-gray-600 italic">{todayAffirmation}</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xl border-2 border-green-200 bg-white">
                        <CardHeader className="bg-green-50 border-b-2 border-green-200">
                            <CardTitle className="text-2xl flex items-center gap-2">
                                🎁 Weekly Task Planner
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-7 mb-6 h-auto gap-1 bg-transparent p-1">
                                    {daysOfWeek.map(day => {
                                        const { completed, total } = getTaskCount(day.key);
                                        const isToday = currentDayOfWeek === day.key;
                                        const dayDate = getDayDate(day.index);
                                        return (
                                            <TabsTrigger 
                                                key={day.key} 
                                                value={day.key}
                                                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border-2 transition-all ${
                                                    isToday 
                                                        ? 'bg-green-100 border-green-300' 
                                                        : 'bg-white border-gray-200 hover:border-green-300'
                                                } data-[state=active]:bg-green-200 data-[state=active]:border-green-400`}
                                            >
                                                <span className="text-2xl">{day.emoji}</span>
                                                <span className="text-xs font-semibold">{day.label.slice(0, 3)}</span>
                                                <span className="text-xs text-gray-600 font-normal">
                                                    {format(dayDate, 'MMM d')}
                                                </span>
                                                {total > 0 && (
                                                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">
                                                        {completed}/{total}
                                                    </span>
                                                )}
                                            </TabsTrigger>
                                        );
                                    })}
                                </TabsList>
                                
                                {daysOfWeek.map(day => {
                                    const dayDate = getDayDate(day.index);
                                    const fullDayLabel = `${day.label}, ${format(dayDate, 'MMMM d')}`;
                                    return (
                                        <TabsContent key={day.key} value={day.key}>
                                            <ChecklistContent
                                                items={tasksData[day.key]}
                                                isLoading={loadingStates[day.key]}
                                                onAdd={() => handleAddTask(day.key)}
                                                onToggle={(taskId) => handleToggleTask(day.key, taskId)}
                                                onEdit={(taskId, newText) => handleEditTask(day.key, taskId, newText)}
                                                onDelete={(taskId) => handleDeleteTask(day.key, taskId)}
                                                onClearCompleted={() => handleClearCompleted(day.key)}
                                                newTask={newTasks[day.key]}
                                                setNewTask={(value) => setNewTasks({ ...newTasks, [day.key]: value })}
                                                newTaskRecurring={newTasksRecurring[day.key]}
                                                setNewTaskRecurring={(value) => setNewTasksRecurring({ ...newTasksRecurring, [day.key]: value })}
                                                dayName={fullDayLabel}
                                            />
                                        </TabsContent>
                                    );
                                })}
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                <div className="w-80">
                    <Card className="shadow-xl border-2 border-blue-200 bg-white sticky top-6">
                        <CardHeader className="bg-blue-50 border-b-2 border-blue-200">
                            <CardTitle className="text-xl flex items-center gap-2">
                                🏠 Housing Alerts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ScrollArea className="h-[calc(100vh-200px)]">
                                <div className="space-y-4">
                                    <div>
                                        <button
                                            onClick={() => setIsCustomAlertsOpen(!isCustomAlertsOpen)}
                                            className="w-full flex items-center justify-between p-3 bg-indigo-50 border-2 border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                                        >
                                            <span className="font-semibold text-indigo-700 flex items-center gap-2">
                                                <Bell className="w-4 h-4" />
                                                My Custom Alerts ({visibleAlerts.length})
                                            </span>
                                            <span className="text-indigo-700">{isCustomAlertsOpen ? '▼' : '▶'}</span>
                                        </button>
                                        {isCustomAlertsOpen && (
                                            <div className="mt-2 space-y-2 pl-4">
                                                {visibleAlerts.map(alert => (
                                                    <div key={alert.id} className={`p-3 border rounded ${getAlertColor(alert.type)}`}>
                                                        {editingAlertId === alert.id ? (
                                                            <div className="space-y-2">
                                                                <Input
                                                                    value={newAlertTitle}
                                                                    onChange={(e) => setNewAlertTitle(e.target.value)}
                                                                    placeholder="Alert title"
                                                                    className="text-sm"
                                                                />
                                                                <Textarea
                                                                    value={newAlertDescription}
                                                                    onChange={(e) => setNewAlertDescription(e.target.value)}
                                                                    placeholder="Alert details"
                                                                    className="text-sm"
                                                                    rows={2}
                                                                />
                                                                <Select value={newAlertType} onValueChange={setNewAlertType}>
                                                                    <SelectTrigger className="text-sm">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="info">Info 📌</SelectItem>
                                                                        <SelectItem value="warning">Warning ⚠️</SelectItem>
                                                                        <SelectItem value="urgent">Urgent 🚨</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs">Reminder Date</Label>
                                                                    <Input
                                                                        type="date"
                                                                        value={newAlertReminderDate}
                                                                        onChange={(e) => setNewAlertReminderDate(e.target.value)}
                                                                        className="text-sm"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs">Notify me this many days before</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        value={newAlertDaysBefore}
                                                                        onChange={(e) => setNewAlertDaysBefore(e.target.value)}
                                                                        placeholder="e.g., 3"
                                                                        className="text-sm"
                                                                    />
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Button size="sm" onClick={handleSaveEditAlert} className="flex-1">
                                                                        <Check className="w-4 h-4 mr-1" />
                                                                        Save
                                                                    </Button>
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="outline" 
                                                                        onClick={() => {
                                                                            setEditingAlertId(null);
                                                                            setNewAlertTitle('');
                                                                            setNewAlertDescription('');
                                                                            setNewAlertType('info');
                                                                            setNewAlertReminderDate('');
                                                                            setNewAlertDaysBefore('');
                                                                        }}
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                                    <p className="text-sm font-semibold flex items-center gap-1">
                                                                        <span>{getAlertIcon(alert.type)}</span>
                                                                        {alert.title}
                                                                    </p>
                                                                    <div className="flex gap-1">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="h-6 w-6 p-0"
                                                                            onClick={() => handleEditAlert(alert)}
                                                                        >
                                                                            <Edit className="w-3 h-3" />
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                                                            onClick={() => handleDeleteAlert(alert.id)}
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                {alert.description && (
                                                                    <p className="text-xs mb-2">{alert.description}</p>
                                                                )}
                                                                {alert.reminder_date && (
                                                                    <p className="text-xs text-gray-600 italic">
                                                                        📅 {format(parseISO(alert.reminder_date), 'MMM d, yyyy')}
                                                                        {alert.days_before_reminder > 0 && ` (${alert.days_before_reminder} day${alert.days_before_reminder !== 1 ? 's' : ''} notice)`}
                                                                    </p>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                                
                                                {isAddingAlert ? (
                                                    <div className="p-3 bg-white border-2 border-indigo-300 rounded space-y-2">
                                                        <Input
                                                            value={newAlertTitle}
                                                            onChange={(e) => setNewAlertTitle(e.target.value)}
                                                            placeholder="Alert title..."
                                                            className="text-sm"
                                                            autoFocus
                                                        />
                                                        <Textarea
                                                            value={newAlertDescription}
                                                            onChange={(e) => setNewAlertDescription(e.target.value)}
                                                            placeholder="Alert details (optional)..."
                                                            className="text-sm"
                                                            rows={2}
                                                        />
                                                        <Select value={newAlertType} onValueChange={setNewAlertType}>
                                                            <SelectTrigger className="text-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="info">Info 📌</SelectItem>
                                                                <SelectItem value="warning">Warning ⚠️</SelectItem>
                                                                <SelectItem value="urgent">Urgent 🚨</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Reminder Date (optional)</Label>
                                                            <Input
                                                                type="date"
                                                                value={newAlertReminderDate}
                                                                onChange={(e) => setNewAlertReminderDate(e.target.value)}
                                                                className="text-sm"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Notify me this many days before</Label>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={newAlertDaysBefore}
                                                                onChange={(e) => setNewAlertDaysBefore(e.target.value)}
                                                                placeholder="e.g., 3"
                                                                className="text-sm"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button size="sm" onClick={handleAddCustomAlert} className="flex-1">
                                                                <Check className="w-4 h-4 mr-1" />
                                                                Add
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                onClick={() => {
                                                                    setIsAddingAlert(false);
                                                                    setNewAlertTitle('');
                                                                    setNewAlertDescription('');
                                                                    setNewAlertType('info');
                                                                    setNewAlertReminderDate('');
                                                                    setNewAlertDaysBefore('');
                                                                }}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full border-dashed"
                                                        onClick={() => setIsAddingAlert(true)}
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Add Custom Alert
                                                    </Button>
                                                )}

                                                {visibleAlerts.length === 0 && !isAddingAlert && (
                                                    <div className="p-3 bg-white border border-indigo-200 rounded">
                                                        <p className="text-sm text-gray-500 text-center">No alerts to show</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <button
                                            onClick={() => setIsUpcomingOpen(!isUpcomingOpen)}
                                            className="w-full flex items-center justify-between p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                                        >
                                            <span className="font-semibold text-yellow-700">⏰ Upcoming Stay & Play ({upcomingStayPlayTournaments.length})</span>
                                            <span className="text-yellow-700">{isUpcomingOpen ? '▼' : '▶'}</span>
                                        </button>
                                        {isUpcomingOpen && (
                                            <div className="mt-2 space-y-2 pl-4">
                                                {(showAllUpcoming ? allStayPlayTournaments : upcomingStayPlayTournaments).length > 0 ? (
                                                    <>
                                                    {(showAllUpcoming ? allStayPlayTournaments : upcomingStayPlayTournaments.slice(0, 3)).map(tournament => (
                                                        <div key={tournament.id} className="p-3 bg-white border border-yellow-200 rounded">
                                                            <p className="text-sm font-medium">{tournament.name}</p>
                                                            <p className="text-xs text-gray-600 mt-1">
                                                                Housing opens {tournament.daysUntil === 0 ? 'today!' : 
                                                                 tournament.daysUntil === 1 ? 'tomorrow' : 
                                                                 `in ${tournament.daysUntil} days`}
                                                            </p>
                                                            {tournament.housing_opens_date && (
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {format(parseISO(tournament.housing_opens_date), 'MMM d, yyyy h:mm a')}
                                                                </p>
                                                            )}
                                                            {tournament.location && (
                                                                <p className="text-xs text-gray-500">{tournament.location}</p>
                                                            )}
                                                            <div className="flex gap-2 mt-3">
                                                                {!tournament.housing_email_sent ? (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleMarkEmailSent(tournament.id)}
                                                                        className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                                                        disabled={updateTournamentMutation.isPending}
                                                                    >
                                                                        <Mail className="w-4 h-4 mr-2" />
                                                                        Mark Sent
                                                                    </Button>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium flex-1 justify-center">
                                                                        <Check className="w-4 h-4" />
                                                                        Email Sent
                                                                    </div>
                                                                )}
                                                                <Button
                                                                    asChild
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="flex-1"
                                                                >
                                                                    <Link to={createPageUrl('StayAndPlay')}>
                                                                        View
                                                                    </Link>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {allStayPlayTournaments.length > 3 && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full border-dashed"
                                                            onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                                                        >
                                                            {showAllUpcoming ? '▲ Show Less' : `▼ Show All Tournaments (${allStayPlayTournaments.length} total)`}
                                                        </Button>
                                                    )}
                                                    </>
                                                ) : (
                                                    <div className="p-3 bg-white border border-yellow-200 rounded">
                                                        <p className="text-sm text-gray-500 text-center">No housing opening in the next 7 days</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <button
                                            onClick={() => setIsLeagueOpen(!isLeagueOpen)}
                                            className="w-full flex items-center justify-between p-3 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                                        >
                                            <span className="font-semibold text-purple-700">🏆 League Tournaments ({upcomingLeagues.length})</span>
                                            <span className="text-purple-700">{isLeagueOpen ? '▼' : '▶'}</span>
                                        </button>
                                        {isLeagueOpen && (
                                            <div className="mt-2 space-y-2 pl-4">
                                                {upcomingLeagues.length > 0 ? (
                                                    upcomingLeagues.map(tournament => (
                                                        <div key={tournament.id} className="p-3 bg-white border border-purple-200 rounded">
                                                            <p className="text-sm font-medium">{tournament.name}</p>
                                                            <p className="text-xs text-purple-600 font-medium">{tournament.leagueName}</p>
                                                            <p className="text-xs text-gray-600 mt-1">
                                                                Starts {tournament.daysUntil === 0 ? 'today!' : 
                                                                       tournament.daysUntil === 1 ? 'tomorrow' : 
                                                                       `in ${tournament.daysUntil} days`}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {format(parseISO(tournament.start_date), 'MMM d, yyyy')}
                                                            </p>
                                                            {tournament.location && (
                                                                <p className="text-xs text-gray-500">{tournament.location}</p>
                                                            )}
                                                            <div className="flex gap-2 mt-3">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleMarkLeagueComplete(tournament.id)}
                                                                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                                                    disabled={updateTournamentMutation.isPending}
                                                                >
                                                                    <Check className="w-4 h-4 mr-2" />
                                                                    Mark Complete
                                                                </Button>
                                                                <Button
                                                                    asChild
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="flex-1"
                                                                >
                                                                    <Link to={createPageUrl(`TournamentCommandPage?id=${tournament.id}`)}>
                                                                        View Tournament
                                                                    </Link>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-3 bg-white border border-purple-200 rounded">
                                                        <p className="text-sm text-gray-500 text-center">No league tournaments in the next 10 days</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={showWeeklyResetDialog} onOpenChange={(open) => {
                if (!open) return;
                setShowWeeklyResetDialog(open);
            }}>
                <DialogContent className="max-w-2xl max-h-[80vh]" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <RotateCcw className="w-6 h-6 text-blue-600" />
                            New Week - Task Cleanup Required
                        </DialogTitle>
                        <DialogDescription>
                            Select any tasks you want to keep for this week. All other non-weekly tasks will be removed. (Weekly recurring tasks are kept automatically)
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[50vh] pr-4">
                        <div className="space-y-4 py-4">
                            <div className="flex gap-2 mb-4">
                                <Button size="sm" variant="outline" onClick={selectAllUnfinished}>
                                    Select All
                                </Button>
                                <Button size="sm" variant="outline" onClick={deselectAllUnfinished}>
                                    Deselect All
                                </Button>
                            </div>

                            {Object.entries(unfinishedTasks).map(([day, tasks]) => {
                                const dayInfo = daysOfWeek.find(d => d.key === day);
                                return (
                                    <div key={day} className="border rounded-lg p-4 bg-gray-50">
                                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                            <span className="text-xl">{dayInfo.emoji}</span>
                                            {dayInfo.label}
                                            <span className="text-sm text-gray-500">({tasks.length} task{tasks.length !== 1 ? 's' : ''})</span>
                                        </h3>
                                        <div className="space-y-2">
                                            {tasks.map(task => (
                                                <div key={task.id} className="flex items-center gap-3 p-3 bg-white rounded border">
                                                    <Checkbox
                                                        checked={selectedTasksToKeep.has(task.id)}
                                                        onCheckedChange={() => toggleTaskSelection(task.id)}
                                                        className="h-5 w-5"
                                                    />
                                                    <div className="flex-1 flex items-center gap-2">
                                                        <span className={`flex-1 ${task.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                                                            {task.text}
                                                        </span>
                                                        {task.completed && (
                                                            <Badge className="bg-green-100 text-green-800 text-xs">Completed</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <div className="flex-1 text-sm text-gray-600">
                            {selectedTasksToKeep.size > 0 ? (
                                <span className="font-medium text-blue-600">
                                    {selectedTasksToKeep.size} task{selectedTasksToKeep.size !== 1 ? 's' : ''} will be moved to today
                                </span>
                            ) : (
                                <span>All tasks will be removed (except weekly recurring)</span>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => handleWeeklyReset(false)}
                        >
                            Clear All Tasks
                        </Button>
                        <Button
                            onClick={() => handleWeeklyReset(true)}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {selectedTasksToKeep.size > 0 ? `Keep ${selectedTasksToKeep.size} Selected` : 'Start Fresh Week'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style>{`
                @keyframes fall {
                    0% {
                        transform: translateY(-10vh) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(110vh) rotate(360deg);
                        opacity: 0.8;
                    }
                }
                .snowflake {
                    animation: fall linear infinite;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
}