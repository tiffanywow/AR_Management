import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, CheckCircle2, Clock, Send, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, addMonths, subMonths } from 'date-fns';

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  type: 'broadcast' | 'task' | 'campaign';
  status: string;
  description?: string;
}

export default function Calendar() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarEvents();
  }, [currentDate]);

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const calendarEvents: CalendarEvent[] = [];

      const { data: broadcasts, error: broadcastError } = await supabase
        .from('broadcasts')
        .select('id, content, scheduled_for, status')
        .not('scheduled_for', 'is', null)
        .gte('scheduled_for', monthStart.toISOString())
        .lte('scheduled_for', monthEnd.toISOString());

      if (broadcastError) throw broadcastError;

      broadcasts?.forEach(broadcast => {
        if (broadcast.scheduled_for) {
          calendarEvents.push({
            id: broadcast.id,
            date: new Date(broadcast.scheduled_for),
            title: broadcast.content.substring(0, 50) + (broadcast.content.length > 50 ? '...' : ''),
            type: 'broadcast',
            status: broadcast.status,
            description: 'Scheduled Post'
          });
        }
      });

      const { data: tasks, error: taskError } = await supabase
        .from('campaign_tasks')
        .select('id, title, due_date, status')
        .not('due_date', 'is', null)
        .gte('due_date', monthStart.toISOString())
        .lte('due_date', monthEnd.toISOString());

      if (taskError) throw taskError;

      tasks?.forEach(task => {
        if (task.due_date) {
          calendarEvents.push({
            id: task.id,
            date: new Date(task.due_date),
            title: task.title,
            type: 'task',
            status: task.status,
            description: 'Campaign Task'
          });
        }
      });

      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name, start_date, end_date, status')
        .or(`start_date.gte.${monthStart.toISOString()},end_date.lte.${monthEnd.toISOString()}`);

      if (campaignError) throw campaignError;

      campaigns?.forEach(campaign => {
        if (campaign.start_date) {
          calendarEvents.push({
            id: campaign.id,
            date: new Date(campaign.start_date),
            title: campaign.name,
            type: 'campaign',
            status: campaign.status,
            description: 'Campaign Start Date'
          });
        }
        if (campaign.end_date) {
          calendarEvents.push({
            id: `${campaign.id}-end`,
            date: new Date(campaign.end_date),
            title: campaign.name,
            type: 'campaign',
            status: campaign.status,
            description: 'Campaign End Date'
          });
        }
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'broadcast':
        return <Send className="h-3 w-3" strokeWidth={1.5} />;
      case 'task':
        return <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />;
      case 'campaign':
        return <Target className="h-3 w-3" strokeWidth={1.5} />;
      default:
        return <Clock className="h-3 w-3" strokeWidth={1.5} />;
    }
  };

  const getEventColor = (type: string, status: string) => {
    if (status === 'completed' || status === 'published') {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    switch (type) {
      case 'broadcast':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'task':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'campaign':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
        <p className="text-gray-600 font-light">View scheduled posts, tasks, and campaign dates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">
                {format(currentDate, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-0"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-0"
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-0"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                  {day}
                </div>
              ))}

              {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {daysInMonth.map((day) => {
                const dayEvents = getEventsForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square p-2 rounded-lg border transition-colors bg-gray-50
                      ${isSelected ? 'bg-gray-200 border-gray-300' : 'border-gray-200 hover:bg-gray-100'}
                      ${isTodayDate ? 'ring-2 ring-[#d1242a] ring-opacity-50' : ''}
                      ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex flex-col h-full">
                      <span className={`text-sm ${isTodayDate ? 'font-bold text-[#d1242a]' : 'font-medium text-gray-900'}`}>
                        {format(day, 'd')}
                      </span>
                      <div className="flex flex-col gap-1 mt-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={`h-1 rounded-full ${getEventColor(event.type, event.status).split(' ')[0]}`}
                          />
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-xs text-gray-500">+{dayEvents.length - 2}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </CardTitle>
            <CardDescription>
              {selectedDateEvents.length > 0
                ? `${selectedDateEvents.length} event${selectedDateEvents.length > 1 ? 's' : ''}`
                : 'No events scheduled'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 border rounded-lg ${getEventColor(event.type, event.status)}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs opacity-75 mt-1">{event.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {event.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedDate ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-gray-600">No events scheduled for this date</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-gray-600">Click on a date to view events</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-700">Scheduled Posts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-700">Campaign Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-500" />
              <span className="text-sm text-gray-700">Campaign Dates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-700">Completed/Published</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full ring-2 ring-[#d1242a] ring-opacity-50" />
              <span className="text-sm text-gray-700">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
