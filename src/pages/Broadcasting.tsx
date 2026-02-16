import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Bell, Send, Users, Calendar } from 'lucide-react';

const recentBroadcasts = [
  {
    id: 1,
    type: 'SMS',
    message: 'Join us for the Youth Rally this Saturday at Independence Stadium!',
    sent: '2024-01-15 14:30',
    recipients: 15432,
    status: 'delivered',
  },
  {
    id: 2,
    type: 'Push',
    message: 'New policy document available - Economic Transformation Plan',
    sent: '2024-01-14 09:15',
    recipients: 18765,
    status: 'delivered',
  },
  {
    id: 3,
    type: 'SMS',
    message: 'Thank you for your support! AR continues to fight for change.',
    sent: '2024-01-13 16:45',
    recipients: 22341,
    status: 'delivered',
  },
];

export default function Broadcasting() {
  const { toast } = useToast();
  const [targetAudience, setTargetAudience] = React.useState('all');
  const [messageType, setMessageType] = React.useState('sms');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  
  const getRecipientCount = () => {
    switch (targetAudience) {
      case 'test':
        return '1 member (Werner - +264814555528)';
      default:
        return '24,847 members';
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message before sending.",
        variant: "destructive",
      });
      return;
    }

    if (messageType === 'sms' && message.length > 160) {
      toast({
        title: "Error",
        description: "SMS messages must be 160 characters or less.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // For test members, send to Werner's number
      const recipient = targetAudience === 'test' ? '+264814555528' : 'all';
      
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-message`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: messageType,
          message: message,
          subject: subject,
          targetAudience: targetAudience,
          recipient: recipient,
        }),
      });

      if (response.ok) {
        await response.json();
        toast({
          title: "Message Sent Successfully",
          description: `${messageType.toUpperCase()} sent to ${targetAudience === 'test' ? 'Werner (+264814555528)' : getRecipientCount()}`,
        });
        
        // Clear form
        setMessage('');
        setSubject('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to Send Message",
        description: "There was an error sending your message. Please check your Twilio credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Broadcasting</h1>
        <p className="text-gray-600 font-light">Send SMS and push notifications to your members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Compose Message</CardTitle>
              <CardDescription>Send SMS or push notification to your members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Message Type</label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS Message</SelectItem>
                      <SelectItem value="push">Push Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Target Audience</label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      <SelectItem value="region">By Region</SelectItem>
                      <SelectItem value="age">By Age Group</SelectItem>
                      <SelectItem value="active">Active Members Only</SelectItem>
                      <SelectItem value="test">Test Members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Subject (Push notifications only)</label>
                <Input 
                  placeholder="Enter message subject..." 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={messageType === 'sms'}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Message</label>
                <Textarea 
                  placeholder="Type your message here..."
                  className="min-h-32"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{messageType === 'sms' ? 'Maximum 160 characters for SMS' : 'No character limit for push notifications'}</span>
                  <span className={messageType === 'sms' && message.length > 160 ? 'text-red-500' : ''}>
                    {message.length}{messageType === 'sms' ? '/160' : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Estimated recipients: <span className="font-medium">{getRecipientCount()}</span>
                </div>
                <div className="space-x-3">
                  <Button variant="outline">Schedule</Button>
                  <Button 
                    className="bg-[#d1242a] hover:bg-[#b91c1c]"
                    onClick={handleSendMessage}
                    disabled={isLoading}
                  >
                    <Send className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {isLoading ? 'Sending...' : 'Send Now'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-[#d1242a]" strokeWidth={1.5} />
                  <span className="text-sm">SMS Credits</span>
                </div>
                <span className="font-medium">12,450</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4 text-[#d1242a]" strokeWidth={1.5} />
                  <span className="text-sm">Push Enabled</span>
                </div>
                <span className="font-medium">18,765</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-[#d1242a]" strokeWidth={1.5} />
                  <span className="text-sm">Total Reach</span>
                </div>
                <span className="font-medium">24,847</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Twilio Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Service Status</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Account SID</span>
                  <span className="text-xs text-gray-500 font-mono">AC***ed92</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Service SID</span>
                  <span className="text-xs text-gray-500 font-mono">MG***3a1c</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Broadcasts</CardTitle>
          <CardDescription>History of your sent messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentBroadcasts.map((broadcast) => (
              <div key={broadcast.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-[#d1242a]/10 rounded-full flex items-center justify-center">
                    {broadcast.type === 'SMS' ? (
                      <MessageSquare className="h-5 w-5 text-[#d1242a]" strokeWidth={1.5} />
                    ) : (
                      <Bell className="h-5 w-5 text-[#d1242a]" strokeWidth={1.5} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{broadcast.message}</p>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 font-light">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" strokeWidth={1.5} />
                        {broadcast.sent}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" strokeWidth={1.5} />
                        {broadcast.recipients.toLocaleString()} recipients
                      </div>
                    </div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">{broadcast.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}