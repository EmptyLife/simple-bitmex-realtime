

const MapArray = require("./mapArray")

class DeltaParser {
	constructor(options) {
		this.options = {
			maxTableLength: 10e3,
			...options
		};
		
		this.mapArray = null;
	}

	action(data) {
		try {
			if ( data.action === "partial" ) {
				this.mapArray = new MapArray(data.keys, this.options.maxTableLength);
				this.mapArray.insert(data.data);
				return;
			}
			
			switch(data.action) {
				case "insert": this.mapArray.insert(data.data); break;
				case "update": this.mapArray.update(data.data); break;
				case "delete": this.mapArray.delete(data.data); break;
			}
		} catch(e) {
		}
	}
	
	getData() {
		return this.mapArray ? this.mapArray.getArray() : null;
	}

}
class DeltaParserGroup {
	constructor(options) {
		this.options = {
			noSymbol: false,
			...options
		};

		this.noSymbol = !!this.options.noSymbol;
		
		this.symbols = new Map();
		
		this.filters = [this._chatFixError.bind(this)];
	}
	
	parse(message) {
		const filterKey = message.filterKey || (this.noSymbol ? false : "symbol");
		if ( filterKey === false ) {
			return this._parseSymbol(message, "*", message.data);
		}
		
		const map = {};
		for(const item of message.data) {
			const key = item[filterKey];
			(map[key] = map[key] || []).push(item);
		}
		
		let ret = [];
		for(const key in map) {
			ret = [].concat(ret, this._parseSymbol(message, key, map[key]));
		}
		
		return ret;
	}
	_parseSymbol(message, key, data) {
		const ret = [];
		
		let deltaParser = this.symbols.get(key);
		if ( !deltaParser ) {
			deltaParser = new DeltaParser(this.options);
			this.symbols.set(key, deltaParser);
		}
		
		for(const filter of this.filters) {
			filter(message, key, data, deltaParser);
		}

		if ( key !== "*") {ret.push([`${message.action}@${message.table}:${key}`, data, key]);}
		ret.push([`${message.action}@${message.table}:*`, data, key]);
		if ( this.noSymbol ) {ret.push([`${message.action}@${message.table}`, data, key]);}
		
		deltaParser.action({...message, data});
		const tbData = deltaParser.getData();
		if ( tbData ) {
			if ( key !== "*") {ret.push([`${message.table}:${key}`, data, key]);}
			ret.push([`${message.table}:*`, data, key]);
			if ( this.noSymbol ) {ret.push([`${message.table}`, data, key]);}
		}
		
		return ret;
	}
	
	_chatFixError(message, key, data, deltaParser) {
		if ( message.table === "chat" && message.action === "insert" && Array.isArray(message.keys) && !deltaParser.getData() ) {
			deltaParser.action({table: message.table, action: "partial", keys: message.keys, data: []});
		}
	}
}
class DeltaParserGroupTables {
	constructor(options) {
		this.options = {...options};
		
		this.tables = new Map();
		this.map = new Map();
	}
	
	parse(message) {
		let table = this.tables.get(message.table);
		if ( !table ) {
			table = new DeltaParserGroup({
				...this.options,
				noSymbol: this.options.noSymbolTables.includes(message.table),
			});
			this.tables.set(message.table, table);
		}
		
		return table.parse(message);
	}
}


module.exports = DeltaParserGroupTables;
