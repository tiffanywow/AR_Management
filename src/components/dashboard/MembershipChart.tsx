import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';

interface ChartData {
  month: string;
  members: number;
}

export default function MembershipChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembershipData();
  }, []);

  const fetchMembershipData = async () => {
    try {
      const now = new Date();
      const monthsData: ChartData[] = [];

      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const monthStart = monthDate.toISOString();
        const monthEnd = nextMonthDate.toISOString();

        const { count } = await supabase
          .from('memberships')
          .select('id', { count: 'exact', head: true })
          .lt('created_at', monthEnd);

        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });

        monthsData.push({
          month: monthName,
          members: count || 0,
        });
      }

      setData(monthsData);
    } catch (error) {
      console.error('Error fetching membership data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#d1242a] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <p className="text-sm text-gray-500">No membership data available</p>
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()}
          />
          <Line
            type="monotone"
            dataKey="members"
            stroke="#d1242a"
            strokeWidth={2}
            dot={{ fill: '#d1242a', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#d1242a', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
