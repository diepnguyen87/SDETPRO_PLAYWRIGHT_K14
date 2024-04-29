export function selector(selectorValue: any) {
    return function (target: any) {
        target.selectorValue = selectorValue
    }

    // return function (constructor: Function) {
    //     constructor['selectorValue'] = selectorValue;
    // }
}

// export function selector(selectorValue: string) {
//     return function (target: any, propertyKey?: string) {
//         if (propertyKey) {
//             // If propertyKey is provided, it's a property decorator.
//             target[propertyKey] = selectorValue;
//         } else {
//             // If propertyKey is not provided, it's a class decorator.
//             target.selectorValue = selectorValue;
//         }
//     }
// }