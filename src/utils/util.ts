export const formatDate = (date: Date): string => {
    return date.toISOString();
};

export const parseCommand = (messageContent: string): string[] => {
    return messageContent.split(' ');
};
