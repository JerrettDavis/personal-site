import type {ReactNode} from 'react';

export interface StatItem {
    id: string;
    label: ReactNode;
    value: ReactNode;
}

interface StatGridProps {
    items: StatItem[];
    gridClassName?: string;
    itemClassName?: string;
    labelClassName?: string;
    valueClassName?: string;
}

export default function StatGrid({
    items,
    gridClassName,
    itemClassName,
    labelClassName,
    valueClassName,
}: StatGridProps) {
    return (
        <div className={gridClassName}>
            {items.map((stat) => (
                <div className={itemClassName} key={stat.id}>
                    <div className={valueClassName}>{stat.value}</div>
                    <div className={labelClassName}>{stat.label}</div>
                </div>
            ))}
        </div>
    );
}
