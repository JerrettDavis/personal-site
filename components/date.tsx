import {parseISO, format} from 'date-fns';

export default function Date({dateString}: {dateString?: string}) {
    if (!dateString) return <></>;
    const date = parseISO(dateString);
    const display = format(date, 'LLLL d, yyyy');
    const tooltip = format(date, 'PPpp');
    return (
        <time dateTime={dateString} title={tooltip}>
            {display}
        </time>
    );
}
