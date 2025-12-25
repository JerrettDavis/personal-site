export const toPathRegex = (value: string) =>
    new RegExp(`${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
