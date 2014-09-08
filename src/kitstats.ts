/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/sprintf.d.ts" />
/// <reference path="../lib/d3.d.ts" />

var config = {
	"basename":"data/csv/Statistik_SS2014.pdf-%03d.csv",
	"container":"#outp"
};

$(()=> {
	var status = $("#status");
	function log(x) { status.text(x);}
	var data:string[][][] = [];
	var parsedata = function(data:string[][][]) {
		console.log("parsing");
		console.log(data);
		var statistics:string[][][][] = [];
		var statnames:string[] = []; 
		data.forEach((page:string[][]) => {
			var header = page[0][0];
			var match = header.match(/Statistik (\d+) - \((.*)\)/)
			if(match === null) return; // ignore pages without statistic header
			var statid = +match[1];
			statnames[statid] = match[2];
			page.shift(); //remove header
			if(statistics[statid]===undefined) statistics[statid] = [];
			statistics[statid].push(page);
		});
		log("Loaded "+statistics.length+" Statistics");
		var drawtable = function(inx) {
			$("<table class=table>").append(
				statistics[inx].reduce((a,b) => a.concat(b), [])
					.map(tr => $("<tr>").append(tr.map(td => $("<td>").text(td))))
			).replaceAll($('> table',config.container));
		};
		$("<select>").append(
			statnames.map((name,inx)=>$("<option>").val(""+inx).text(inx+": "+name))
		).change(function(evt){drawtable(this.value)})
			.replaceAll($('> select', config.container));
		drawtable(1);

	};
	var getdata = function(pattern:string, inx:number) {
		var fname = sprintf(pattern,inx);
		log("Loading page "+inx);
		$.get(fname, response => {
			data.push(d3.csv.parseRows(response, d => {
				// remove empty lines
				return d.some(x=>x.length>0)?d:false;
			}));
			getdata(pattern, inx+1);
		}).fail(error => {
			if(error.status === 404) {
				parsedata(data);
			} else {
				throw new Error("error getting files: "+error);
			}
		
		});
	};

	getdata(config.basename,1);

});
