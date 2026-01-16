import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Phone, MapPin, Calendar, User, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';

const MOCK_SCHEMES_ELIGIBLE = [
    { name: 'Annadata Sukhibhava', telugu: 'అన్నదాత సుఖీభవ', status: 'Eligible', bg: 'bg-green-100 text-green-800' },
    { name: 'Deepam 2.0', telugu: 'దీపం 2.0', status: 'Eligible', bg: 'bg-green-100 text-green-800' },
    { name: '100 Days Work (MGNREGA)', telugu: '100 రోజుల పని', status: 'Eligible', bg: 'bg-green-100 text-green-800' },
    { name: 'NTR Vaidya Seva', telugu: 'ఎన్టీఆర్ వైద్య సేవ', status: 'Eligible', bg: 'bg-green-100 text-green-800' }
];

const MOCK_SCHEMES_NOT_ELIGIBLE = [
    "Talliki Vandanam", "Aada Bidda Nidhi", "Stree Shakti", "Nirudyoga Bruthi", "NTR Bharosa", "NTR Bharosa (PH)"
];

const CURRENT_MONTH_DATA = [
    { name: 'Annadata Sukhibhava', telugu: 'అన్నదాత సుఖీభవ', status: 'Taken', date: '2026-01-15' },
    { name: 'Deepam 2.0', telugu: 'దీపం 2.0', status: 'Taken', date: '2026-01-20' },
    { name: '100 Days Work (MGNREGA)', telugu: '100 రోజుల పని', status: 'Pending', date: '-' },
    { name: 'NTR Vaidya Seva', telugu: 'ఎన్టీఆర్ వైద్య సేవ', status: 'Pending', date: '-' }
];

const HISTORY_DATA: any = {
    '2025': [
        {
            month: 'December 2024',
            items: [
                { name: 'Annadata Sukhibhava', status: 'Taken', date: '2024-12-08' },
                { name: 'Deepam 2.0', status: 'Taken', date: '2024-12-25' },
                { name: '100 Days Work (MGNREGA)', status: 'Taken', date: '2024-12-24' },
                { name: 'NTR Vaidya Seva', status: 'Taken', date: '2024-12-13' }
            ]
        },
        {
            month: 'November 2024',
            items: [
                { name: 'Annadata Sukhibhava', status: 'Taken', date: '2024-11-21' },
                { name: 'Deepam 2.0', status: 'Taken', date: '2024-11-09' },
                { name: '100 Days Work (MGNREGA)', status: 'Taken', date: '2024-11-26' },
                { name: 'NTR Vaidya Seva', status: 'Taken', date: '2024-11-21' }
            ]
        }
    ]
};

// Mask Aadhaar: **** **** 1234
const maskAadhaar = (num: string) => {
    if (!num || num.length < 4) return num;
    const last4 = num.slice(-4);
    return `**** **** ${last4}`;
};

export default function PublicWorkerProfile() {
    const [searchParams] = useSearchParams();
    const workerId = searchParams.get('workerid'); // This is the Aadhaar number
    const [worker, setWorker] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState('2025');

    useEffect(() => {
        async function fetchWorker() {
            if (!workerId) {
                setLoading(false);
                return;
            }
            try {
                const { data, error } = await supabase
                    .from('workers')
                    .select('*')
                    .eq('aadhaar_number', workerId) // Mapping workerid query param to aadhaar_number column
                    .maybeSingle();

                if (error) console.error(error);
                if (data) setWorker(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchWorker();
    }, [workerId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Fallback if no worker found, or just show empty state? User said "if user details undifind show the static data as of now"
    // So we render the static layout regardless, just empty user details if missing.

    const displayWorker = worker || {
        first_name: 'Worker',
        last_name: 'Not Found',
        district: 'Unknown',
        mandal: 'Unknown',
        village: 'Unknown',
        phone: '----------',
        aadhaar_number: workerId || '000000000000',
        date_of_birth: '1980-01-01',
        gender: 'Unknown'
    };

    const age = new Date().getFullYear() - new Date(displayWorker.date_of_birth).getFullYear();

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header Card */}
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                            {/* Profile Icon */}
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-10 h-10 text-blue-600" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {displayWorker.first_name} {displayWorker.last_name}
                                    </h1>
                                    <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700">Farmer</Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mt-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>Age: {age} years ({displayWorker.gender})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4" />
                                            <span>{displayWorker.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold">A</div>
                                            <span>Aadhaar: {maskAadhaar(displayWorker.aadhaar_number)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1 md:text-right">
                                        <div className="flex items-center gap-2 md:justify-end">
                                            <MapPin className="w-4 h-4" />
                                            <span>{displayWorker.village}, {displayWorker.mandal}</span>
                                        </div>
                                        <div className="pl-6 md:pl-0">District: {displayWorker.district}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Schemes Eligibility */}
                <Card className="border-none shadow-sm">
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
                        <TabsTrigger value="current" className="py-2">Current Month (Jan 2026)</TabsTrigger>
                        <TabsTrigger value="history" className="py-2">Year-wise History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="current">
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <h3 className="font-bold text-lg">January 2026 - Scheme Status</h3>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-blue-900 text-white text-left text-sm">
                                                <th className="p-4 rounded-tl-lg font-medium">Scheme Name</th>
                                                <th className="p-4 font-medium">Status</th>
                                                <th className="p-4 rounded-tr-lg font-medium text-right">Date Received</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {CURRENT_MONTH_DATA.map((item, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50">
                                                    <td className="p-4">
                                                        <div className="font-medium text-gray-900">{item.name}</div>
                                                        <div className="text-xs text-gray-500">{item.telugu}</div>
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
                                                    <td className="p-4 text-right text-sm text-gray-600">
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
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg">Year-wise Scheme History</h3>
                                <Select value={year} onValueChange={setYear}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2026">2026</SelectItem>
                                        <SelectItem value="2025">2025</SelectItem>
                                        <SelectItem value="2024">2024</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Render History Data */}
                            {HISTORY_DATA[year] ? (
                                HISTORY_DATA[year].map((monthGroup: any, idx: number) => (
                                    <Card key={idx} className="border-none shadow-sm overflow-hidden">
                                        <div className="bg-gray-100 px-4 py-3 font-semibold text-gray-700 border-b">
                                            {monthGroup.month}
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="text-left text-xs text-gray-500 border-b">
                                                        <th className="p-4 font-medium">Scheme</th>
                                                        <th className="p-4 font-medium text-center">Status</th>
                                                        <th className="p-4 font-medium text-right">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-sm">
                                                    {monthGroup.items.map((item: any, i: number) => (
                                                        <tr key={i} className="hover:bg-gray-50/50">
                                                            <td className="p-4 font-medium text-gray-900">{item.name}</td>
                                                            <td className="p-4 text-center">
                                                                <span className="inline-flex justify-center items-center w-6 h-6 rounded-full bg-green-100">
                                                                    <Check className="w-3 h-3 text-green-600" />
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-right text-gray-600">{item.date}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="text-center py-10 text-muted-foreground bg-white rounded-lg border border-dashed">
                                    No history data available for {year}.
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="text-center text-xs text-gray-400 mt-8">
                    © {new Date().getFullYear()} Government of Andhra Pradesh. All Rights Reserved.
                </div>
            </div>
        </div>
    );
}
