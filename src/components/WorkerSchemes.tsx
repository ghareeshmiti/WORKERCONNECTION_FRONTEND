import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Clock } from 'lucide-react';

const MOCK_SCHEMES_ELIGIBLE = [
    { name: 'Annadata Sukhibhava - ₹20,000', status: 'Eligible', bg: 'bg-green-100 text-green-800' },
    { name: 'Deepam 2.0 - 3 Cylinders', status: 'Eligible', bg: 'bg-green-100 text-green-800' },
    { name: '100 Days Work (MGNREGA) - ₹307/day', status: 'Eligible', bg: 'bg-green-100 text-green-800' },
    { name: 'NTR Vaidya Seva - ₹25 Lakh Coverage', status: 'Eligible', bg: 'bg-green-100 text-green-800' }
];

const MOCK_SCHEMES_NOT_ELIGIBLE = [
    "Talliki Vandanam", "Aada Bidda Nidhi", "Stree Shakti", "Nirudyoga Bruthi", "NTR Bharosa", "NTR Bharosa (PH)"
];

const CURRENT_MONTH_DATA = [
    { name: 'Annadata Sukhibhava', telugu: 'అన్నదాత సుఖీభవ', benefit: '₹20,000', status: 'Taken', date: '2025-01-15' },
    { name: 'Deepam 2.0', telugu: 'దీపం 2.0', benefit: '3 Cylinders', status: 'Taken', date: '2025-01-20' },
    { name: '100 Days Work (MGNREGA)', telugu: '100 రోజుల పని', benefit: '₹307/day', status: 'Pending', date: '-' },
    { name: 'NTR Vaidya Seva', telugu: 'ఎన్టీఆర్ వైద్య సేవ', benefit: '₹25 Lakh Coverage', status: 'Pending', date: '-' }
];

const HISTORY_DATA: any = {
    '2024': [
        {
            month: 'December 2024',
            items: [
                { name: 'Annadata Sukhibhava', status: 'Pending', date: '-', amount: '-' },
                { name: 'Deepam 2.0', status: 'Taken', date: '2024-12-25', amount: '3 Cylinders' },
                { name: '100 Days Work (MGNREGA)', status: 'Taken', date: '2024-12-24', amount: '₹307/day' },
                { name: 'NTR Vaidya Seva', status: 'Taken', date: '2024-12-13', amount: '₹25 Lakh Coverage' }
            ]
        },
        {
            month: 'November 2024',
            items: [
                { name: 'Annadata Sukhibhava', status: 'Taken', date: '2024-11-21', amount: '₹20,000' },
                { name: 'Deepam 2.0', status: 'Taken', date: '2024-11-09', amount: '3 Cylinders' },
                { name: '100 Days Work (MGNREGA)', status: 'Taken', date: '2024-11-26', amount: '₹307/day' },
                { name: 'NTR Vaidya Seva', status: 'Taken', date: '2024-11-21', amount: '₹25 Lakh Coverage' }
            ]
        },
        {
            month: 'October 2024',
            items: [
                { name: 'Annadata Sukhibhava', status: 'Taken', date: '2024-10-27', amount: '₹20,000' },
                { name: 'Deepam 2.0', status: 'Taken', date: '2024-10-04', amount: '3 Cylinders' },
                { name: '100 Days Work (MGNREGA)', status: 'Taken', date: '2024-10-21', amount: '₹307/day' },
                { name: 'NTR Vaidya Seva', status: 'Taken', date: '2024-10-01', amount: '₹25 Lakh Coverage' }
            ]
        }
    ]
};

