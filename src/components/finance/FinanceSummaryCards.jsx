import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Plane, Hotel } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function FinanceSummaryCards({ transactions }) {
  const totals = transactions.reduce((acc, t) => {
    acc.total += t.amount;
    if (t.category === 'Flight') acc.flights += t.amount;
    else if (t.category === 'Hotel') acc.hotels += t.amount;
    else acc.misc += t.amount;
    return acc;
  }, { total: 0, flights: 0, hotels: 0, misc: 0 });

  const chartData = [
    { name: 'Flights', value: totals.flights, color: '#FBBFBC' }, // blush
    { name: 'Hotels', value: totals.hotels, color: '#D1FAE5' }, // sage
    { name: 'Misc', value: totals.misc, color: '#E0E7FF' }, // lavender
  ].filter(d => d.value > 0);

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className={`h-4 w-4 text-muted-foreground ${colorClass}`} />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">${value.toFixed(2)}</div>
          </CardContent>
      </Card>
  );

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-3 grid gap-6 md:grid-cols-3">
            <StatCard title="Total Spent" value={totals.total} icon={DollarSign} colorClass="text-lavender-800" />
            <StatCard title="Total Flights Cost" value={totals.flights} icon={Plane} colorClass="text-blush-800" />
            <StatCard title="Total Hotels Cost" value={totals.hotels} icon={Hotel} colorClass="text-sage-800" />
        </div>
        <Card className="lg:col-span-2">
             <CardHeader>
                <CardTitle className="text-sm font-medium">Spending Distribution</CardTitle>
             </CardHeader>
             <CardContent className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45} labelLine={false}>
                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    </PieChart>
                </ResponsiveContainer>
             </CardContent>
        </Card>
    </div>
  );
}