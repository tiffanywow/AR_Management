import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, BarChart3, Clock, CheckCircle2, Users, X, Save, Send, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';

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
  const [polls, setPolls] = useState<Poll[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    question: '',
    description: '',
    poll_type: 'single',
    duration_days: '7',
    target_communities: [] as string[],
  });

  const [optionInputs, setOptionInputs] = useState<string[]>(['', '']);

  useEffect(() => {
    fetchPolls();
    fetchCommunities();
  }, []);

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
    setFormData({
      question: poll.question,
      description: poll.description || '',
      poll_type: poll.poll_type || 'single',
      duration_days: '7',
      target_communities: Array.isArray(poll.target_communities) ? poll.target_communities : [],
    });
    setOptionInputs(poll.options.map(opt => opt.text));
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPollId(null);
    setFormData({
      question: '',
      description: '',
      poll_type: 'single',
      duration_days: '7',
      target_communities: [],
    });
    setOptionInputs(['', '']);
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
      const pollOptions: PollOption[] = validOptions.map(text => ({
        text: text.trim(),
        votes: 0,
      }));

      const pollData: any = {
        question: formData.question.trim(),
        description: formData.description.trim() || null,
        poll_type: formData.poll_type,
        options: pollOptions,
        status: broadcast ? 'active' : 'draft',
        target_communities: formData.target_communities.length > 0 ? formData.target_communities : null,
        total_votes: 0,
        total_participants: 0,
        created_by: user.id,
      };

      if (broadcast) {
        const endDate = addDays(new Date(), parseInt(formData.duration_days));
        pollData.scheduled_start = new Date().toISOString();
        pollData.scheduled_end = endDate.toISOString();
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

      toast({
        title: editingPollId
          ? (broadcast ? 'Poll Updated & Broadcasted' : 'Poll Updated')
          : (broadcast ? 'Poll Broadcasted' : 'Poll Saved as Draft'),
        description: broadcast
          ? `Your poll is now live and will close in ${formData.duration_days} days`
          : editingPollId
          ? 'Your changes have been saved'
          : 'You can broadcast this poll later from the drafts section',
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

  const handleClosePoll = async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('polls')
        .update({ status: 'closed' })
        .eq('id', pollId);

      if (error) throw error;

      toast({
        title: 'Poll Closed',
        description: 'The poll has been closed to new responses',
      });

      fetchPolls();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to close poll',
        variant: 'destructive',
      });
    }
  };

  const draftPolls = polls.filter(p => p.status === 'draft');
  const activePolls = polls.filter(p => p.status === 'active');
  const closedPolls = polls.filter(p => p.status === 'closed');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Polls</h1>
          <p className="text-gray-600 font-light">Create polls and gather feedback from members</p>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPollId ? 'Edit Poll' : 'Create New Poll'}</DialogTitle>
              <DialogDescription>
                {editingPollId
                  ? 'Update your poll question and options'
                  : 'Ask your members a question and collect their responses'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
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
                  <Label>Poll Type</Label>
                  <Select
                    value={formData.poll_type}
                    onValueChange={(value) => setFormData({ ...formData, poll_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Choice</SelectItem>
                      <SelectItem value="multiple">Multiple Choice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Duration (when broadcast)</Label>
                  <Select
                    value={formData.duration_days}
                    onValueChange={(value) => setFormData({ ...formData, duration_days: value })}
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                          className="rounded border-gray-300"
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
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClosePoll(poll.id)}
                    >
                      Close Poll
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
          <CardContent className="space-y-4">
            {closedPolls.map((poll) => {
              const totalVotes = poll.total_votes || 0;
              const winningOption = poll.options.reduce((max, opt) =>
                opt.votes > max.votes ? opt : max, poll.options[0]
              );
              return (
                <div key={poll.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{poll.question}</h3>
                      <p className="text-sm text-gray-600 font-light">
                        Winner: <span className="font-medium">{winningOption.text}</span> with{' '}
                        {winningOption.votes} votes ({totalVotes} total)
                      </p>
                    </div>
                    <Badge className="bg-gray-100 text-gray-800">Closed</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
