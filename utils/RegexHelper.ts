export function getAdditionalPriceByRegex(searchStr: string) {
    const matchesStr = searchStr.match(/[+-]\d+\.\d+/g)
    if(matchesStr){
        return Number(matchesStr[0].substring(1))
    }
    return 0
}