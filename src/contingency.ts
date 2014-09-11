class Contingency {
	constructor() {}
	jargon:{[alias:string]:string} = {
		"insgesamt":"",
	}
	dict:{[filters:string]:number} = {};
	put(filters:string, data:number) {
		this.dict[this.normalize(filters)] = data;
	}

	putAll(xfilters:string[],yfilters:string[],data:string[][],xoffset,yoffset) {
		for(var y=0;y<yfilters.length;y++)
			for(var x=0;x<xfilters.length;x++) {
				this.put(xfilters[x]+"&"+yfilters[y], +data[y+yoffset][x+xoffset]);
			}
	}

	putAllCat(xcategory:string,ycategory:string,data:string[][]) {
		var xfilters=[],yfilters=[];
		for(var y=1;y<data.length;y++) {
			yfilters[y-1] = ycategory+":"+data[y][0];
		}
		for(var x=1;x<data.length;x++) {
			xfilters[x-1] = xcategory+":"+data[0][x];
		}
		this.putAll(xfilters,yfilters,data,1,1);
	}


	private normalize(filters:string):string {
		if(filters.length == 0) return "";
		var split = filters.toLocaleLowerCase().split(/&+/)
			.map(x => this.jargon[x]||x);
		if(split[0].length==0) split.shift();
		if(split[split.length-1].length==0) split.pop();
		return split.sort().join('&');
	}

	get(filters:string) {
		return this.dict[this.normalize(filters)];
	}
}
