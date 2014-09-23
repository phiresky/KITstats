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
	doQuery(cont:Contingency):any {
		throw new Error("No doQuery on "+this.type);
	}
	getQuery():string {
		throw new Error("No getQuery on "+this.type);
	}

	toString():string {
		return this.getQuery();
	}
}

class GraphInfo {
	xaxis:string[];
	ytitle:string="Studenten";
	xtitle:string;
	title:string;
	subtitle:string;
}
	

class Filter extends Operand {
	constructor() { super("filter"); }
	doQuery(cont:Contingency):any {
		return cont.get(this);
	}
}

class NumberOp extends Operand {
	constructor(public val:number) {
		super("number");
	}
	doQuery(cont:Contingency) {
		return this.val;
	}
	toString() { return this.val+""; }
}

class SingleFilter extends Filter {
	constructor(public category:string, public value:string) {
		super();
	}
	getQuery() {
		return this.category+":"+this.value;
	}
}


// like a filter, but has numerical values allowing addition
class DiscreteFilter extends SingleFilter {
	constructor(public discrete:Discrete, value:string, public numval:number) {
		super(discrete.name, value);
	}
}

// a category of discrete filters
class Discrete {
	constructor(public name:string, public max:number, public names:string[]) {
	}
	getByValue(val:number) {
		if(val<0||val>this.max) throw new Error(this.name+" out of bounds: "+val);
		return new DiscreteFilter(this, this.names[val], val);
	}
	getByName(name:string) {
		return this.getByValue(this.names.indexOf(name.trim()));
	}
	getAll() {
		var arr:DiscreteFilter[] = [];
		for(var i=0;i<=this.max;i++) arr.push(this.getByValue(i));
		return arr;
	}
}

class NoFilter extends Filter {
	constructor() {super();}
	getQuery() { return ""; }
}
// when encountered while importing, ignore the column
class IgnoreFilter extends Filter {
	constructor() {super();}
}

class CombinedFilter extends Filter {
	public filters:Filter[];
	constructor(...filters:Filter[]) {
		super();
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
	constructor(public ops:Operand[]) {
		super("vector");
	}
	doQuery(cont:Contingency) {
		return this.ops.map(op => op.doQuery(cont));
	}

	// nobody will ever understand this again
	getGraphInfo(cont:Contingency):GraphInfo {
		if(this.ops.some(op => !(op instanceof Filter))) {
			return new GraphInfo();
		}
		var reduceFilter = (vec:Filter[], filter:Filter) => {
			var arr = [filter];
			if(filter instanceof CombinedFilter)
				arr = (<CombinedFilter>filter).filters.reduce(reduceFilter,[]);
			if(filter instanceof OperandVector)
				arr = (<OperandVector>filter).ops.reduce(reduceFilter,[]);
			return <SingleFilter[]> vec.concat(arr);
		}
		var filters = this.ops.map(op => reduceFilter([],op));
		var occurrences:{[filter:string]:{filter:SingleFilter;count:number}} = {};
		filters.forEach(fs => fs.forEach(f => {
			var fstr = f.toString();
			if(!(fstr in occurrences)) occurrences[fstr]={filter:f,count:1};
			else occurrences[fstr].count++;
		}));
		// filters that exist on all elements
		var all:SingleFilter[] = Object.keys(occurrences).filter(key => occurrences[key].count == this.ops.length).map(key => occurrences[key].filter);
		console.log(this.ops.length);
		filters = filters.map(fs => fs.filter(f => all.indexOf(f) < 0));
		var xtitle:string = undefined;
		var subtitle:string = undefined;
		var xaxis:string[] = undefined;
		var title = all.length>0?all.map(f => sprintf("%(cat)s: %(val)s",cont.stringify(f))).join(", "): undefined;
		// if all filters are single and have the same category
		console.log(filters);
		if(filters[0].length === 0) return new GraphInfo();
		var allcat:string = filters[0][0].category;
		if(filters.every(f => f.length==1&&f[0].category == allcat)) {
			xtitle = cont.stringify(filters[0][0]).cat;
			if(title === undefined) title = xtitle;
			else subtitle = "nach "+xtitle;
			xaxis = filters.map(f => cont.stringify(f[0]).val)
		} else xaxis = filters.map(fs => fs.map(f => {var v=cont.stringify(f);return v.cat+": "+v.val;}).join(" ∩ "));
		return {
			title:title,
			subtitle:subtitle,
			xaxis:xaxis,
			xtitle:xtitle,
			ytitle:"Studenten"
		};
	}
}

var operators:{[types:string]:(v1:any,v2:any)=>Operand} = {
	"filter&filter": (v1:Operand,v2:Operand) => new CombinedFilter(v1,v2),
	"number+number": (v1,v2) => new NumberOp(v1.val+v2.val),
	"number-number": (v1,v2) => new NumberOp(v1.val-v2.val),
	"number^number": (v1,v2) => new NumberOp(Math.pow(v1.val,v2.val)),
	"number/number": (v1,v2) => new NumberOp(v1.val/v2.val),
	"number*number": (v1,v2) => new NumberOp(v1.val*v2.val),
	"filter+number": (filter,num) => {
		if(!(filter instanceof DiscreteFilter)) throw new Error("Cannot add number to non-discrete filter");
		return filter.discrete.getByValue(filter.numval+num.val);
	},

	"filter#":(v) => new NumberOp(v.doQuery(cont)),
	"vectorΣ":(v:OperandVector) => v.ops.reduce((f1,f2) => doOperator(f1,'+',f2)),
	//"filter/filter": (v1,v2) => new NumberOp(v1.val/v2.val)
};
function getOperator(v1:Operand, op:string, v2:Operand):(v1:Operand,v2:Operand)=>Operand {
	var opid = v1.type+op+v2.type;
	if(operators.hasOwnProperty(opid)) return operators[opid];
	if(op===",") {
		return (v1,v2) => {
			var left:Operand[] = v1.type === "vector" ? (<OperandVector>v1).ops : [v1];
			var right:Operand[] = v2.type === "vector" ? (<OperandVector>v2).ops : [v2];
			return new OperandVector(left.concat(right));
		}
	}
	if(v1.type === "vector") {// && v2.type !== "vector") {
		return (v1,v2) => new OperandVector((<OperandVector>v1).ops.map(f => doOperator(f,op,v2)));
	}
	else if(v1.type !== "vector" && v2.type === "vector") {
		return (v1,v2) => new OperandVector((<OperandVector>v2).ops.map(f => doOperator(v1,op,f)));
	}
}

// warning: operators do not guarantee 
function doOperator(v1:Operand, op:string, v2:Operand) {
	var opfn = getOperator(v1,op,v2);
	if(!opfn) throw new Error("Can't apply '"+op+"' to "+v1.type+" and "+v2.type);
	return opfn(v1,v2);
}
