var TUtil = {
	nth_col : (data, col) => data.map(row => row[col]),
	/// submatrix from x to x2 (upper exclusive)
	sub: (data, x, y, x2, y2) => data.slice(y,y2).map(row => row.slice(x,x2)),
}

class KITParser {
	static parse(statnames:string[], data:string[][][][]) {
		var ct = new Contingency();
		//Gesamtstatistik (1)
		var s1 = data[0][0];
		s1 = s1.slice(2,11); //ignore studienkolleg for now
		s1 = s1.filter(r => r[0].length > 0);
		var yfilter = TUtil.nth_col(s1,0).map(x => "Status:"+x);
		var xfilter = ["","gender:male","gender:female","foreign:no&gender:male","foreign:no&gender:female","foreign:no","foreign:yes&gender:male","foreign:yes&gender:female","foreign:yes"];
		ct.putAll(xfilter, yfilter, s1, 1, 0);

		// Abschlussziele
		var s2 = data[1][0];
		ct.putAllCat("Fachsemester","Abschlussziel",s2.slice(1));
		return ct;
	}


}
