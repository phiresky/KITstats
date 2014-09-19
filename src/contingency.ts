// represents a multidimensional contingency table 
// currently only maps data values/categories
class Contingency {
	constructor() {}
	global_val_jargon:{[alias:string]:string} = {
		"insgesamt":"",
		"gesamt":""
	};
	cat_aliases:{[alias:string]:string} = Object.create(null);
	val_aliases:{[cat:string]:{
		readable:{[value:string]:string};
		aliases:{[str:string]:string};
		discrete?:Discrete;
	}} = Object.create(null);
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
			//else console.debug("consistent double entry of "+query+data+"+" +this.dict[query]);
		}
		this.dict[query] = data;
	}

	putAll(xfilters:Operand[],yfilters:Operand[],data:string[][],
			xoffset:number,yoffset:number) {
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
		console.log("finding "+category+":" +value);
		category = category.toLocaleLowerCase();
		if(value === "all") return new OperandVector(this.getAll(category));
		value = value.toLocaleLowerCase();
		if(value in this.global_val_jargon) value = this.global_val_jargon[value];
		if(category in this.cat_aliases) category = this.cat_aliases[category];
		if(value.length==0||category.length==0) return new NoFilter();
		if(category in this.val_aliases) {
			var catinfo = this.val_aliases[category];
			if(catinfo.aliases.hasOwnProperty(value)) {
				value = catinfo.aliases[value];
			}
			if(catinfo.discrete) {
				return catinfo.discrete.getByName(value);
			}
		}
		category = category.replace(/[^a-z0-9]+/g,"_");
		value = value.replace(/[^a-z0-9]+/g,"_");
		return new SingleFilter(category, value);
	}

	getAll(category:string):Operand[] {
		if(this.val_aliases[category]&&this.val_aliases[category].discrete) {
			return this.val_aliases[category].discrete.getAll();
		} else return Object.keys(this.cats[category]).map(
			val => {
				if(val === "all") throw new Error("!pvouf3");
				return this.findFilter(category, val)
			});
	}


	// normalize list and add values to this.cats
	private normalize(filters:string, addvalstocats=false):string {
		if(filters.length == 0) return "";
		var split = filters.split(/&+/)
			.filter(x => x.length > 0)
			.map(x => {
				var sp = x.trim().split(":");
				var cat = sp[0];
				var val = sp[1];
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
		if(!this.has(query)) throw new Error("INSUFFICIENT DATA FOR MEANINGFUL ANSWER "+filter.toString());
		return this.dict[this.normalize(filter.getQuery())];
	}
}
