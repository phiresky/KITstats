/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/sprintf.d.ts" />
/// <reference path="../lib/d3.d.ts" />
/// <reference path="../lib/highcharts.d.ts" />
/// <reference path="eqparser.ts" />
/// <reference path="filters.ts" />
/// <reference path="kitparser.ts" />
/// <reference path="contingency.ts" />

var ga:any;

var config = {
	"filenames":["data/csv/Studierende_2014_1HJ.csv"],
	//"basename":"data/csv/Statistik_SS2014.pdf-%03d.csv",
	"container":"#outp",
	"headlines":[2,2,2,3,2,3,999,2,2,2,2]
};

// parsed url parameter map
var urlParameters:{[param:string]:string} = {};
var LANG = navigator.language||navigator.userLanguage||"de";

function parseParameters() {
	var params = Object.create(null);
	if(location.hash.length == 0) return params;
	location.hash.substr(1).split("&").forEach(param => {
		var split = param.split("=");
		var attr = decodeURIComponent(split[0]);
		if(param.length==1) params[attr]=null;
		else params[attr] = decodeURIComponent(split[1]);
	});
	return params;
}
function setParameters() {
	console.log("setting params");
	location.hash = Object.keys(urlParameters).map(key => 
			encodeURIComponent(key)+"="+encodeURIComponent(urlParameters[key]))
		.join("&");
}

function mostlyequals(a:string[],b:string[]) {
	var ignore = /[^A-Za-z0-9]/g;
	return a.join('').replace(ignore,'')===b.join('').replace(ignore,'');
}

function toTable(arr:string[][],header=false) {
	return arr.map(tr => $("<tr>").append(tr.map(td => $(header?"<th>":"<td>").text(td))));
}

function queryToOperand(eq:string):Operand {
	return makeQuery(EqParser.EqParser.parse(eq));
}

function visualizeOutput(input:Operand, output:any) {
	var outp = $("#eqoutput");
	if($.isArray(output)) {
		var multidim = $.isArray(output[0]);
		if(!multidim) output = [output];
		//console.log(_a=output);
		console.log(input.ops[0]);
		//if(multidim) output = output[0].map((x,i) => output.map(y => y[i]));
		console.log(_a=output);
		var graphInfo = (<OperandVector>input).getGraphInfo(cont);
		if(multidim) {
			graphInfo = input.ops[0].getGraphInfo(cont);
			if(graphInfo.title) graphInfo.title = graphInfo.title.split(":")[0];//TODO
		}
		var chart = outp.highcharts({
			chart: {type: 'column'},
			title: { text: graphInfo.title },
			subtitle: { text: graphInfo.subtitle },
			xAxis: {
				categories: graphInfo.xaxis,
				title: {text: graphInfo.xtitle }
			},
			yAxis: { min:0, title:{text:graphInfo.ytitle}},
			tooltip: {
				formatter: function() { return this.points[0].key },
				shared: true,
				//useHTML:true
			},
			plotOptions: {
				column: { showInLegend: multidim }
			},
			series:output.map((s,i) => ({data:s,name:multidim?input.ops[i].getGraphInfo(cont).title:graphInfo.xtitle}))
		});
	} else if(output instanceof Error) {
		outp.text(output).append($("<pre>").text(output.stack));
	} else 
		outp.text(output);
}

function makeQuery(queue:EqParser.Token[]):Operand {
	var args:Operand[] = [];
	while(queue.length > 0) {
		if(queue[0].is(EqParser.TokenType.OPERATOR)) {
			var arg2 = args.pop();
			var op = queue.shift().val;
			if(EqParser.Operator.operators[op].unary) //unary operator
				args.push(doOperator(arg2, op, new Operand("")));
			else {
				if(args.length==0) throw new Error("Invalid argument count: "+args.length);
				var arg1 = args.pop();
				args.push(doOperator(arg1, op, arg2));
			}
		} else args.push(Operand.make(cont, queue.shift()));
	}
	if(args.length > 1) throw new Error("Invalid arguments remaining at end");
	if(args.length == 0) args = [new NoFilter()];
	return args.pop();
}

var data:string[][][] = [];
var cont:Contingency;

$(()=> {
	urlParameters = parseParameters();
	$("#equation").keyup(evt => evt.keyCode == 13 && $("#parseeq").click());
	var status = $("#status");
	function log(x:string) { status.text(x);}
	$("#onclickquery a").click((e:any) => {
		$("#equation").val(e.target.textContent);
		$("#parseeq").click();
		return false;
	});
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
		var drawtable = function(inx:number) {
			if(isNaN(+inx)) $("<table>").replaceAll($('> table',config.container));
			else $("<table class=table>")
				/*.append(
					toTable(headlines[inx]||[],true)
				)*/.append(
					toTable(statistics[inx].reduce((a,b) => a.concat(b), []))
				).replaceAll($('> table',config.container));
		};
		$("<select>").append("<option>Tabelle anzeigen</option>").append(
			statnames.map((name,inx)=>$("<option>").val(""+inx).text((inx+1)+": "+name))
		).change(function(evt){drawtable(this.value)})
			.replaceAll($('> select', config.container));
		cont = new Contingency();
		KITParser.parse(cont, statnames, statistics);
		if("q" in urlParameters) {
			$("#equation").val(urlParameters["q"]);
			$("#parseeq").click();
		}
	};
	var getpageddata = function(pattern:string, inx:number) {
		var fname = sprintf(pattern,inx);
		log("Loading page "+inx);
		$.get(fname, response => {
			data.push(d3.csv.parseRows(response, d => 
				d.some(x=>x.length>0)?d:false) // remove empty lines
			);
			getpageddata(fname, pattern, inx+1);
		}).fail(error => {
			if(error.status === 404) {
				parsedata(data);
			} else {
				throw new Error("error getting files: "+error);
			}
		
		});
	};
	var getsingledata = (fname:string) => {
		log("Loading");
		$.get(fname, response => 
			parsedata(response.split("\n§PAGEBREAK\n").map(
				(page:string) => d3.csv.parseRows(page, (d:any) => 
					// remove empty lines
					d.some((x:string) => x.trim().length>0)?d:false
				)
			).filter((page:string[][]) => page.length > 0))
		).fail(error => {
			throw new Error("error getting file "+fname);
		});
	}

	//getdata(config.basename,1);
	getsingledata(config.filenames[0]);

	$("#parseeq").click(event => {
		var eq = $("#equation").val();	
		ga('send','event','equation','do',eq);
		var query:Operand;
		try {
			var queue = EqParser.EqParser.parse(eq);
			log("Parsed RPN: "+queue.map(x=>x.val).join(" "));
			query = makeQuery(queue);
			urlParameters["q"] = eq;
			setParameters();
		} catch(e) {
			visualizeOutput(null, e); throw e; return;
			ga('send','event','equation','parseerror',eq);
		}
		try {
			visualizeOutput(query, query.doQuery(cont));
		} catch(e) {
			visualizeOutput(null, e);
			ga('send','event','equation','execerror',eq);
			throw e;
		}
	});
});
