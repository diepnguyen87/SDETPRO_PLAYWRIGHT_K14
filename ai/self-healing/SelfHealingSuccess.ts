export default class SelfHealingSuccess extends Error {

    constructor() {
        super("Self-healing succeeded. Test rerun passed.");
        this.name = "SelfHealingSuccess";
        Object.setPrototypeOf(this, SelfHealingSuccess.prototype);
    }
}