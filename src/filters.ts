class Operand {
	constructor(public type:string) {}
	static make(cont:Contingency, token:EqParser.Token):Operand {
		if(token.is(EqParser.TokenType.IDENTIFIER)) {
			var split = token.val.split(":");
			if(split.length!==2)
				throw new Error("invalid identifier "+token.val);
			return cont.findFilter(split[0],split[1]);
		}
		if(token.is(EqParser.TokenType.NUMBER)) return new NumberOp(+token.val); 
	}
	doQuery(cont:Contingency):void {
		throw new Error("No doQuery on "+this.type);
	}
	getQuery():string {
		throw new Error("No getQuery on "+this.type);
	}
}

class NumberOp extends Operand {
	constructor(public val:number) {
		super("number");
	}
}

class SingleFilter extends Operand {
	constructor(public category:string, public value:string) {
		super("filter");
	}
	getQuery() {
		return this.category+":"+this.value;
	}
	doQuery(cont:Contingency) {
		return cont.get(this);
	}
}
class NoFilter extends Operand {
	constructor() {super("filter");}
	getQuery() { return ""; }
	doQuery(cont:Contingency) { cont.get(this);}
}

/// A category is a set of filters creating the whole group eg (male ∪ female)
/*class Category {
	constructor(public name:string, public values:Filter[]) {}
	static categories:Category[];
	static find(name:string) {
		for(var i=0;i<Category.categories.length;i++) {
			if(Category.categories[i].name===name) return Category.categories[i];
		}
		throw new Error("Unknown category "+name);
	}
	findValue(name:string) {
		for(var i=0;i<this.values.length;i++) {
			if(this.values[i].name===name) return this.values[i];
		}
		throw new Error("Unknown value "+name+" in category "+this.name);
	}
}*/

class CombinedFilter extends Operand {
	public filters;
	constructor(...filters) {
		super("filter");
		this.filters = filters;
	}
	public getQuery() {
		return this.filters.map(f=>f.getQuery()).join("&");
	}
	public doQuery() {
		return cont.get(this);
	}
}

class OperandVector extends Operand {
	constructor(public filters:Operand[]) {
		super("vector");
		console.log(filters);
	}
	doQuery(cont:Contingency) {
		return this.filters.map(filter => filter.doQuery(cont));
	}
}


var operators/*:{[types:string]:(v1:Operand,v2:Operand)=>Operand}*/ = {
	"filter&filter": (v1:Operand,v2:Operand) => new CombinedFilter(v1,v2),
	"filter&vector": (v1,v2) => new OperandVector(v2.filters.map(f => doOperator(v1,"&",f))),
	"vector&filter": (v1,v2) => new OperandVector(v1.filters.map(f => doOperator(f,"&",v2))),
};

function doOperator(v1:Operand, op:string, v2:Operand) {
	var opfn = operators[v1.type+op+v2.type];
	if(!opfn) throw new Error("Can't apply "+op+" to "+v1.type+" and "+v2.type);
	return opfn(v1,v2);
}