export function WorkerSchemes() {
    const [year, setYear] = useState('2024');

    return (
        <div className="space-y-6">
            {/* Schemes Eligibility */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <div>
                        <h3 className="text-base font-semibold mb-3">Eligible Schemes ({MOCK_SCHEMES_ELIGIBLE.length})</h3>
                        <div className="flex flex-wrap gap-2">
                            {MOCK_SCHEMES_ELIGIBLE.map((s, i) => (
                                <Badge key={i} variant="outline" className={`${s.bg} border-green-200 px-3 py-1 font-normal`}>
                                    {s.name}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 border-t">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Not Eligible:</h3>
                        <div className="flex flex-wrap gap-2">
                            {MOCK_SCHEMES_NOT_ELIGIBLE.map((name, i) => (
                                <div key={i} className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                                    {name}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs Section */}
            <Tabs defaultValue="current" className="w-full">
                <TabsList className="mb-4 w-full h-auto grid grid-cols-1 sm:grid-cols-2">
                    <TabsTrigger value="current" className="py-2">Current Month (Jan 2025)</TabsTrigger>
                    <TabsTrigger value="history" className="py-2">Year-wise History</TabsTrigger>
                </TabsList>

                <TabsContent value="current">
                    <Card>
                        <CardHeader className="pb-2">
                            <h3 className="font-bold text-lg">January 2025 - Scheme Status</h3>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-blue-900 text-white text-left text-sm">
                                            <th className="p-4 rounded-tl-lg font-medium">Scheme Name</th>
                                            <th className="p-4 font-medium">Benefit</th>
                                            <th className="p-4 font-medium">Status</th>
                                            <th className="p-4 rounded-tr-lg font-medium text-right">Date Received</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {CURRENT_MONTH_DATA.map((item, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50">
                                                <td className="p-4">
                                                    <div className="font-medium text-gray-900">{item.name}</div>
                                                    <div className="text-xs text-muted-foreground">{item.telugu}</div>
                                                </td>
                                                <td className="p-4 text-sm font-semibold text-gray-700">
                                                    {item.benefit}
                                                </td>
                                                <td className="p-4">
                                                    {item.status === 'Taken' ? (
                                                        <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                                                            <Check className="w-4 h-4" /> Taken
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-orange-500 text-sm font-medium">
                                                            <Clock className="w-4 h-4" /> Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right text-sm text-muted-foreground">
                                                    {item.date}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
                            <h3 className="font-bold text-lg">Year-wise Scheme History</h3>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2025">2025</SelectItem>
                                    <SelectItem value="2024">2024</SelectItem>
                                    <SelectItem value="2023">2023</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Render History Data */}
                        {HISTORY_DATA[year] ? (
                            HISTORY_DATA[year].map((monthGroup: any, idx: number) => (
                                <Card key={idx} className="overflow-hidden">
                                    <div className="bg-muted px-4 py-3 font-semibold text-foreground border-b flex justify-between items-center">
                                        <span>{monthGroup.month}</span>
                                        <div className="flex gap-4 text-xs font-normal">
                                            <span className="text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Taken: {monthGroup.items.filter((i: any) => i.status === 'Taken').length}</span>
                                            <span className="text-orange-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending: {monthGroup.items.filter((i: any) => i.status === 'Pending').length}</span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-left text-xs text-muted-foreground border-b bg-card/50">
                                                    <th className="p-4 font-medium">Scheme</th>
                                                    <th className="p-4 font-medium text-center">Status</th>
                                                    <th className="p-4 font-medium">Date</th>
                                                    <th className="p-4 font-medium text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-sm">
                                                {monthGroup.items.map((item: any, i: number) => (
                                                    <tr key={i} className="hover:bg-muted/50">
                                                        <td className="p-4 font-medium">{item.name}</td>
                                                        <td className="p-4 text-center">
                                                            {item.status === 'Taken' ?
                                                                <Check className="w-4 h-4 text-green-600 mx-auto" /> :
                                                                <Clock className="w-4 h-4 text-orange-500 mx-auto" />
                                                            }
                                                        </td>
                                                        <td className="p-4 text-muted-foreground">{item.date}</td>
                                                        <td className="p-4 text-right font-medium">{item.amount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="text-center py-10 text-muted-foreground bg-card rounded-lg border border-dashed">
                                No history data available for {year}.
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
