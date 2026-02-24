import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateNotification } from '@/hooks/useCreateNotification';
import { toast } from 'sonner';

export default function NotificationTest() {
  const { profile } = useAuth();
  const { createNotification } = useCreateNotification();

  const [notificationType, setNotificationType] = useState('info');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendTestNotification = async () => {
    if (!profile?.id) {
      toast.error('You must be logged in');
      return;
    }

    if (!title || !body) {
      toast.error('Please fill in title and body');
      return;
    }

    setSending(true);
    try {
      const result = await createNotification({
        user_id: profile.id,
        notification_type: notificationType,
        title,
        body,
        data: { test: true },
      });

      if (result.success) {
        toast.success('Test notification sent!');
        setTitle('');
        setBody('');
      } else {
        toast.error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error sending notification');
    } finally {
      setSending(false);
    }
  };

  const sendQuickTest = async (type: string, testTitle: string, testBody: string) => {
    if (!profile?.id) return;

    setSending(true);
    try {
      await createNotification({
        user_id: profile.id,
        notification_type: type,
        title: testTitle,
        body: testBody,
        data: { test: true },
      });
      toast.success('Notification sent!');
    } catch (error) {
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification System Test</h1>
        <p className="text-gray-600 mt-1">Test the in-app notification system with pop-ups</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Tests</CardTitle>
            <CardDescription>Send pre-configured test notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => sendQuickTest('success', 'Success!', 'Your action was completed successfully.')}
              disabled={sending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Send Success Notification
            </Button>

            <Button
              onClick={() => sendQuickTest('error', 'Error Occurred', 'There was a problem processing your request.')}
              disabled={sending}
              variant="destructive"
              className="w-full"
            >
              Send Error Notification
            </Button>

            <Button
              onClick={() => sendQuickTest('warning', 'Warning', 'Please review your recent changes before continuing.')}
              disabled={sending}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
            >
              Send Warning Notification
            </Button>

            <Button
              onClick={() => sendQuickTest('info', 'Information', 'You have new updates available in your dashboard.')}
              disabled={sending}
              variant="outline"
              className="w-full"
            >
              Send Info Notification
            </Button>

            <Button
              onClick={() => sendQuickTest('membership_approved', 'Membership Approved', 'Congratulations! Your membership application has been approved.')}
              disabled={sending}
              className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
            >
              Send Approval Notification
            </Button>

            <Button
              onClick={() => sendQuickTest('broadcast', 'New Broadcast', 'A new important message has been posted by the party leadership.')}
              disabled={sending}
              variant="secondary"
              className="w-full"
            >
              Send Broadcast Notification
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom Notification</CardTitle>
            <CardDescription>Create your own notification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Notification Type</Label>
              <Select value={notificationType} onValueChange={setNotificationType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="membership_approved">Membership Approved</SelectItem>
                  <SelectItem value="membership_rejected">Membership Rejected</SelectItem>
                  <SelectItem value="broadcast">Broadcast</SelectItem>
                  <SelectItem value="new_post">New Post</SelectItem>
                  <SelectItem value="campaign_update">Campaign Update</SelectItem>
                  <SelectItem value="poll_created">Poll Created</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Notification title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Notification message body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              onClick={handleSendTestNotification}
              disabled={sending || !title || !body}
              className="w-full"
            >
              {sending ? 'Sending...' : 'Send Custom Notification'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>Understanding the notification system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Real-time Pop-ups</h4>
            <p className="text-gray-600">
              When a notification is created, it automatically appears as a pop-up in the top-right corner.
              Pop-ups auto-dismiss after 8 seconds or can be manually closed.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Notification Bell</h4>
            <p className="text-gray-600">
              Click the bell icon in the header to view all notifications. Unread notifications are highlighted
              and show a badge count.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Real-time Updates</h4>
            <p className="text-gray-600">
              The system uses Supabase Realtime to instantly receive new notifications without polling.
              No page refresh needed.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Usage in Code</h4>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`import { useCreateNotification } from '@/hooks/useCreateNotification';

const { createNotification } = useCreateNotification();

await createNotification({
  user_id: userId,
  notification_type: 'success',
  title: 'Action Complete',
  body: 'Your request was processed successfully.',
  data: { orderId: '123' },
});`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
