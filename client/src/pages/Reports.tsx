import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, FileText, Users, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";

const attendanceData = [
  { week: 'Week 1', count: 120 },
  { week: 'Week 2', count: 135 },
  { week: 'Week 3', count: 128 },
  { week: 'Week 4', count: 142 },
  { week: 'Week 5', count: 156 },
  { week: 'Week 6', count: 148 },
];

const membershipData = [
  { name: 'Pastors', value: 2, color: '#f59e0b' },
  { name: 'Admins', value: 5, color: '#3b82f6' },
  { name: 'Workers', value: 15, color: '#22c55e' },
  { name: 'Members', value: 80, color: '#8b5cf6' },
  { name: 'Newcomers', value: 12, color: '#ec4899' },
];

const givingData = [
  { month: 'Jan', amount: 12500 },
  { month: 'Feb', amount: 14200 },
  { month: 'Mar', amount: 11800 },
  { month: 'Apr', amount: 15600 },
  { month: 'May', amount: 16200 },
  { month: 'Jun', amount: 14800 },
];

export default function Reports() {
  const [dateRange, setDateRange] = useState("30");

  const handleExport = (reportType: string, format: string) => {
    console.log(`Exporting ${reportType} report as ${format}`);
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display">Reports</h1>
          <p className="text-muted-foreground">Analyze your church data and generate insights</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 rounded-xl" data-testid="select-date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList className="bg-secondary/50 p-1 rounded-xl flex-wrap h-auto">
          <TabsTrigger value="attendance" className="rounded-lg gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Calendar className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="membership" className="rounded-lg gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Users className="w-4 h-4" />
            Membership
          </TabsTrigger>
          <TabsTrigger value="financial" className="rounded-lg gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <DollarSign className="w-4 h-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="events" className="rounded-lg gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <FileText className="w-4 h-4" />
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Attendance Report</CardTitle>
                <CardDescription>Weekly attendance trends and patterns</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl gap-2"
                  onClick={() => handleExport('attendance', 'pdf')}
                  data-testid="button-export-attendance-pdf"
                >
                  <Download className="w-4 h-4" /> PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl gap-2"
                  onClick={() => handleExport('attendance', 'csv')}
                  data-testid="button-export-attendance-csv"
                >
                  <Download className="w-4 h-4" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData}>
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">142</p>
                  <p className="text-sm text-muted-foreground">Average Attendance</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">+12%</p>
                  <p className="text-sm text-muted-foreground">Growth Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">156</p>
                  <p className="text-sm text-muted-foreground">Peak Attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="membership">
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Membership Report</CardTitle>
                <CardDescription>Member distribution by role and status</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl gap-2"
                onClick={() => handleExport('membership', 'pdf')}
                data-testid="button-export-membership"
              >
                <Download className="w-4 h-4" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={membershipData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {membershipData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {membershipData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="text-muted-foreground">{item.value}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Total Members</span>
                      <span>{membershipData.reduce((acc, item) => acc + item.value, 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Financial Report</CardTitle>
                <CardDescription>Monthly giving and financial trends</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl gap-2"
                onClick={() => handleExport('financial', 'pdf')}
                data-testid="button-export-financial"
              >
                <Download className="w-4 h-4" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={givingData}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} tickFormatter={(value) => `$${value/1000}k`} />
                    <Tooltip 
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">$85,100</p>
                  <p className="text-sm text-muted-foreground">Total (YTD)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">$14,183</p>
                  <p className="text-sm text-muted-foreground">Monthly Average</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">+8.4%</p>
                  <p className="text-sm text-muted-foreground">vs Last Year</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card className="rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Events Report</CardTitle>
              <CardDescription>Event participation and engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Events report coming soon</p>
                <p className="text-sm">Track event attendance and engagement</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
