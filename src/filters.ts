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

	toString():string {
		return this.getQuery();
	}
}

class NumberOp extends Operand {
	constructor(public val:number) {
		super("number");
	}
	doQuery(cont:Contingency) {
		return this.val;
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

function getOperator(v1:Operand, op:string, v2:Operand) {
var operators/*:{[types:string]:(v1:Operand,v2:Operand)=>Operand}*/ = {
	"filter&filter": (v1:Operand,v2:Operand) => new CombinedFilter(v1,v2),
	"number+number": (v1,v2) => new NumberOp(v1.val+v2.val),
	"number-number": (v1,v2) => new NumberOp(v1.val-v2.val),
	"number/number": (v1,v2) => new NumberOp(v1.val/v2.val),
	"number*number": (v1,v2) => new NumberOp(v1.val*v2.val),
	//"filter+number": (v1,v2) => new NumberOp(v1.val+v2.val),
	"filter#":(v) => new NumberOp(v.doQuery(cont)),
	"vectorΣ":(v) => v.filters.reduce((f1,f2) => doOperator(f1,'+',f2)),
	//"filter/filter": (v1,v2) => new NumberOp(v1.val/v2.val)
};
	var opid = v1.type+op+v2.type;
	if(operators.hasOwnProperty(opid)) return operators[opid];
	if(op===",") {
		return (v1,v2) => {
			var left = v1.type === "vector" ? v1.filters : [v1];
			var right = v2.type === "vector" ? v2.filters : [v2];
			return new OperandVector(left.concat(right));
		}
	}
	if(v1.type === "vector" && v2.type !== "vector") {
		return (v1,v2) => new OperandVector(v1.filters.map(f => doOperator(f,op,v2)));
	}
	else if(v1.type !== "vector" && v2.type === "vector") {
		return (v1,v2) => new OperandVector(v2.filters.map(f => doOperator(v1,op,f)));
	}
}

// warning: operators do not guarantee 
function doOperator(v1:Operand, op:string, v2:Operand) {
	var opfn = getOperator(v1,op,v2);
	if(!opfn) throw new Error("Can't apply '"+op+"' to "+v1.type+" and "+v2.type);
	return opfn(v1,v2);
}
