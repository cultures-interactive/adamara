import { makeAutoObservable, observable } from "mobx";
import { ItemModel } from "../../shared/game/ItemModel";

export class ItemStore {
    private items: Map<string, ItemModel>;
    private editorSelectedItem: ItemModel;

    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
        this.items = observable.map(new Map());
    }

    public setAllItems(newItems: Map<string, ItemModel>) {
        this.items = observable.map(newItems);
    }

    public setItem(newItem: ItemModel) {
        this.items.set(newItem.id, newItem);
    }

    public setSelectedItem(item: ItemModel) {
        this.editorSelectedItem = item;
    }

    public deleteItem(itemToDelete: ItemModel) {
        this.items?.delete(itemToDelete.id);
    }

    public deleteItemById(itemId: string) {
        this.items?.delete(itemId);
    }

    public getItem(id: string): ItemModel {
        return this.items?.get(id);
    }

    public getItemsForTag(tag: string) {
        return this.getAllItems.filter(item => !tag || item.tags.indexOf(tag) >= 0);
    }

    /**
     * All items that have *one* of the given tags.
     */
    public getItemsForSomeTag(tags: string[]) {
        return this.getAllItems.filter(item => tags.some(t => item.tags.includes(t)));
    }

    /**
     * All items that have *all* of the given tags.
     */
    public getItemsForEveryTag(tags: string[]) {
        return this.getAllItems.filter(item => tags.every(t => item.tags.includes(t)));
    }

    public get getAllItems(): ItemModel[] {
        if (!this.items || this.items.size === 0) return [];
        return Array.from(this.items.values());
    }

    public get selectedItem(): ItemModel {
        return this.editorSelectedItem;
    }

    public getAllItemTags() {
        return [...new Set(this.getAllItems.map(item => item.tags).flat())].filter(t => t !== '').sort();
    }
}

export const itemStore = new ItemStore();