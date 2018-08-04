
class MapArray {
	constructor(keys = [], maxlength = 10e3) {
		this.keys = keys;
		this.maxlength = maxlength;

		this.map = new Map();
		this.array = [];
		
		this.fnItemKey = new Function("item", `return JSON.stringify([ ${keys.map(key => JSON.stringify(key)).map(key => "item["+key+"]").join(",")} ])`);
		
		/**
		if ( !keys.length ) {
			this.map = null;
			this.insert = (array) => this.array = [].concat(this.array, array).slice(-this.maxlength);
			this.update = this.delete = () => {throw new Error("Update not support. Keys is empty")};
		}
		*/
	}
	
	insert(array) {
		for(const newItem of array) {
			const key = this.fnItemKey(newItem);
			if ( !this.map.has(key) ) {
				this.map.set(key, newItem);
				this.array.push(newItem);
			}
		}
		
		const delItemArray = this.array.slice(0, -this.maxlength);
		this.array = this.array.slice(-this.maxlength);
		for(const item of delItemArray) {
			this.map.delete(this.fnItemKey(item));
		}
	}
	update(array) {
		for(const newItem of array) {
			const key = this.fnItemKey(newItem);
			const oldItem = this.map.get(key);
			if ( oldItem ) {
				Object.assign(oldItem, newItem);
			}
		}
	}
	delete(array) {
		const delItemWeakMap = new WeakMap();
		for(const newItem of array) {
			const key = this.fnItemKey(newItem);
			const oldItem = this.map.get(key);
			if ( oldItem ) {
				delItemWeakMap.set(oldItem, true);
				this.map.delete(key);
			}
		}
		
		const delIndexArray = [];
		for(let i = 0; i < this.array.length; i++) {
			const oldItem = this.array[i];
			if ( delItemWeakMap.has(oldItem) ) {
				delIndexArray.push(i);
			}
		}
		
		for(const i of delIndexArray) {
			this.array.splice(i, 1);
		}
	}
	
	
	setMaxLength(maxlength) {
		this.maxlength = maxlength;
	}


	getArray() {
		return this.array;
	}
}

module.exports = MapArray;
