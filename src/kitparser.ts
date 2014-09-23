var TUtil = {
	nth_col : (data:string[][], col:number) => data.map(row => row[col]),
	no_nth_col: (data:string[][], col:number) => data.map(row => row.slice(0,col).concat(row.slice(col+1))),
	/// submatrix from x to x2 (upper exclusive)
	sub: (data:string[][], x:number, y:number, x2:number, y2:number) => data.slice(y,y2).map(row => row.slice(x,x2)),
}

class KITParser {
	static parse(ct:Contingency, statnames:string[], data:string[][][][]) {
		ct.cat_aliases = {
			"geschlecht":"gender"
		};
		ct.val_aliases = {
			gender:{
				aliases:{"männlich":"male"},
				readable_vals:{male:"Männlich",female:"Weiblich"},
				readable:"Geschlecht",
			},
			fachsemester:{
				discrete:new Discrete("fachsemester",12,["1","2","3","4","5","6","7","8","9","10","11","12",">12"]),
				aliases:{},readable:"Fachsemester",
				readable_vals:{}
			},
			abschlussziel:{
				aliases:{"Diplom (U)":"diplom"},
				readable:"Abschlussziel",
				readable_vals:{},
			},
			status:{
				readable:"Status",
				aliases:{"Erstimmatr.":"erst","Neuimmatr.":"neu","Rückmelder":"rueck"},
				readable_vals:{
					beurlaubt:"Beurlaubt",
					"erst":"Erstimmatrikuliert",
					"neu":"Neuimmatrikuliert",
					"rueck":"Rückmelder"
				},
			},
			foreign:{
				readable:" ",
				aliases:{},
				readable_vals:{"no":"Deutsch","yes":"Ausländisch"}
			}
		};
		//Gesamtstatistik (1)
		var s1 = data[0][0];
		s1 = s1.slice(2,11); //ignore studienkolleg for now
		s1 = s1.filter(r => r[0].length > 0);
		var yfilter:Operand[] = TUtil.nth_col(s1,0).map(x => ct.findFilter("Status",x));
		var xfilter:Operand[] = ["","gender:male","gender:female","foreign:no&geschlecht:männlich","foreign:no&gender:female","foreign:no","foreign:yes&gender:male","foreign:yes&gender:female","foreign:yes"].map(x=>queryToOperand(x));
		ct.putAll(xfilter, yfilter, s1, 1, 0);

		// Abschlussziele (2)
		var s2 = data[1][0];
		ct.putAllCat("Fachsemester","Abschlussziel",s2.slice(1));
		// Studienfach (3)
		var s3 = data[2].reduce((p1,p2)=>p1.concat(p2));
		while(s3[s3.length-1][1]!=="Insgesamt") s3.pop();
		s3 = s3.filter(row => row[1].trim().length > 0); //ignore fakultät
		s3 = TUtil.no_nth_col(s3,5);
		var yfilter:Operand[] = s3.slice(1).map(row => ct.findFilter("Fach",row[1]));
		var xfilter:Operand[] = [new NoFilter()].concat(["status:rückmelder","status:erst","status_neuimmatr:1fsem", "status_neuimmatr:hsem"].map(x=>ct.findFilter(x.split(":")[0],x.split(":")[1]))).concat(["foreign:no&gender:male","foreign:no&gender:female","foreign:no", "foreign:yes&gender:male","foreign:yes&gender:female","foreign:yes",
		"status:beurlaubt"]
				.map(x=>queryToOperand(x)));
		ct.putAll(xfilter, yfilter, s3, 4, 1);
		// Studienanfänger (4)
		var s4 = data[3].reduce((p1,p2) => p1.concat(p2));
		while(s4[s4.length-1][1]!=="Insgesamt") s4.pop();
		s4 = s4.filter(row => row[1].trim().length > 0); //ignore fakultät
		var yfilter:Operand[] = s4.slice(1).map(row => new CombinedFilter(ct.findFilter("Fach",row[1]),ct.findFilter("Anfaenger","ja")));
		var xfilter:Operand[] = [new NoFilter(),new IgnoreFilter()].concat(["foreign:no&status:erst","foreign:no&status_neuimmatr:1fsem","foreign:no&status_neuimmatr:hsem","foreign:yes&status:erst","foreign:yes&status_neuimmatr:1fsem","foreign:yes&status_neuimmatr:hsem","gender:male&status:erst","gender:male&status_neuimmatr:1fsem","gender:male&status_neuimmatr:hsem","gender:female&status:erst","gender:female&status_neuimmatr:1fsem","gender:female&status_neuimmatr:hsem"].map(x=>queryToOperand(x)));
		ct.putAll(xfilter, yfilter, s4, 3, 1);

		return ct;
	}


}
