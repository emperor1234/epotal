export type ConfidenceLevel = 1 | 2 | 3 | 4;

export type Contact = {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  companySize: string;
  status: 'Verified' | 'Catch-all';
  confidence: ConfidenceLevel;
  email: string;
  phone?: string;
  avatar: string;
  aiSummary: string;
  teamSize: string;
  estimatedRevenue: string;
  headquarters: string;
};

export const CONTACTS: Contact[] = [
  {
    id: 'alexander-thorne',
    name: 'Alexander Thorne',
    title: 'Founder & CEO',
    company: 'CloudStrata AI',
    location: 'London, UK',
    companySize: '11-50 employees',
    status: 'Verified',
    confidence: 3,
    email: 'a.thorne@cloudstrata.ai',
    phone: '+44 20 7946 0123',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces',
    aiSummary:
      'Alexander is a founder at CloudStrata AI with over a decade in enterprise SaaS. Based in London, he focuses on scaling engineering teams and growth infrastructure.',
    teamSize: '50 - 200',
    estimatedRevenue: '$10M - $25M',
    headquarters: 'London, UK',
  },
  {
    id: 'sarah-jenkins',
    name: 'Sarah Jenkins',
    title: 'Co-Founder & CTO',
    company: 'NeuralLink UK',
    location: 'Manchester, UK',
    companySize: '51-200 employees',
    status: 'Catch-all',
    confidence: 2,
    email: 's.jenkins@neurallink.co.uk',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=256&h=256&fit=crop&crop=faces',
    aiSummary:
      'Sarah co-founded NeuralLink UK and leads technical strategy. Her background spans applied AI and hardware-software integration.',
    teamSize: '51 - 200',
    estimatedRevenue: '$5M - $10M',
    headquarters: 'Manchester, UK',
  },
  {
    id: 'emily-roberts',
    name: 'Emily Roberts',
    title: 'Head of Sales & Growth',
    company: 'FinFlow SaaS',
    location: 'Edinburgh, UK',
    companySize: '1-10 employees',
    status: 'Verified',
    confidence: 4,
    email: 'e.roberts@finflow.io',
    phone: '+44 131 496 0987',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=crop&crop=faces',
    aiSummary:
      'Emily leads sales and growth at FinFlow, a financial SaaS startup. She focuses on go-to-market strategy and early-stage revenue scaling.',
    teamSize: '1 - 10',
    estimatedRevenue: '$1M - $5M',
    headquarters: 'Edinburgh, UK',
  },
  {
    id: 'marcus-sterling',
    name: 'Marcus Sterling',
    title: 'Founder & CEO',
    company: 'TechFlow',
    location: 'London, UK',
    companySize: '11 - 50 employees',
    status: 'Verified',
    confidence: 4,
    email: 'm.sterling@techflow.ai',
    phone: '+44 7700 900 123',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=256&h=256&fit=crop&crop=faces',
    aiSummary:
      'Marcus is a founder at TechFlow with 10 years experience in SaaS. He is currently based in London and focuses on enterprise growth and scaling high-performance engineering teams.',
    teamSize: '50 - 200',
    estimatedRevenue: '$10M - $25M',
    headquarters: 'London, UK',
  },
];
