export interface ToolItem {
    name: string;
    description: string;
    link?: string | null;
}

export interface ToolCategory {
    title: string;
    description: string;
    items: ToolItem[];
}

export const TOOL_CATEGORIES: ToolCategory[] = [
    {
        title: 'Hardware',
        description: 'Core devices I rely on for daily work and deep focus.',
        items: [
            {
                name: 'Primary workstation',
                description: 'My daily driver for building, writing, and running multi-service projects.',
                link: null,
            },
            {
                name: 'Travel setup',
                description: 'A lightweight kit for coding, note taking, and quick edits on the go.',
                link: null,
            },
            {
                name: 'Desk peripherals',
                description: 'Comfort-forward keyboard, mouse, and audio gear tuned for long sessions.',
                link: null,
            },
        ],
    },
    {
        title: 'Software',
        description: 'The apps and services that keep my workflow sharp.',
        items: [
            {
                name: 'Editor & terminal',
                description: 'My preferred coding environment with a minimal, keyboard-heavy setup.',
                link: null,
            },
            {
                name: 'Knowledge system',
                description: 'A lightweight note stack for ideas, documentation, and project tracking.',
                link: null,
            },
            {
                name: 'Design & diagramming',
                description: 'Tools for mapping architecture, flows, and quick visual thinking.',
                link: null,
            },
        ],
    },
    {
        title: 'Gadgets',
        description: 'Small but delightful tools that make the work feel better.',
        items: [
            {
                name: 'Smart home',
                description: 'Automation gear that keeps the house calm while I build.',
                link: null,
            },
            {
                name: 'Photography kit',
                description: 'A dependable setup for capturing travel, people, and moments.',
                link: null,
            },
            {
                name: '3D printing bench',
                description: 'A tinkering space for prototypes, fixes, and small experiments.',
                link: null,
            },
        ],
    },
];
