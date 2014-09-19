// represents a multidimensional contingency table 
// currently only maps data values/categories
class Contingency {
	constructor() {}
	global_val_jargon:{[alias:string]:string} = {
		"Insgesamt":"",
		"Gesamt":""
	};
	cat_aliases:{[alias:string]:string} = Object.create(null);
	val_aliases:{[cat:string]:{
		readable:string;
		readable_vals:{[value:string]:string};
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
	
	findFilter(readable_category:string, readable_value:string):Operand {
		var norm_category = readable_category.toLocaleLowerCase();
		if(readable_category in this.cat_aliases) {
			norm_category = this.cat_aliases[readable_category];
			if(norm_category.replace(/[^a-z0-9]+/g,"_")!==norm_category) {
				throw new Error("Category "+norm_category+" is not normalized");
			}
		}
		norm_category = norm_category.replace(/[^a-z0-9]+/g,"_");
		var norm_value = readable_value.toLocaleLowerCase();
		if(readable_value in this.global_val_jargon) norm_value = this.global_val_jargon[readable_value];
		if(norm_value === "all") return new OperandVector(this.getAll(norm_category));
		norm_value = norm_value.replace(/[^a-z0-9]+/g,"_");
		if(norm_value.length==0||norm_category.length==0) return new NoFilter();
		if(norm_category in this.val_aliases) {
			var catinfo = this.val_aliases[norm_category];
			if(readable_value in catinfo.aliases) {
				norm_value = catinfo.aliases[readable_value];
				if(norm_value.replace(/[^a-z0-9]+/g,"_")!==norm_value)
					throw new Error("Value "+norm_value+" is not normalized");
			}
			if(catinfo.discrete) {
				return catinfo.discrete.getByName(readable_value);
			}
		}

		if(!(norm_category in this.val_aliases)) {
			this.val_aliases[norm_category] = {
				readable:readable_category,
				readable_vals:{},
				aliases:{}
			}
		}
		var tmp = this.val_aliases[norm_category].readable_vals;
		tmp[norm_value] = tmp[norm_value] || readable_value;
		return new SingleFilter(norm_category, norm_value);
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

	stringify(filter:SingleFilter):{cat:string;val:string;} {
		var cat = filter.category;
		var val = filter.value;
		if(cat in this.val_aliases) {
			var info = this.val_aliases[filter.category];
			cat = info.readable || cat;
			val = info.readable_vals[val]||val;
		}
		return {cat:cat,val:val};
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
