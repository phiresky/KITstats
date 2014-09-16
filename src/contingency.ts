// represents a multidimensional contingency table (todo)
// currently only maps data values/categories
class Contingency {
	constructor() {}
	val_jargon:{[alias:string]:string} = {
		"insgesamt":"",
		"gesamt":""
	};
	cat_jargon:{[alias:string]:string} = {
	}
	dict:{[filters:string]:number} = Object.create(null);
	// map from category to values
	cats:{[category:string]:{[value:string]:boolean}} = Object.create(null);

	private has(query:string) {
		return Object.hasOwnProperty.call(this.dict, query);
	}

	put(filter:Operand, data:number) {
		var query = this.normalize(filter.getQuery(),true);
		if(this.has(query)) {
			if(this.dict[query] !== data)
				console.warn(sprintf("Warn: overwriting %s=%d with %d",
							query, this.dict[query], data)); 
			else console.debug("consistent double entry of "+query);
		}
		this.dict[query] = data;
	}

	putAll(xfilters:Operand[],yfilters:Operand[],data:string[][],xoffset,yoffset) {
		for(var y=0;y<yfilters.length;y++)
			for(var x=0;x<xfilters.length;x++) {
				this.put(doOperator(xfilters[x],"&",yfilters[y]), +data[y+yoffset][x+xoffset]);
			}
	}

	putAllCat(xcategory:string,ycategory:string,data:string[][]) {
		var xfilters:Operand[]=[],yfilters:Operand[]=[];
		for(var y=1;y<data.length;y++) {
			yfilters[y-1] = this.findFilter(ycategory,data[y][0]);
		}
		for(var x=1;x<data[0].length;x++) {
			xfilters[x-1] = this.findFilter(xcategory,data[0][x]);
		}
		this.putAll(xfilters,yfilters,data,1,1);
	}
	
	findFilter(category:string, value:string):Operand {
		if(value === "all") return new OperandVector(this.getAll(category));
		return new SingleFilter(category, value);
		/*var name = fullname.split(":");
		if(name.length !== 2) {
			throw new Error("Unknown Filter "+name);
		}
		var filter = Category.find(name[0]).findValue(name[1]);
		if(filter === undefined) throw new Error("Unknown Filter "+name);
		return filter;*/
	}

	getAll(category:string):Operand[] {
		return Object.keys(this.cats[category]).map(
			val => {
				if(val === "all") throw new Error("!3");
				return this.findFilter(category, val)
			});
	}


	// normalize list and add values to this.cats
	private normalize(filters:string, addvalstocats=false):string {
		if(filters.length == 0) return "";
		var split = filters.toLocaleLowerCase().split(/&+/)
			.filter(x => x.length > 0)
			.map(x => {
				var sp = x.trim().split(":");
				var cat = sp[0].replace(/[^a-z0-9]+/g,"_");
				var val = sp[1].replace(/[^a-z0-9]+/g,"_");
				if(this.val_jargon.hasOwnProperty(sp[1]))
					val = this.val_jargon[sp[1]];
				if(this.cat_jargon.hasOwnProperty(sp[0]))
					cat = this.cat_jargon[sp[0]];
				if(cat.length==0||val.length==0) return "";
				if(addvalstocats) {
					this.cats[cat] = this.cats[cat] || Object.create(null);
					this.cats[cat][val] = true;
				}
				return cat+":"+val;
			})
			.filter(x => x.length > 0);
		return split.sort().join('&');
	}

	get(filter:Operand) {
		var query = this.normalize(filter.getQuery());
		if(!this.has(query)) throw new Error("No data found for "+filter.toString());
		return this.dict[this.normalize(filter.getQuery())];
	}
}
