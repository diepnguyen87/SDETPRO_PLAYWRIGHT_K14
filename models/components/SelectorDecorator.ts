export function selector(selectorValue: any) {
    return function (target: any) {
        target.selectorValue = selectorValue
    }
}