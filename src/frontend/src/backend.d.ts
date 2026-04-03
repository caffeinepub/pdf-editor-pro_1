import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Preferences {
    recentTools: Array<string>;
    darkMode: boolean;
    sessionMetadata?: {
        fileName: string;
        pageCount: bigint;
    };
}
export interface backendInterface {
    getPreferences(): Promise<Preferences>;
    setPreferences(prefs: Preferences): Promise<void>;
}
