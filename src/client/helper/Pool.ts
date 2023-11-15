export class Pool<T> {
    public inUse = new Array<T>();
    public unused = new Array<T>();

    public constructor(
        private createObject: () => T,
        private destroyObject: (object: T) => void,
        private initializeObject: (object: T) => void = null,
        private freeObject: (object: T) => void = null
    ) {
    }

    public getOrCreate() {
        let object: T = null;
        if (this.unused.length > 0) {
            object = this.unused.pop();
        } else {
            object = this.createObject();
        }

        this.inUse.push(object);

        if (this.initializeObject)
            this.initializeObject(object);

        return object;
    }

    public free(object: T) {
        const index = this.inUse.indexOf(object);
        if (index >= 0) {
            this.inUse.splice(index, 1);
        } else {
            console.error("Tried to free an object that was not in use", object);
        }

        this.freeObject(object);

        this.unused.push(object);
    }

    public destroyCurrentlyInUseObjects() {
        this.inUse.forEach(this.destroyObject);
        this.inUse.length = 0;
    }

    public destroyFreedObjects() {
        this.unused.forEach(this.destroyObject);
        this.unused.length = 0;
    }
}