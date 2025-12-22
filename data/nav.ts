export interface NavItem {
    label: string;
    href: string;
    description: string;
    keywords?: string[];
    showInNav?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
    {
        label: 'About',
        href: '/about-me',
        description: 'Bio, background, and work history.',
        keywords: ['bio', 'experience'],
    },
    {
        label: 'Blog',
        href: '/blog',
        description: 'Long-form writing, engineering notes, and essays.',
        keywords: ['posts', 'writing', 'engineering'],
    },
    {
        label: 'Projects',
        href: '/projects',
        description: 'Active repositories, highlights, and project notes.',
        keywords: ['github', 'portfolio'],
    },
    {
        label: 'Hobbies',
        href: '/hobbies',
        description: 'Off-hours interests and hobby-tagged posts.',
        keywords: ['interests', 'life'],
        showInNav: false,
    },
    {
        label: 'Tools',
        href: '/tools',
        description: 'Hardware, software, and gadgets that power my workflow.',
        keywords: ['stack', 'gear'],
        showInNav: false,
    },
    {
        label: 'Docs',
        href: '/docs',
        description: 'Architecture notes, technical decisions, and platform details.',
        keywords: ['documentation', 'architecture', 'decisions'],
        showInNav: false,
    },
    {
        label: 'Search',
        href: '/search',
        description: 'Search posts and key pages.',
        keywords: ['find', 'lookup'],
    },
];
