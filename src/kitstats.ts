/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/sprintf.d.ts" />
/// <reference path="../lib/d3.d.ts" />
/// <reference path="eqparser.ts" />
/// <reference path="filters.ts" />
/// <reference path="kitparser.ts" />
/// <reference path="contingency.ts" />

var config = {
	"filenames":["data/csv/Studierende_2014_1HJ.csv"],
	//"basename":"data/csv/Statistik_SS2014.pdf-%03d.csv",
	"container":"#outp",
	"headlines":[2,2,2,3,2,3,999,2,2,2,2]
};

function mostlyequals(a,b) {
	var ignore = /[^A-Za-z0-9]/g;
	return a.join('').replace(ignore,'')===b.join('').replace(ignore,'');
	//return a.every((cell,inx)=>cell===b[inx]);
}

function toTable(arr,header=false) {
	return arr.map(tr => $("<tr>").append(tr.map(td => $(header?"<th>":"<td>").text(td))));
}

function queryToOperand(eq:string):Operand {
	return makeQuery(EqParser.EqParser.parse(eq));
}

function makeQuery(queue:EqParser.Token[]):Operand {
	var args:Operand[] = [];
	while(queue.length > 0) {
		if(queue[0].is(EqParser.TokenType.OPERATOR)) {
			var c = args.length;
			if(c<2) throw new Error("Invalid argument count: "+c);
			var arg2 = args.pop(), arg1 = args.pop();
			var op = queue.shift().val;
			args.push(doOperator(arg1, op, arg2));
		} else args.push(Operand.make(cont, queue.shift()));
	}
	if(args.length > 1) throw new Error("Invalid arguments remaining at end");
	if(args.length == 0) args = [new NoFilter()];
	return args.pop();
}

var data:string[][][] = [];
var cont:Contingency;

$(()=> {

	var status = $("#status");
	function log(x) { status.text(x);}
	var parsedata = function(data:string[][][]) {
		console.log("parsing");
		var statistics:string[][][][] = [];
		var statnames:string[] = []; 
		data.forEach((page:string[][]) => {
			var header = page[0][0];
			var match = header.match(/Statistik (\d+) - \((.*)\)/)
			if(match === null) return; // ignore pages without statistic header
			var statid = +match[1]-1;
			statnames[statid] = match[2];
			page.shift(); //remove header
			if(statistics[statid]===undefined) {
				statistics[statid] = [page];
			} else
				statistics[statid].push(page.slice(config.headlines[statid]));
		});
		log("Loaded "+statistics.length+" Statistics");
		var drawtable = function(inx) {
			$("<table class=table>")
				/*.append(
					toTable(headlines[inx]||[],true)
				)*/.append(
					toTable(statistics[inx].reduce((a,b) => a.concat(b), []))
				).replaceAll($('> table',config.container));
		};
		$("<select>").append(
			statnames.map((name,inx)=>$("<option>").val(""+inx).text(inx+": "+name))
		).change(function(evt){drawtable(this.value)})
			.replaceAll($('> select', config.container));
		drawtable(0);
		cont = new Contingency();
		KITParser.parse(cont, statnames, statistics);
	};
	var getpageddata = function(pattern:string, inx:number) {
		var fname = sprintf(pattern,inx);
		log("Loading page "+inx);
		$.get(fname, response => {
			data.push(d3.csv.parseRows(response, d => {
				// remove empty lines
				return d.some(x=>x.length>0)?d:false;
			}));
			getpageddata(fname, pattern, inx+1);
		}).fail(error => {
			if(error.status === 404) {
				parsedata(data);
			} else {
				throw new Error("error getting files: "+error);
			}
		
		});
	};
	var getsingledata = function(fname:string) {
		log("Loading");
		$.get(fname, response => 
			parsedata(response.split("\n§PAGEBREAK\n").map(
				page => d3.csv.parseRows(page, d => 
					// remove empty lines
					d.some(x=>x.trim().length>0)?d:false
				)
			).filter(page => page.length > 0))
		).fail(error => {
			throw new Error("error getting file "+fname);
		});
	}

	//getdata(config.basename,1);
	getsingledata(config.filenames[0]);

	$("#parseeq").click(event => {
		var eq = $("#equation").val();	
		var query;
		try {
			var queue = EqParser.EqParser.parse(eq);
			log("Parsed RPN: "+queue.map(x=>x.val).join(" "));
			query = makeQuery(queue);
		} catch(e) { $("#eqoutput").text("Equation error: "+e); return; }
		try {
			$("#eqoutput").text("="+query.doQuery(cont));
		} catch(e) { $("#eqoutput").text("Query error: "+e);}
	});
});
