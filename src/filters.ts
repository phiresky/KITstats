class Operand {
	constructor(public type:string) {}
	static make(token:EqParser.Token):Operand {
		if(token.is(EqParser.TokenType.IDENTIFIER)) return findFilter(token.val);
		if(token.is(EqParser.TokenType.NUMBER)) return new NumberOp(+token.val); 
	}
	public operator = {};
}

class NumberOp extends Operand {
	constructor(public val:number) {
		super("number");
	}
}

class Filter extends Operand {
	constructor(public name:string) {
		super("filter");
		this.operator['&filter'] = b => new CombinedFilter(this, b);
	}
}

/// A category is a set of filters creating the whole group eg (male ∪ female)
class Category {
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
}

class DiscreteFilter extends Filter {
	constructor(public index:number) {
		super(index+"");
		console.log("created "+index);
		this.operator['+number'] = num => new DiscreteFilter(this.index+num.val);
	}
}

class CombinedFilter extends Filter {
	public filters;
	constructor(...filters) {
		super("");
		this.filters = filters;
		this.name = filters.map(f=>f.name).join("&");
	}
}

class DiscreteCategory extends Category {
	private min:number;
	private max:number;
	constructor(public name:string, prefix, min, max) {
		super(name, []);
	}
	findValue(name:string) {
		return new DiscreteFilter(+name);
	}
}


function findFilter(fullname:string):Filter {
	return new Filter(fullname);
	/*var name = fullname.split(":");
	if(name.length !== 2) {
		throw new Error("Unknown Filter "+name);
	}
	var filter = Category.find(name[0]).findValue(name[1]);
	if(filter === undefined) throw new Error("Unknown Filter "+name);
	return filter;*/
}

