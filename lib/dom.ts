export const shouldIgnoreKeyEvent = (target: EventTarget | null) => {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return target.isContentEditable;
};
