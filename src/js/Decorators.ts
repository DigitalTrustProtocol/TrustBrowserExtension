export class Decorators {
    /**
     * @typeCheck decorator that sets a check on type in runtime.
     * @param typeName string.
     */
    static typeCheck(target: any, propertyKey: string, typeName: string) : void {
        // return function (target: any, propertyKey: string) {
        //     let descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {};
        //     descriptor.set = function (value) {
        //         if (typeof value != typeName)
        //             throw new Error(`${propertyKey} (${typeName}) cannot be set to object of type: ${typeof value}`);
        //         target["_"+propertyKey] = value;
        //     }
        //     Object.defineProperty(target, propertyKey, descriptor)
        // };

        // let descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {};
        // descriptor.set = function(x: string) {
        //         if (x && typeof x != typeName)
        //             throw new Error(`${propertyKey} (${typeName}) cannot be set to object of type: ${typeof x}`);
        //         this['_'+propertyKey] = x;
        //     };

        // Object.defineProperty(target, propertyKey, descriptor)
        Object.defineProperty(target, '_'+propertyKey, {
            enumerable: false,
            configurable: false,
            writable: true
        });

        Object.defineProperty(target, propertyKey, {
            get() {
              return this['_'+propertyKey];
            },
            set(value: string) {
                if (value && typeof value != typeName)
                    throw new Error(`${propertyKey} (${typeName}) cannot be set to object of type: ${typeof value}`);
                this['_'+propertyKey] = value;
            },
            enumerable: true
          });



    }

}