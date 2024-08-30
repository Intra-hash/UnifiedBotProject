export interface User {
    userId: string;
    username: string;
    password: string;
}

export interface MessageCount {
    userId: string;
    month: number;
    count: number;
}

export interface VoiceParticipation {
    userId: string;
    month: number;
    entries: number;
    totalDuration: number;
}
