export interface ToolDetailGroup {
    label: string;
    items: string[];
}

export interface ToolItem {
    name: string;
    description?: string;
    groups?: ToolDetailGroup[];
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
                groups: [
                    {
                        label: 'Specs',
                        items: [
                            'Intel i9-14900K',
                            'Nvidia RTX 4090',
                            '64GB DDR4 6400MHz RAM',
                        ],
                    },
                ],
                link: null,
            },
            {
                name: 'Travel setup',
                groups: [
                    {
                        label: 'Specs',
                        items: [
                            'Lenovo Legion 14th Gen i9',
                            'RTX 4080',
                            '64GB RAM',
                        ],
                    },
                ],
                link: null,
            },
            {
                name: 'Desk peripherals',
                groups: [
                    {
                        label: 'Home primary',
                        items: [
                            'Drop Ctrl v2 + Gateron Baby Kangaroo Tactile switches + MT3 Triumph keycaps.',
                        ],
                    },
                    {
                        label: 'Displays',
                        items: [
                            '3x 4K monitors (32" center, Samsung 240Hz QD-OLED, sides 2x Samsung 27" HDR 4K).',
                        ],
                    },
                    {
                        label: 'Controls',
                        items: [
                            'Elgato Stream Deck.',
                            'Adafruit MacroPad.',
                        ],
                    },
                    {
                        label: 'Work primary',
                        items: [
                            'Wobkey Crush 80 Reboot Pro Blue + DUROCK Silent Shrimp Tactile switches + Drop MT3 Fairlane keycaps.',
                        ],
                    },
                    {
                        label: 'Rotation',
                        items: [
                            'Too many keyboards to count.',
                        ],
                    },
                ],
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
                groups: [
                    {
                        label: 'Editors',
                        items: [
                            'Rider',
                            'Neovim',
                        ],
                    },
                    {
                        label: 'Terminals',
                        items: [
                            'Windows Terminal (pwsh)',
                            'bash',
                        ],
                    },
                ],
                link: null,
            },
            {
                name: 'Knowledge system',
                description: 'A lightweight note stack for ideas, documentation, and project tracking.',
                link: null,
            },
            {
                name: 'Design & diagramming',
                groups: [
                    {
                        label: 'Tools',
                        items: [
                            'Pen and paper.',
                        ],
                    },
                ],
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
                groups: [
                    {
                        label: 'Core',
                        items: [
                            'Home Assistant.',
                        ],
                    },
                    {
                        label: 'Devices',
                        items: [
                            'Govee, Ubiquiti, TPLink Kasa, OPNsense.',
                            'Z-Wave, Docker, Wyze, Reolink, and more.',
                        ],
                    },
                ],
                link: null,
            },
            {
                name: 'Photography kit',
                groups: [
                    {
                        label: 'Bodies',
                        items: [
                            'Canon 6D.',
                            'Canon T3i.',
                        ],
                    },
                    {
                        label: 'Lenses',
                        items: [
                            '50mm f/1.8.',
                            '70-200mm f/2.8L IS USM II.',
                            '35-105mm f/4.5-5.6L IS.',
                        ],
                    },
                ],
                link: null,
            },
            {
                name: '3D printing bench',
                groups: [
                    {
                        label: 'Printers',
                        items: [
                            'Ender 3 Pro to Voron Switchwire conversion.',
                            'Voron 2.4r2.',
                            'Voron v0.1.',
                            'Creality K1.',
                            'Qidi Tech Q-Plus 3.',
                        ],
                    },
                ],
                link: null,
            },
        ],
    },
];
