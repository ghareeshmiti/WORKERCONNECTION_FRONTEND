export interface Scheme {
    id: string;
    title: string;
    category: string;
    schemeType: 'Central' | 'State';
    description: string;
    benefit: string;
    eligible: boolean;
    availed: boolean;
    icon?: string;
}

export const GENERIC_SCHEMES: Scheme[] = [
    // CENTRAL SCHEMES
    {
        id: '1',
        title: 'Health Scheme',
        category: 'Health & Wellness',
        schemeType: 'Central',
        description: 'Comprehensive medical coverage including preventive care, diagnostics, and hospitalization.',
        benefit: 'Medical coverage',
        eligible: true,
        availed: false,
    },
    {
        id: '2',
        title: 'Pension Scheme',
        category: 'Retirement Benefits',
        schemeType: 'Central',
        description: 'Monthly pension benefits after retirement age with 10+ years of service.',
        benefit: 'Pension: ₹3,000/mo',
        eligible: true,
        availed: false,
    },
    {
        id: '7',
        title: 'Insurance Coverage',
        category: 'Insurance',
        schemeType: 'Central',
        description: 'Accidental and life insurance protection with family coverage.',
        benefit: 'Insurance: ₹5L',
        eligible: true,
        availed: true,
    },
    // STATE SCHEMES
    {
        id: '3',
        title: 'Women Welfare Scheme',
        category: 'Women Empowerment',
        schemeType: 'State',
        description: 'Financial assistance and support programs for women workers and their families.',
        benefit: 'Monthly stipend',
        eligible: true,
        availed: false,
    },
    {
        id: '4',
        title: 'Transport Allowance',
        category: 'Allowances',
        schemeType: 'State',
        description: 'Daily transport allowance for commuting to work site.',
        benefit: 'Cash: ₹500/mo',
        eligible: true,
        availed: true,
    },
    {
        id: '5',
        title: 'Education Support',
        category: 'Education & Development',
        schemeType: 'State',
        description: 'Educational assistance for children including scholarships and skill training.',
        benefit: 'Financial aid',
        eligible: true,
        availed: false,
    },
    {
        id: '6',
        title: 'Disability Assistance',
        category: 'Disability Benefits',
        schemeType: 'State',
        description: 'Support and compensation for workers with disabilities.',
        benefit: 'Compensation',
        eligible: false,
        availed: false,
    },
    {
        id: '8',
        title: 'Food & Nutrition',
        category: 'Nutrition',
        schemeType: 'State',
        description: 'Subsidized meals and nutrition support at work sites.',
        benefit: 'Subsidized meals',
        eligible: true,
        availed: false,
    },
];
