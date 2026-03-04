import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, BarChart3, Clock, CheckCircle2, Users, X, Save, Send, Edit, PlayCircle, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { sendRoleNotification } from '@/lib/notificationTriggers';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface PollOption {
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  description: string | null;
  poll_type: string | null;
  options: PollOption[];
  status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  total_votes: number | null;
  total_participants: number | null;
  results: any;
  target_communities: string[] | null;
  created_at: string;
  created_by: string | null;
}

export default function Polls() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [editingPollStatus, setEditingPollStatus] = useState<string | null>(null);
  const [closePollId, setClosePollId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    question: '',
    description: '',
    poll_type: 'single',
    duration_days: '7',
    target_communities: [] as string[],
  });

  const [optionInputs, setOptionInputs] = useState<string[]>(['', '']);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    fetchPolls();
    fetchCommunities();
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
  }, [searchParams]);

  const fetchPolls = async () => {
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPolls(data || []);
    } catch (error) {
      console.error('Error fetching polls:', error);
    }
  };

  const fetchCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCommunities(data || []);
    } catch (error) {
      console.error('Error fetching communities:', error);
    }
  };

  const handleAddOption = () => {
    if (optionInputs.length < 6) {
      setOptionInputs([...optionInputs, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (optionInputs.length > 2) {
      setOptionInputs(optionInputs.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...optionInputs];
    newOptions[index] = value;
    setOptionInputs(newOptions);
  };

  const handleEditPoll = (poll: Poll) => {
    setEditingPollId(poll.id);
    setEditingPollStatus(poll.status);
    setFormData({
      question: poll.question,
      description: poll.description || '',
      poll_type: poll.poll_type || 'single',
      duration_days: '7',
      target_communities: Array.isArray(poll.target_communities) ? poll.target_communities : [],
    });
    setOptionInputs(poll.options.map(opt => opt.text));
    setStartDate(poll.scheduled_start ? new Date(poll.scheduled_start) : null);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPollId(null);
    setEditingPollStatus(null);
    setFormData({
      question: '',
      description: '',
      poll_type: 'single',
      duration_days: '7',
      target_communities: [],
    });
    setOptionInputs(['', '']);
    setCustomDateRange(undefined);
    setStartDate(null);
  };

  const handleSavePoll = async (broadcast: boolean) => {
    console.log('handleSavePoll called with broadcast:', broadcast);

    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to create polls',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.question.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a question',
        variant: 'destructive',
      });
      return;
    }

    const validOptions = optionInputs.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      toast({
        title: 'Missing Options',
        description: 'Please provide at least 2 options',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let pollOptions: PollOption[];

      if (editingPollId && editingPollStatus === 'active') {
        const existingPoll = polls.find(p => p.id === editingPollId);
        pollOptions = validOptions.map((text, index) => {
          const existingOption = existingPoll?.options[index];
          return {
            text: text.trim(),
            votes: existingOption ? existingOption.votes : 0,
          };
        });
      } else {
        pollOptions = validOptions.map(text => ({
          text: text.trim(),
          votes: 0,
        }));
      }

      const pollData: any = {
        question: formData.question.trim(),
        description: formData.description.trim() || null,
        poll_type: formData.poll_type,
        options: pollOptions,
        target_communities: formData.target_communities.length > 0 ? formData.target_communities : null,
      };

      if (editingPollId && editingPollStatus === 'active') {
        const existingPoll = polls.find(p => p.id === editingPollId);
        if (existingPoll) {
          pollData.status = existingPoll.status;
          pollData.scheduled_start = existingPoll.scheduled_start;
          pollData.scheduled_end = existingPoll.scheduled_end;
          pollData.total_votes = existingPoll.total_votes;
          pollData.total_participants = existingPoll.total_participants;
        }
      } else {
        pollData.status = broadcast ? 'active' : 'draft';
        pollData.total_votes = 0;
        pollData.total_participants = 0;
        pollData.created_by = user.id;

        if (broadcast) {
          let start: Date;
          let end: Date;

          if (formData.duration_days === 'custom') {
            if (!customDateRange?.from) {
              throw new Error('Please select a start date');
            }
            if (!customDateRange?.to) {
              throw new Error('Please select an end date');
            }
            start = customDateRange.from;
            end = customDateRange.to;
          } else {
            const baseStart = startDate || new Date();
            start = baseStart;
            end = addDays(baseStart, parseInt(formData.duration_days));
          }

          pollData.scheduled_start = start.toISOString();
          pollData.scheduled_end = end.toISOString();
        }
      }

      console.log('Poll data:', pollData);

      let data, error;

      if (editingPollId) {
        console.log('Updating poll:', editingPollId);
        const result = await supabase
          .from('polls')
          .update(pollData)
          .eq('id', editingPollId)
          .select();
        data = result.data;
        error = result.error;
      } else {
        console.log('Inserting new poll');
        const result = await supabase
          .from('polls')
          .insert([pollData])
          .select();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      console.log('Poll saved successfully:', data);

      let toastTitle = '';
      let toastDescription = '';

      if (editingPollId && editingPollStatus === 'active') {
        toastTitle = 'Poll Updated';
        toastDescription = 'Your changes have been saved. The poll remains active.';
      } else if (editingPollId) {
        toastTitle = broadcast ? 'Poll Updated & Broadcasted' : 'Poll Updated';
        toastDescription = broadcast
          ? formData.duration_days === 'custom' && customDateRange?.to
            ? `Your poll is now live and will close on ${format(customDateRange.to, 'PPP')}`
            : `Your poll is now live and will close in ${formData.duration_days} days`
          : 'Your changes have been saved';
      } else {
        toastTitle = broadcast ? 'Poll Broadcasted' : 'Poll Saved as Draft';
        toastDescription = broadcast
          ? formData.duration_days === 'custom' && customDateRange?.to
            ? `Your poll is now live and will close on ${format(customDateRange.to, 'PPP')}`
            : `Your poll is now live and will close in ${formData.duration_days} days`
          : 'You can broadcast this poll later from the drafts section';
      }

      if (broadcast) {
        await sendRoleNotification({
          roles: ['super_admin', 'administrator', 'communications_officer'],
          type: 'poll_created',
          title: 'New Poll Broadcasted',
          message: `A new poll "${formData.question.trim()}" is now live.`,
        });
      }

      toast({
        title: toastTitle,
        description: toastDescription,
      });

      setDialogOpen(false);
      resetForm();
      fetchPolls();
    } catch (error: any) {
      console.error('handleSavePoll error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save poll',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastDraft = async (pollId: string) => {
    try {
      const poll = polls.find(p => p.id === pollId);
      if (!poll) return;

      const endDate = addDays(new Date(), 7);

      const { error } = await supabase
        .from('polls')
        .update({
          status: 'active',
          scheduled_start: new Date().toISOString(),
          scheduled_end: endDate.toISOString(),
        })
        .eq('id', pollId);

      if (error) throw error;

      await sendRoleNotification({
        roles: ['super_admin', 'administrator', 'communications_officer'],
        type: 'poll_created',
        title: 'New Poll Broadcasted',
        message: `A new poll "${poll.question}" is now live.`,
      });

      toast({
        title: 'Poll Broadcasted',
        description: 'Your poll is now live and collecting responses',
      });

      fetchPolls();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to broadcast poll',
        variant: 'destructive',
      });
    }
  };

  const handleClosePoll = async () => {
    if (!closePollId) return;

    try {
      const { error } = await supabase
        .from('polls')
        .update({ status: 'closed' })
        .eq('id', closePollId);

      if (error) throw error;

      await sendRoleNotification({
        roles: ['super_admin', 'administrator', 'communications_officer'],
        type: 'poll_closed',
        title: 'Poll Closed',
        message: 'A poll has been closed.',
      });

      toast({
        title: 'Poll Closed',
        description: 'The poll has been closed to new responses',
      });

      setClosePollId(null);
      fetchPolls();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to close poll',
        variant: 'destructive',
      });
    }
  };

  const handleReopenPoll = async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('polls')
        .update({ status: 'active' })
        .eq('id', pollId);

      if (error) throw error;

      toast({
        title: 'Poll Reopened',
        description: 'The poll is now active and accepting responses',
      });

      fetchPolls();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reopen poll',
        variant: 'destructive',
      });
    }
  };

  const filteredPolls = polls.filter(p => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const hay = `${p.question} ${p.description ?? ''}`.toLowerCase();
    return hay.includes(q);
  });

  const draftPolls = filteredPolls.filter(p => p.status === 'draft');
  const activePolls = filteredPolls.filter(p => p.status === 'active');
  const closedPolls = filteredPolls.filter(p => p.status === 'closed');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Polls</h1>
          <p className="text-gray-600 font-light">Create polls and gather feedback from members</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Input
              placeholder="Search polls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#d1242a] hover:bg-[#b91c1c]">
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Create Poll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingPollId ? 'Edit Poll' : 'Create New Poll'}</DialogTitle>
              <DialogDescription>
                {editingPollId
                  ? 'Update your poll question and options'
                  : 'Ask your members a question and collect their responses'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label>Question</Label>
                <Input
                  placeholder="What would you like to ask your members?"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 font-light">
                  {formData.question.length}/200 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Add more context about this poll"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-20"
                />
              </div>

              <div className="space-y-3">
                <Label>Options (2-6 options)</Label>
                {optionInputs.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                    />
                    {optionInputs.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        <X className="h-5 w-5" strokeWidth={1.5} />
                      </Button>
                    )}
                  </div>
                ))}
                {optionInputs.length < 6 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-3 w-3" strokeWidth={1.5} />
                    Add Option
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Poll Start Date (when broadcast)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-gray-500'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        {startDate ? format(startDate, 'LLL dd, y') : 'Starts today'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ?? new Date()}
                        onSelect={(date) => setStartDate(date ?? null)}
                        initialFocus
                        classNames={{
                          day: cn(
                            buttonVariants({ variant: 'ghost' }),
                            'h-8 w-8 p-0 font-normal bg-[#d1242a] text-white border border-[#d1242a] hover:bg-[#b91c1c] hover:text-white'
                          ),
                          day_today:
                            '!bg-[#000000] !text-white font-extrabold !border-2 !border-white hover:!bg-[#b91c1c] hover:!text-white',
                          day_selected:
                            '!bg-white !text-[#d1242a] font-semibold hover:!bg-white hover:!text-[#b91c1c] !border-2 !border-[#d1242a]',
                          day_outside:
                            'bg-gray-200 text-white opacity-40 !border-transparent cursor-not-allowed',
                          day_disabled:
                            'bg-gray-300 text-white opacity-60 cursor-not-allowed hover:bg-gray-300 border border-gray-400',
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {formData.duration_days && formData.duration_days !== 'custom' && (
                    <div className="mt-3 p-2.5 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                      <div className="text-xs text-left">
                        <span className="text-gray-600 font-medium">Start Date:</span>{' '}
                        <span className="text-gray-900">
                          {format(startDate ?? new Date(), 'LLL dd, y')}
                        </span>
                      </div>
                      <div className="text-xs text-left">
                        <span className="text-gray-600 font-medium">End Date:</span>{' '}
                        <span className="text-gray-900">
                          {format(
                            addDays(startDate ?? new Date(), parseInt(formData.duration_days)),
                            'LLL dd, y'
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Duration (when broadcast)</Label>
                  <Select
                    value={formData.duration_days}
                    onValueChange={(value) => {
                      setFormData({ ...formData, duration_days: value });
                      if (value !== 'custom') {
                        setCustomDateRange(undefined);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">1 Week</SelectItem>
                      <SelectItem value="14">2 Weeks</SelectItem>
                      <SelectItem value="30">1 Month</SelectItem>
                      <SelectItem value="custom">Custom Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.duration_days === 'custom' && (
                <div className="space-y-2">
                  <Label>Select Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !customDateRange && 'text-gray-500'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        {customDateRange?.from ? (
                          customDateRange.to ? (
                            <>
                              {format(customDateRange.from, 'LLL dd, y')} - {format(customDateRange.to, 'LLL dd, y')}
                            </>
                          ) : (
                            format(customDateRange.from, 'LLL dd, y')
                          )
                        ) : (
                          'Pick a date range'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={customDateRange}
                        onSelect={setCustomDateRange}
                        numberOfMonths={2}
                        initialFocus
                        classNames={{
                          day: cn(
                            buttonVariants({ variant: 'ghost' }),
                            'h-8 w-8 p-0 font-normal bg-white border border-gray-400 hover:border-gray-600'
                          ),
                          day_today: '!bg-white !text-black font-semibold hover:!bg-white hover:!text-black !border-2 !border-[#d1242a]',
                          day_selected: '!bg-[#d1242a] !text-white font-semibold hover:!bg-[#d1242a] hover:!text-white focus:!bg-[#d1242a] focus:!text-white !border-transparent',
                          day_range_start: '!bg-[#d1242a] !text-white font-semibold hover:!bg-[#d1242a] hover:!text-white !border-transparent',
                          day_range_end: '!bg-[#d1242a] !text-white font-semibold hover:!bg-[#d1242a] hover:!text-white !border-transparent',
                          day_range_middle: '!bg-[#fecaca] !border-transparent',
                          day_disabled: 'bg-white text-gray-400 opacity-50 cursor-not-allowed hover:bg-white border border-gray-300',
                          day_outside: 'text-gray-300 opacity-30 !border-transparent bg-white',
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {customDateRange?.from && customDateRange?.to && (
                    <p className="text-xs text-gray-500 font-light">
                      Poll will run from {format(customDateRange.from, 'PPP')} to {format(customDateRange.to, 'PPP')}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Post to Communities (Optional)</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg max-h-40 overflow-y-auto">
                  {communities.length === 0 ? (
                    <p className="text-sm text-gray-500 col-span-2">No communities available</p>
                  ) : (
                    communities.map((community) => (
                      <label
                        key={community.id}
                        className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.target_communities.includes(community.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                target_communities: [...formData.target_communities, community.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                target_communities: formData.target_communities.filter(id => id !== community.id)
                              });
                            }
                          }}
                          className="appearance-none rounded border-2 border-gray-400 bg-white w-4 h-4 cursor-pointer checked:bg-[#d1242a] checked:border-[#d1242a] focus:outline-none relative checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-[10px] checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 checked:after:font-bold"
                        />
                        <span className="font-light">{community.name}</span>
                      </label>
                    ))
                  )}
                </div>
                {formData.target_communities.length > 0 && (
                  <p className="text-xs text-gray-500 font-light">
                    {formData.target_communities.length} communit{formData.target_communities.length > 1 ? 'ies' : 'y'} selected
                  </p>
                )}
              </div>

              <div className="flex space-x-3">
                {editingPollId && editingPollStatus === 'active' ? (
                  <Button
                    className="flex-1 bg-[#d1242a] hover:bg-[#b91c1c]"
                    onClick={() => handleSavePoll(false)}
                    disabled={loading}
                  >
                    <Save className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleSavePoll(false)}
                      disabled={loading}
                    >
                      <Save className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      {loading ? 'Saving...' : editingPollId ? 'Update Draft' : 'Save as Draft'}
                    </Button>
                    <Button
                      className="flex-1 bg-[#d1242a] hover:bg-[#b91c1c]"
                      onClick={() => handleSavePoll(true)}
                      disabled={loading}
                    >
                      <Send className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      {loading ? 'Broadcasting...' : editingPollId ? 'Update & Broadcast' : 'Broadcast Now'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Draft Polls</p>
                <p className="text-2xl font-semibold text-gray-900">{draftPolls.length}</p>
              </div>
              <Edit className="h-8 w-8 text-blue-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Active Polls</p>
                <p className="text-2xl font-semibold text-gray-900">{activePolls.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Total Responses</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {polls.reduce((sum, poll) => sum + (poll.total_votes || 0), 0).toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{closedPolls.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
      </div>

      {draftPolls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Draft Polls</CardTitle>
            <CardDescription>Saved polls ready to be broadcasted</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {draftPolls.map((poll) => (
              <div key={poll.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900">{poll.question}</h3>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">Draft</Badge>
                    </div>
                    {poll.description && (
                      <p className="text-sm text-gray-600 font-light">{poll.description}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPoll(poll)}
                    >
                      <Edit className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Edit
                    </Button>
                    <Button
                      className="bg-[#d1242a] hover:bg-[#b91c1c]"
                      size="sm"
                      onClick={() => handleBroadcastDraft(poll.id)}
                    >
                      <Send className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Broadcast
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {poll.options.map((option, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <span className="font-light text-gray-700">{option.text}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-xs text-gray-500 font-light">
                  Created {format(new Date(poll.created_at), 'PPP')}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activePolls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Active Polls</CardTitle>
            <CardDescription>Currently collecting responses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {activePolls.map((poll) => {
              const totalVotes = poll.total_votes || 0;
              return (
                <div key={poll.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{poll.question}</h3>
                      {poll.description && (
                        <p className="text-sm text-gray-600 font-light">{poll.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPoll(poll)}
                      >
                        <Edit className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setClosePollId(poll.id)}
                      >
                        Close Poll
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    {poll.options.map((option, idx) => {
                      const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-light text-gray-700">{option.text}</span>
                            <span className="font-medium text-gray-900">
                              {option.votes} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[#d1242a] h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center space-x-6 text-sm text-gray-600 font-light">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" strokeWidth={1.5} />
                      <span>{poll.total_participants || 0} participants</span>
                    </div>
                    {poll.scheduled_end && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" strokeWidth={1.5} />
                        <span>Closes {format(new Date(poll.scheduled_end), 'PPP')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {closedPolls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Closed Polls</CardTitle>
            <CardDescription>Completed polls and their results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {closedPolls.map((poll) => {
              const totalVotes = poll.total_votes || 0;
              return (
                <div key={poll.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">{poll.question}</h3>
                        <Badge className="bg-gray-100 text-gray-800">Closed</Badge>
                      </div>
                      {poll.description && (
                        <p className="text-sm text-gray-600 font-light">{poll.description}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReopenPoll(poll.id)}
                      className="text-[#d1242a] border-[#d1242a] hover:bg-[#d1242a] hover:text-white"
                    >
                      <PlayCircle className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Reopen Poll
                    </Button>
                  </div>

                  <div className="space-y-3 mb-4">
                    {poll.options.map((option, idx) => {
                      const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-light text-gray-700">{option.text}</span>
                            <span className="font-medium text-gray-900">
                              {option.votes} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gray-400 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center space-x-6 text-sm text-gray-600 font-light">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" strokeWidth={1.5} />
                      <span>{poll.total_participants || 0} participants</span>
                    </div>
                    {poll.scheduled_end && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" strokeWidth={1.5} />
                        <span>Closed {format(new Date(poll.scheduled_end), 'PPP')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={closePollId !== null} onOpenChange={(open) => !open && setClosePollId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to close this poll?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the poll from accepting new responses. Users will no longer be able to vote on this poll. You can reopen it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClosePoll}
              className="bg-[#d1242a] hover:bg-[#b91c1c]"
            >
              Close Poll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
