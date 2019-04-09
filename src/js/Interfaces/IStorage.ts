//From localForage project

export default interface IStorage {
    getItem<T>(key: string, callback?: (err: any, value: T) => void): Promise<T>;

    setItem<T>(key: string, value: T, callback?: (err: any, value: T) => void): Promise<T>;

    // Ignore for now 
    // removeItem(key: string, callback?: (err: any) => void): Promise<void>;

    // clear(callback?: (err: any) => void): Promise<void>;

    // length(callback?: (err: any, numberOfKeys: number) => void): Promise<number>;

    // key(keyIndex: number, callback?: (err: any, key: string) => void): Promise<string>;

    // keys(callback?: (err: any, keys: string[]) => void): Promise<string[]>;

    // iterate<T, U>(iteratee: (value: T, key: string, iterationNumber: number) => U,
    //         callback?: (err: any, result: U) => void): Promise<U>;
}