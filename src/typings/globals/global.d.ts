declare global {
    interface String {
        findSubstring(startText: string, endText: string, returnInner: any, ignoreCase: boolean): string;
        toBase64(text : string) : string;
    }

    interface Array {
        wait(arr: []): void;
    }
   
}