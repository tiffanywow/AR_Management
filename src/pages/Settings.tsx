import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Key, Shield, Bell, Database, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TwilioSettings {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  newMemberAlerts: boolean;
  campaignUpdates: boolean;
  systemMaintenance: boolean;
}

export default function Settings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savingTwilio, setSavingTwilio] = useState(false);

  const [twilioSettings, setTwilioSettings] = useState<TwilioSettings>({
    accountSid: '',
    authToken: '',
    messagingServiceSid: '',
  });

  const twilioConfigured = Boolean(
    twilioSettings.accountSid || twilioSettings.authToken || twilioSettings.messagingServiceSid
  );

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    newMemberAlerts: true,
    campaignUpdates: false,
    systemMaintenance: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('category', ['twilio', 'notifications']);

      if (error) throw error;

      if (data) {
        data.forEach((setting) => {
          if (setting.key === 'twilio_account_sid') {
            setTwilioSettings((prev) => ({ ...prev, accountSid: setting.value || '' }));
          } else if (setting.key === 'twilio_auth_token') {
            setTwilioSettings((prev) => ({ ...prev, authToken: setting.value || '' }));
          } else if (setting.key === 'twilio_messaging_service_sid') {
            setTwilioSettings((prev) => ({ ...prev, messagingServiceSid: setting.value || '' }));
          } else if (setting.key === 'notification_email') {
            setNotificationSettings((prev) => ({ ...prev, emailNotifications: setting.value === 'true' }));
          } else if (setting.key === 'notification_new_members') {
            setNotificationSettings((prev) => ({ ...prev, newMemberAlerts: setting.value === 'true' }));
          } else if (setting.key === 'notification_campaigns') {
            setNotificationSettings((prev) => ({ ...prev, campaignUpdates: setting.value === 'true' }));
          } else if (setting.key === 'notification_maintenance') {
            setNotificationSettings((prev) => ({ ...prev, systemMaintenance: setting.value === 'true' }));
          }
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveTwilioSettings = async () => {
    if (!profile?.id) return;

    setSavingTwilio(true);
    try {
      const settings = [
        {
          key: 'twilio_account_sid',
          value: twilioSettings.accountSid,
          category: 'twilio',
          is_encrypted: true,
          updated_by: profile.id,
        },
        {
          key: 'twilio_auth_token',
          value: twilioSettings.authToken,
          category: 'twilio',
          is_encrypted: true,
          updated_by: profile.id,
        },
        {
          key: 'twilio_messaging_service_sid',
          value: twilioSettings.messagingServiceSid,
          category: 'twilio',
          is_encrypted: true,
          updated_by: profile.id,
        },
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(
            {
              ...setting,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'key',
            }
          );

        if (error) throw error;
      }

      toast.success('Twilio settings saved successfully');
    } catch (error) {
      console.error('Error saving Twilio settings:', error);
      toast.error('Failed to save Twilio settings');
    } finally {
      setSavingTwilio(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-gray-600 font-light">Manage your system configuration and integrations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center">
                <Key className="mr-2 h-5 w-5" strokeWidth={1.5} />
                Twilio Configuration
              </CardTitle>
              <CardDescription>Configure your Twilio messaging service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Twilio Status</label>
                <p className="text-sm text-gray-600">
                  {twilioConfigured ? (
                    <span className="text-green-600 font-medium">Configured</span>
                  ) : (
                    <span className="text-gray-600">Not configured</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-2">API keys are hidden for security.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center">
                <Database className="mr-2 h-5 w-5" strokeWidth={1.5} />
                Database Configuration
              </CardTitle>
              <CardDescription>Supabase database settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Supabase URL</label>
                <p className="text-sm text-gray-600">Hidden for security</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Anon Key</label>
                <p className="text-sm text-gray-600">Hidden for security</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Service Role Key</label>
                <p className="text-sm text-gray-600">Hidden for security</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center">
                <Bell className="mr-2 h-5 w-5" strokeWidth={1.5} />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure system notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-600 font-light">Receive email alerts for important events</p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Member Alerts</p>
                  <p className="text-sm text-gray-600 font-light">Get notified when new members join</p>
                </div>
                <Switch
                  checked={notificationSettings.newMemberAlerts}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, newMemberAlerts: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Campaign Updates</p>
                  <p className="text-sm text-gray-600 font-light">Receive updates on campaign progress</p>
                </div>
                <Switch
                  checked={notificationSettings.campaignUpdates}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, campaignUpdates: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">System Maintenance</p>
                  <p className="text-sm text-gray-600 font-light">Maintenance and downtime notifications</p>
                </div>
                <Switch
                  checked={notificationSettings.systemMaintenance}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, systemMaintenance: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center">
                <Shield className="mr-2 h-5 w-5" strokeWidth={1.5} />
                Security Settings
              </CardTitle>
              <CardDescription>Manage security and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-600 font-light">Add extra security to your account</p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Session Timeout</p>
                  <p className="text-sm text-gray-600 font-light">Auto-logout after inactivity</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">API Access Logging</p>
                  <p className="text-sm text-gray-600 font-light">Log all API access attempts</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Button className="w-full mt-6">
                <Save className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
