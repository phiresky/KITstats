var TUtil = {
	nth_col : (data, col) => data.map(row => row[col]),
	no_nth_col: (data, col) => data.map(row => row.slice(0,col).concat(row.slice(col+1))),
	/// submatrix from x to x2 (upper exclusive)
	sub: (data, x, y, x2, y2) => data.slice(y,y2).map(row => row.slice(x,x2)),
}

class KITParser {
	static parse(ct:Contingency, statnames:string[], data:string[][][][]) {
		//Gesamtstatistik (1)
		var s1 = data[0][0];
		s1 = s1.slice(2,11); //ignore studienkolleg for now
		s1 = s1.filter(r => r[0].length > 0);
		var yfilter = TUtil.nth_col(s1,0).map(x => new SingleFilter("Status",x));
		var xfilter:Operand[] = ["","gender:male","gender:female","foreign:no&gender:male","foreign:no&gender:female","foreign:no","foreign:yes&gender:male","foreign:yes&gender:female","foreign:yes"].map(x=>makeQuery(x));
		ct.putAll(xfilter, yfilter, s1, 1, 0);

		// Abschlussziele
		var s2 = data[1][0];
		ct.putAllCat("Fachsemester","Abschlussziel",s2.slice(1));
		// Studienfach
		var s3 = data[2].reduce((p1,p2)=>p1.concat(p2));
		while(s3[s3.length-1][1]!=="Insgesamt") s3.pop();
		s3 = s3.filter(row => row[1].trim().length > 0); //ignore fakultät
		s3 = TUtil.no_nth_col(s3,5);
		console.log(s3);
		_a = s3;
		var yfilter:any = s3.slice(1).map(row => new SingleFilter("Fach",row[1]).getQuery());
		var xfilter:Operand[] = [new NoFilter()].concat(["status:rückmelder","status:erstimmatr.","status:neuimmatr-1fsem", "neuimmatr-hsem"].map(x=>new SingleFilter(x.split(":")[0],x.split(":")[1]))).concat(["foreign:no&gender:male","foreign:no&gender:female","foreign:no", "foreign:yes&gender:male","foreign:yes&gender:female","foreign:yes",
		"status:beurlaubt"]
				.map(x=>makeQuery(x)));
			console.log(xfilter);
		return ct;
	}


}
