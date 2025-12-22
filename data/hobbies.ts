export interface HobbyBlurb {
    title: string;
    summary: string;
    primaryTag: string;
    tags: string[];
}

export const HOBBIES: HobbyBlurb[] = [
    {
        title: 'Automation',
        summary: 'Automating everything: home, code, builds, and life. If it repeats, it gets scripted.',
        primaryTag: 'automation',
        tags: ['scripting', 'iot'],
    },
    {
        title: 'Education',
        summary: 'Learning, teaching, and spreading the joy of picking up new skills and deeper context.',
        primaryTag: 'education',
        tags: ['learning', 'mentoring'],
    },
    {
        title: 'Handyman Stuff',
        summary: 'Building things, pulling out the power tools, and turning "I wonder if I can" into "I did."',
        primaryTag: 'handyman',
        tags: ['diy', 'maker'],
    },
    {
        title: 'Gaming',
        summary: 'My entryway into coding. I still love RTS, MMORPGs, racing sims, and whatever hooks me.',
        primaryTag: 'gaming',
        tags: ['rts', 'mmorpg', 'racing'],
    },
    {
        title: 'Cars',
        summary: 'Always loved them. I keep a couple fun ones around and enjoy being in the orbit.',
        primaryTag: 'cars',
        tags: ['motorsport', 'tuning'],
    },
    {
        title: 'Keyboards',
        summary: 'The hobby of the month: ergonomics, clicky, clacky, tactile, thocky. It is all fun.',
        primaryTag: 'keyboards',
        tags: ['ergonomics', 'mechanical'],
    },
    {
        title: '3D Printing',
        summary: 'I tweak, tune, and design small parts and tools, usually in service of another project.',
        primaryTag: '3d-printing',
        tags: ['cad', 'prototyping'],
    },
    {
        title: 'Photography',
        summary: 'Mostly landscapes and travel shots, with an occasional portrait session for friends.',
        primaryTag: 'photography',
        tags: ['travel', 'landscapes'],
    },
    {
        title: 'Cooking',
        summary: 'A mix of gadgets, slow experiments, and one too many sauces to label in the fridge.',
        primaryTag: 'cooking',
        tags: ['recipes', 'gadgets'],
    },
    {
        title: 'Crocheting',
        summary: 'A creative reset that produces wearables, gifts, and the occasional cozy oddity.',
        primaryTag: 'crocheting',
        tags: ['craft'],
    },
];
